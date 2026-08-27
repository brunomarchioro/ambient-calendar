# Research: Modelo de sync Google Calendar (MVP)

**Question:** Quais fatos da Google Calendar API o MVP precisa fixar para autenticação com refresh token, horizonte `lookaheadDays`, expansão de recorrentes, all-day/timezones e sync periódico espelho no D1?

**Primary sources:** Google Calendar API v3 + Google Identity OAuth 2.0 (docs oficiais).

**Context already decided:** uma conta via `GOOGLE_REFRESH_TOKEN`; espelho D1 com upsert por `externalId` e delete fora do horizonte; recorrentes expandidos; all-day no MVP; backend fala com Google (ESP32 não).

---

## Verdict for the MVP contract

Use **full horizon re-list on each cron**, not incremental `syncToken`.

Call `events.list` on `primary` with `singleEvents=true`, `timeMin`/`timeMax` covering `[now, now+lookaheadDays)`, upsert each item by Google `id` → `externalId`, then delete D1 rows with `source=google` that are missing from the result set or whose start falls outside the horizon. Refresh the access token from secrets before each job.

Incremental sync (`syncToken`) cannot be combined with `timeMin`/`timeMax`, so it fights a bounded mirror. A periodic full list over a small horizon (e.g. 7 days) is the documented-compatible shape for this product.

---

## 1. Authentication (refresh token → access token)

### Facts

1. Calendar API requests need an OAuth 2.0 **access token** in the `Authorization: Bearer` header. Access tokens are short-lived; offline jobs need a **refresh token**. ([OAuth 2.0 overview](https://developers.google.com/identity/protocols/oauth2))

2. Offline access requires `access_type=offline` when the authorization code is obtained. The refresh token is returned when exchanging the code at `https://oauth2.googleapis.com/token`. ([Web server OAuth — offline access](https://developers.google.com/identity/protocols/oauth2/web-server#offline))

3. To refresh at cron time, `POST https://oauth2.googleapis.com/token` with body:
   - `client_id`
   - `client_secret`
   - `refresh_token`
   - `grant_type=refresh_token`  
   Response includes `access_token` and `expires_in` (seconds). ([Same page — HTTP/REST refresh](https://developers.google.com/identity/protocols/oauth2/web-server#offline))

4. Refresh tokens can stop working: user revoke, unused for six months, Testing publishing status (often **7-day** refresh token expiry for external apps), max live refresh tokens per client, admin policy. Code must treat `invalid_grant` as “secret needs human re-consent,” not a transient retry. ([Refresh token expiration](https://developers.google.com/identity/protocols/oauth2#refresh-token-expiration))

5. For read-only mirror, request the narrowest Calendar scope that covers `events.list`. Official `events.list` accepts among others:
   - `https://www.googleapis.com/auth/calendar.readonly`
   - `https://www.googleapis.com/auth/calendar.events.readonly`  
   Prefer **events.readonly** if the app never needs calendar metadata beyond events. ([events.list Authorization](https://developers.google.com/calendar/api/v3/reference/events/list))

### Spec recommendations

| Secret | Role |
| --- | --- |
| `GOOGLE_CLIENT_ID` | OAuth client |
| `GOOGLE_CLIENT_SECRET` | OAuth client secret |
| `GOOGLE_REFRESH_TOKEN` | Long-lived offline credential for the single account |

- Cron: refresh → list → (optional) discard access token; do not persist access tokens as the source of truth.
- Spec should name the **invalid_grant / expired refresh** failure mode as ops-visible (log + alert), not auto-recoverable in-app (OAuth interactive is out of MVP scope).

---

## 2. Fetching the lookahead window (`events.list`)

### Endpoint

```http
GET https://www.googleapis.com/calendar/v3/calendars/{calendarId}/events
```

Use `calendarId=primary` for the signed-in account’s primary calendar. ([events.list](https://developers.google.com/calendar/api/v3/reference/events/list))

### Query parameters the MVP must fix

| Param | Value | Why |
| --- | --- | --- |
| `singleEvents` | `true` | Expand recurring masters into instances; omit underlying series. Default is `false`. |
| `timeMin` | RFC3339 with mandatory offset (e.g. `2026-08-27T14:00:00-03:00` or `...Z`) | Lower bound (**exclusive**) on the event’s **end** time — events still in progress are included. |
| `timeMax` | RFC3339 with offset | Upper bound (**exclusive**) on the event’s **start** time. Must be > `timeMin`. |
| `timeZone` | App `Settings.timezone` (IANA, e.g. `America/Sao_Paulo`) | Response times converted to this zone; also used when matching all-day events to the window. If omitted, calendar default TZ is used. |
| `orderBy` | `startTime` | Only valid with `singleEvents=true`. Stable ascending start order for mapping. |
| `maxResults` | ≤ 2500 (default 250) | Paginate until `nextPageToken` is absent. |
| `showDeleted` | omit / `false` | Cancelled events stay out of a full list; absence drives D1 deletes. |
| `eventTypes` | optional: repeat `default` (and maybe `birthday` if desired) | Without it, list returns focusTime, outOfOffice, workingLocation, fromGmail, etc. Spec should state whether those appear on the ambient display. |

Citations: [events.list parameters](https://developers.google.com/calendar/api/v3/reference/events/list); [Calendars and events — time zones](https://developers.google.com/calendar/api/concepts/events-calendars).

### Horizon formula

Given `lookaheadDays = N` and sync instant `T`:

- `timeMin = T` (RFC3339)
- `timeMax = T + N days` (exclusive upper bound on **start**)

An all-day event on the last calendar day of the horizon is included only if its start date falls before `timeMax` when interpreted in the calendar/`timeZone` rules above.

### Pagination

Follow `nextPageToken` until gone. `nextSyncToken` appears only on the last page; **ignore it for MVP** if not doing incremental sync. ([events.list response](https://developers.google.com/calendar/api/v3/reference/events/list); [Synchronize resources](https://developers.google.com/calendar/api/guides/sync))

### Partial response (optional)

`fields=items(id,status,summary,start,end),nextPageToken` reduces payload. ([Improve performance](https://developers.google.com/calendar/api/guides/performance))

---

## 3. Recurring → instances

### Facts

1. With `singleEvents=false` (default), `events.list` returns single events, **recurring masters**, and exceptions — not ordinary expanded instances. ([Recurring events](https://developers.google.com/calendar/api/guides/recurringevents))

2. With `singleEvents=true`, the API expands occurrences; masters are omitted. Each instance is a normal event-like object. ([Same](https://developers.google.com/calendar/api/guides/recurringevents))

3. Instance-specific fields:
   - `recurringEventId` — parent series `id`
   - `originalStartTime` — occurrence key in the series (stable even if the instance was moved)  
   ([Events resource](https://developers.google.com/calendar/api/v3/reference/events); [Recurring events](https://developers.google.com/calendar/api/guides/recurringevents))

4. **`id` vs `iCalUID`:** every occurrence of a series has a **different `id`** but the **same `iCalUID`**. For per-instance upsert into D1, `externalId` must be Google **`id`**, not `iCalUID`. ([Events resource — id / iCalUID](https://developers.google.com/calendar/api/v3/reference/events))

5. Cancelled exceptions: when `showDeleted` is false on a non-incremental list, they are not returned — correct for “don’t show deleted instances.” ([Events.status](https://developers.google.com/calendar/api/v3/reference/events))

### Spec recommendations

- Always `singleEvents=true` for the mirror job.
- Do not store RRULE locally in MVP.
- `externalId = items[].id` (instance id).
- Optionally store `recurringEventId` later for debugging; not required for the ambient schedule API.

---

## 4. All-day events and time zones

### Facts

1. Timed events use `start.dateTime` / `end.dateTime`. All-day events use `start.date` / `end.date` (`yyyy-mm-dd`). ([Calendars and events](https://developers.google.com/calendar/api/concepts/events-calendars))

2. **`end` is exclusive** for all event types. For a one-day all-day event, `end.date` is the next day. ([Events resource — end](https://developers.google.com/calendar/api/v3/reference/events))

3. For all-day events, **the timezone field has no significance** on the event itself. Matching all-day events against `timeMin`/`timeMax` uses the **calendar time zone** (or the request `timeZone` parameter’s effect on list/instances). ([Calendars and events — all-day / calendar TZ](https://developers.google.com/calendar/api/concepts/events-calendars))

4. Timed `dateTime` values require an offset **or** an explicit `timeZone` (IANA). Recurring expansion always needs a single zone on the master. ([Same — event / recurring TZ](https://developers.google.com/calendar/api/concepts/events-calendars))

5. Pass app `Settings.timezone` as `timeZone` on `events.list` so expanded times and all-day window matching align with the display locale.

### Mapping into D1 `Event`

| Google | D1 |
| --- | --- |
| `summary` | `title` |
| presence of `start.date` (vs `dateTime`) | `allDay=true` |
| `start.date` / `start.dateTime` | `startAt` (normalize; for all-day prefer date-only or midnight-in-app-TZ — **spec must pick one**) |
| `end.date` / `end.dateTime` | `endAt` (keep Google’s exclusive end, or convert to inclusive for UI — **spec must pick one and document**) |
| request / settings TZ | `timezone` |
| `id` | `externalId` |
| — | `source=google` |

Recommended concrete choice for MVP:

- Timed: store UTC instants (or offset-preserving ISO) derived from `dateTime`.
- All-day: store `startAt` = start date at `00:00` in `Settings.timezone`, `endAt` = exclusive end date at `00:00` same TZ (mirrors Google exclusivity), `allDay=true`.

---

## 5. Periodic cron mirror (upsert + delete)

### Why not `syncToken` for this MVP

From official sync guide + `events.list`:

- Incremental sync uses `syncToken` from a prior full sync; results are **only changes** since then, and **always include deleted** entries. ([Synchronize resources efficiently](https://developers.google.com/calendar/api/guides/sync))
- `syncToken` **cannot** be combined with `timeMin`, `timeMax`, `orderBy`, `q`, etc. ([events.list — syncToken](https://developers.google.com/calendar/api/v3/reference/events/list))
- Expired sync token → **HTTP 410**; client must wipe and full-sync again. ([Sync guide](https://developers.google.com/calendar/api/guides/sync))

A product that only mirrors **events inside `lookaheadDays`** needs `timeMin`/`timeMax` every run. That is incompatible with keeping a durable incremental token for the same filtered view. Therefore:

**MVP sync algorithm (recommended):**

1. Refresh access token.
2. `events.list` with params in §2; paginate fully.
3. For each item with `status != cancelled` (defensive): upsert D1 by `externalId = id`.
4. Delete every D1 event where `source=google` and (`externalId` not in this sync’s id set **OR** start outside the current horizon).
5. Manual/`source=manual` rows untouched.

This matches “mirror + delete outside horizon” without fighting the API.

### Status / deleted semantics (pitfalls)

- On a normal full list (`showDeleted=false`), cancelled/deleted events are omitted — deletion is by **absence**, not by seeing `status=cancelled`. ([Events.status](https://developers.google.com/calendar/api/v3/reference/events))
- Incremental/`showDeleted` paths guarantee only `id` (and for cancelled exceptions also `recurringEventId` / `originalStartTime`). Irrelevant if MVP stays on full horizon list.

### Quota / cron hygiene

- Defaults: **10 000** requests/min/project, **600**/min/user/project. One-account cron is fine. ([Usage limits](https://developers.google.com/calendar/api/guides/quota))
- Avoid synchronized midnight full syncs; stagger cron (± jitter). Same guide warns against “everyone syncs at midnight.”
- On 403/429 usageLimits: truncated exponential backoff. ([Same](https://developers.google.com/calendar/api/guides/quota))

Push notifications (`events.watch`) are the efficient alternative to polling; optional later, not required for single-user MVP cron.

---

## 6. Concrete sync contract (cite-ready)

```text
Auth:
  POST https://oauth2.googleapis.com/token
  grant_type=refresh_token
  + GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET / GOOGLE_REFRESH_TOKEN
  Scope at consent time: calendar.events.readonly (or calendar.readonly)

List:
  GET /calendar/v3/calendars/primary/events
  Authorization: Bearer <access_token>
  singleEvents=true
  orderBy=startTime
  timeMin=<now RFC3339>
  timeMax=<now + lookaheadDays RFC3339>
  timeZone=<Settings.timezone>
  showDeleted=false
  [optional] eventTypes=default
  [optional] fields=items(id,status,summary,start,end),nextPageToken
  Paginate: pageToken until exhausted

Map:
  externalId ← id
  title ← summary
  allDay ← start.date present
  startAt/endAt ← start/end (end exclusive)
  source ← google
  Skip status=cancelled if present

Persist:
  Upsert by externalId
  Delete source=google not in fetched set or outside horizon
  Do not use syncToken while filtering by timeMin/timeMax
```

---

## 7. Pitfalls checklist for the spec

1. **`timeMin` filters on end, `timeMax` on start** — easy to get wrong when coding the window.
2. **All-day `end.date` is exclusive** — a one-day event ends on the next calendar date.
3. **`externalId` = instance `id`**, never `iCalUID`, when `singleEvents=true`.
4. **`syncToken` + horizon filters = undefined / disallowed** — don’t mix.
5. **Testing OAuth apps: refresh tokens may die in ~7 days** — document ops re-issue of `GOOGLE_REFRESH_TOKEN`.
6. **Unfiltered `eventTypes` pulls OOO / focus / working location** — decide explicitly.
7. **Private events on shared calendars** may hide details for `reader` role — less relevant for own `primary` with owner token, but note if secondary calendars are ever added.
8. **Don’t rely on cancelled tombstones** in full-list mode — delete by absence + horizon.

---

## Sources

| Claim area | URL |
| --- | --- |
| `events.list` params/response | https://developers.google.com/calendar/api/v3/reference/events/list |
| Events resource (id, iCalUID, start/end, status) | https://developers.google.com/calendar/api/v3/reference/events |
| Calendars, all-day, time zones, recurrence concepts | https://developers.google.com/calendar/api/concepts/events-calendars |
| Recurring / `singleEvents` / instances | https://developers.google.com/calendar/api/guides/recurringevents |
| Incremental sync / 410 | https://developers.google.com/calendar/api/guides/sync |
| Quotas / cron jitter | https://developers.google.com/calendar/api/guides/quota |
| Partial responses | https://developers.google.com/calendar/api/guides/performance |
| OAuth overview / refresh expiry | https://developers.google.com/identity/protocols/oauth2 |
| Offline refresh HTTP | https://developers.google.com/identity/protocols/oauth2/web-server#offline |
