# TanStack Start HTTP-only + Cloudflare Workers + D1 + Cron

Research for wayfinder ticket `03-tanstack-start-workers-d1`.  
Question: which official constraints should the Ambient Calendar MVP spec respect for an HTTP-only TanStack Start app (no Server Components / Server Functions), with API routes, Cron Triggers, and D1 on Cloudflare Workers.

**Date:** 2026-08-27  
**Sources:** TanStack Start docs; Cloudflare Workers / D1 / Wrangler / Cron docs (primary only).

---

## Verdict (one line)

Viable shape today: one Worker with `@cloudflare/vite-plugin` + custom entry (`fetch` → Start, `scheduled` → Google sync), D1 via Wrangler binding + `env`/`cloudflare:workers`, HTTP surface via Start **server routes** (not `createServerFn`), SPA/selective SSR for the web UI — on **Workers Paid** for realistic Cron/Google CPU; do not promise Free-tier Cron, Node APIs, concurrent D1 writers, or Cron wall time beyond 15 minutes.

---

## 1. Viable project shape (today)

### Official Cloudflare + TanStack Start wiring

Cloudflare documents TanStack Start as a first-class Workers framework guide. The supported setup is:

| Piece | Official requirement |
| --- | --- |
| Build | Vite + `@cloudflare/vite-plugin` with `viteEnvironment: { name: 'ssr' }` **before** `tanstackStart()` |
| Deploy tooling | `wrangler` (`dev` / `preview` / `deploy` / `types`) |
| Compat | `compatibility_flags: ["nodejs_compat"]` |
| Default entry | `main: "@tanstack/react-start/server-entry"` |
| Scaffold | `npm create cloudflare@latest -- … --framework=tanstack-start` |

Citations:

- [TanStack Start · Cloudflare Workers docs](https://developers.cloudflare.com/workers/framework-guides/web-apps/tanstack-start/)
- [Hosting · TanStack Start](https://tanstack.com/start/latest/docs/framework/react/guide/hosting) (Cloudflare Workers section; same plugin/`nodejs_compat`/`server-entry` pattern)

TanStack also points at the example repo `TanStack/router` → `examples/react/start-basic-cloudflare`.

### HTTP-only (aligned with `docs/index.md`)

The draft stack wants **HTTP only**: no Server Components, no Server Functions. Map that to Start’s real primitives:

| Draft phrase | Official Start concept | Use for MVP? |
| --- | --- | --- |
| “Sem Server Functions” | `createServerFn` / RPC-style server functions | **Avoid** — draft forbids them |
| “Sem Server Components” | React RSC (Next-style) | N/A as Start feature; avoid RSC-shaped APIs |
| “Backend/API HTTP” | **Server routes** (`createFileRoute` + `server.handlers`) | **Yes** — raw `Request`/`Response` HTTP endpoints |
| Web UI without SSR data | **SPA mode** and/or **selective SSR** (`ssr: false` / `defaultSsr: false`) | **Yes** — pairs with server routes |

Server routes are explicitly for endpoints called from outside the Start app (ESP32 device, browser `fetch`/Query). Server functions are the alternative when you only call server logic from inside Start with Start-managed serialization — which the draft rejects.

Citations:

- [Server Routes · TanStack Start](https://tanstack.com/start/latest/docs/framework/react/guide/server-routes)
- [SPA mode · TanStack Start](https://tanstack.com/start/latest/docs/framework/react/guide/spa-mode) (“No SSR doesn't mean giving up server-side features… server routes”)
- [Selective SSR · TanStack Start](https://tanstack.com/start/latest/docs/framework/react/guide/selective-ssr)

**Practical shape for this monorepo:**

1. Client React app (Query/Form/Table/Zustand/Chakra) talking to `/api/...` via HTTPS.
2. Server routes under `src/routes/...` with `GET`/`POST`/etc. handlers returning `Response` / `Response.json`.
3. Optional SPA mode so the document shell is static and data loads only over HTTP (matches “HTTP only” intent).
4. One Cloudflare Worker serving assets + API + Cron (not a separate static-only host for the API).

### Custom entrypoint is required for Cron

Default `main` is `@tanstack/react-start/server-entry`. Cloudflare’s guide states you must create a **custom server entrypoint** to add Workers handlers such as **Cron Triggers** (and Queues, DO exports, Workflows).

Pattern (official):

```ts
import handler from "@tanstack/react-start/server-entry";

export default {
  fetch: handler.fetch,
  async scheduled(event, env, ctx) {
    // Google Calendar → D1 sync
  },
};
```

Then set `"main": "src/server.ts"` (or equivalent) in Wrangler.

Local test endpoint (Vite plugin / wrangler):  
`GET /cdn-cgi/handler/scheduled?cron=…`

Citations:

- [Custom entrypoints · Cloudflare TanStack Start guide](https://developers.cloudflare.com/workers/framework-guides/web-apps/tanstack-start/#custom-entrypoints)
- [Cron Triggers](https://developers.cloudflare.com/workers/configuration/cron-triggers/)
- [Scheduled Handler](https://developers.cloudflare.com/workers/runtime-apis/handlers/scheduled/)

### Wrangler Cron config

```jsonc
{
  "triggers": {
    "crons": ["0 * * * *"]
  }
}
```

Notes from official Cron docs:

- Cron runs in **UTC**.
- If the Worker is Wrangler-managed, Cron Triggers should be managed **only** in Wrangler; deploy replaces dashboard crons with the `triggers.crons` array (empty array clears all; omitting `triggers`/`crons` leaves existing deployed crons).
- Multiple expressions invoke the **same** `scheduled()` handler; branch on `controller.cron` (exact string match including spaces).

---

## 2. D1 access pattern

### Binding

Declare in Wrangler:

```jsonc
{
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "<name>",
      "database_id": "<uuid>"
    }
  ]
}
```

Create DB with `wrangler d1 create`; binding name must be a valid JS identifier; API appears on `env.<binding>`.

Citations:

- [D1 Getting started](https://developers.cloudflare.com/d1/get-started/)
- [Bindings (env)](https://developers.cloudflare.com/workers/runtime-apis/bindings/)

### From HTTP server routes (HTTP-only path)

Cloudflare’s TanStack examples often show `createServerFn` + `import { env } from "cloudflare:workers"`. For this MVP, **do the same binding access inside server-route handlers** (and inside `scheduled`), not via server functions:

```ts
import { env } from "cloudflare:workers";

// inside a server route handler or scheduled():
await env.DB.prepare("SELECT …").bind(…).all();
```

Rules that matter for the spec:

- Prefer reading bindings **per request** / inside handlers. Cloudflare documents that I/O on bindings (KV, D1, etc.) is **not** allowed from top-level module scope even when `env` is imported; secrets/vars may be readable at top level, but D1 queries must run in request/schedule context.
- TanStack Start env guide: on Workers, avoid module-scope `process.env` reads; use per-request handlers or `cloudflare:workers` `env`.
- Generate types with `wrangler types` / `cf-typegen`.

Citations:

- [Workers Binding API · D1](https://developers.cloudflare.com/d1/worker-api/)
- [Bindings · Cloudflare TanStack Start](https://developers.cloudflare.com/workers/framework-guides/web-apps/tanstack-start/#bindings)
- [Environment variables · TanStack Start](https://tanstack.com/start/latest/docs/framework/react/guide/environment-variables)

### Query API surface to assume

Prepared statements: `.prepare().bind().run() | .all() | .first() | .raw()`; batches via `env.DB.batch([...])`; raw SQL via `.exec()` (no bind params).

Migrations: Wrangler `d1 migrations` (`.sql` files, `d1_migrations` table); optional `migrations_dir` / `migrations_pattern` for ORM layouts (e.g. Drizzle nested folders). Prefer **database name** (stable) over binding name when applying migrations.

Citation: [D1 Migrations](https://developers.cloudflare.com/d1/reference/migrations/)

---

## 3. CPU / time / concurrency limits (spec must respect)

### Workers (platform)

From [Workers Limits](https://developers.cloudflare.com/workers/platform/limits/):

| Limit | Free | Paid |
| --- | --- | --- |
| CPU per HTTP request | 10 ms | Default **30 s**, configurable up to **5 min** (`limits.cpu_ms`) |
| CPU per Cron Trigger | 10 ms | **30 s** if cron interval **&lt; 1 hour**; **15 min** if interval **≥ 1 hour** |
| Wall time HTTP | Unlimited while client connected; `waitUntil` ≤ **30 s** after response/disconnect | same |
| Wall time Cron | **15 minutes** max per invocation | same |
| Memory | **128 MB** per isolate | same |
| Subrequests / invocation | 50 | 10,000 (configurable) |
| Simultaneous open connections waiting for headers | **6** (includes D1-related opens) | same |
| Cron Triggers per **account** | **5** | **250** |
| Worker size (compressed script) | 3 MB | 10 MB |

**Implication for Google Calendar sync via Cron:** Free plan (10 ms CPU) is not a realistic promise for sync work. On Paid, a sync cron **more frequent than hourly** is capped at **30 s CPU** (I/O wait does not count as CPU, but parsing/upsert logic does). Wall clock for Cron never exceeds **15 minutes**.

### D1

From [D1 Limits](https://developers.cloudflare.com/d1/platform/limits/):

| Limit | Value |
| --- | --- |
| Max DB size | 10 GB Paid / 500 MB Free |
| Queries per Worker invocation | 1000 Paid / 50 Free |
| Max SQL statement length | 100 KB |
| Bound parameters / query | 100 |
| Max SQL query duration | **30 seconds** (also applies to whole batch) |
| Row / string / BLOB size | 2 MB |
| Simultaneous D1 connections per Worker invocation | **6** |
| Concurrency model | **One query at a time per database** (single-threaded; overload → queue then error) |

Large multi-row migrations must be **batched**; a single huge `UPDATE`/`DELETE` can exceed execution limits.

---

## 4. Secrets / env (draft alignment)

Draft secrets (`GOOGLE_*`, `DEVICE_API_TOKEN`) map to Workers **secrets** / vars bindings — not to an in-app session store. Access them from server-route handlers and `scheduled` via `env`. Do not put secrets in `VITE_*` client env.

Auth for the web UI is out of app scope (Cloudflare Access at the edge) — consistent with not needing Start session/auth server functions.

---

## 5. What the spec must **not** promise

1. **Workers Free** as the production runtime for Cron + Google sync (10 ms CPU / 5 Cron Triggers per account / 50 D1 queries per invocation).
2. **Server Functions / RSC** as the API layer (conflicts with draft HTTP-only; Cloudflare examples that only show `createServerFn` are illustrative of bindings, not mandatory).
3. **Cron wall time &gt; 15 minutes** or unbounded sync jobs in one invocation.
4. **&lt;1h Cron** with more than **30 s CPU** on Paid without raising/rethinking schedule (interval ≥ 1h unlocks 15 min Cron CPU).
5. **High concurrent write throughput on one D1 database** — D1 is single-threaded per DB; design for low QPS personal calendar, not multi-tenant write storms.
6. **Node.js `fs` / full Node** — only `nodejs_compat` subset; prefer Web/`cloudflare:*` APIs.
7. **Module-scope D1 I/O** or relying on module-scope `process.env` under Workers SSR.
8. **Managing Cron only in the dashboard** while also deploying Wrangler configs (Wrangler is source of truth and can wipe dashboard crons).
9. **Non-UTC cron schedules** without converting explicitly.
10. **Static-CDN-only deploy** for the whole product if API + Cron must live on the same Worker — SPA shell can be static assets, but API/Cron need the Worker entry (or a second Worker; draft implies one backend).
11. **Separate “TanStack Start Server” process** distinct from the Worker — on Cloudflare, Start’s server entry **is** the Worker.
12. **React Server Components** as a Start/Cloudflare feature to lean on — not part of this stack.

---

## 6. Spec checklist (constraints to encode)

- [ ] Vite + `@cloudflare/vite-plugin` + `tanstackStart` + `nodejs_compat`.
- [ ] Custom `main` entry: `fetch` → Start handler; `scheduled` → Google→D1 sync.
- [ ] `triggers.crons` in Wrangler (UTC); document chosen interval vs CPU tier (&lt;1h ⇒ 30 s CPU).
- [ ] D1 binding + migrations via Wrangler; access only inside handlers/`scheduled`.
- [ ] Public HTTP API = Start **server routes** only; client uses TanStack Query against those URLs.
- [ ] Web UI: SPA mode and/or `ssr: false` so data path is HTTP, not loaders/server functions.
- [ ] Target **Workers Paid** (or document Free as non-goals).
- [ ] Sync/upsert design respects D1 single-threadedness, 30 s query/batch cap, and Cron wall/CPU caps.
- [ ] Device and web call HTTPS routes; device auth via `DEVICE_API_TOKEN` (secret), not Start sessions.
- [ ] Do not require Server Functions, RSC, or Node filesystem.

---

## Source index

| Topic | URL |
| --- | --- |
| CF × TanStack Start | https://developers.cloudflare.com/workers/framework-guides/web-apps/tanstack-start/ |
| TanStack hosting (CF) | https://tanstack.com/start/latest/docs/framework/react/guide/hosting |
| Server routes | https://tanstack.com/start/latest/docs/framework/react/guide/server-routes |
| SPA mode | https://tanstack.com/start/latest/docs/framework/react/guide/spa-mode |
| Selective SSR | https://tanstack.com/start/latest/docs/framework/react/guide/selective-ssr |
| Env vars (Start) | https://tanstack.com/start/latest/docs/framework/react/guide/environment-variables |
| Workers limits | https://developers.cloudflare.com/workers/platform/limits/ |
| Cron Triggers | https://developers.cloudflare.com/workers/configuration/cron-triggers/ |
| Scheduled handler | https://developers.cloudflare.com/workers/runtime-apis/handlers/scheduled/ |
| Bindings / env | https://developers.cloudflare.com/workers/runtime-apis/bindings/ |
| D1 get started | https://developers.cloudflare.com/d1/get-started/ |
| D1 Worker API | https://developers.cloudflare.com/d1/worker-api/ |
| D1 limits | https://developers.cloudflare.com/d1/platform/limits/ |
| D1 migrations | https://developers.cloudflare.com/d1/reference/migrations/ |

---

## Process note

Workspace `/home/ixcsoft/Pessoal/alerts` is **not** a git repository at research time; throwaway branch `research/tanstack-start-workers-d1` was **not** created. Findings live only as files under `docs/research/` and the wayfinder tracker.
