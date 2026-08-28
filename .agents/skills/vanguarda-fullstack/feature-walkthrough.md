# vanguarda-fullstack — feature walkthrough

Vertical slice examples: API → server → web → route → component. Snippets per layer → [`patterns.md`](patterns.md).

---

## Resource feature: `events` (list + create)

Maps to a persisted resource with REST API and UI.

### File tree

```
src/
├── shared/events/
│   └── types.ts                          # Zod schemas + DTOs (web ↔ server)
├── server/events/
│   ├── repository/
│   │   ├── schema.ts                     # Drizzle table
│   │   ├── insert-event.ts
│   │   └── list-events.ts
│   ├── services/
│   │   └── validate-event-window.ts      # pure rules
│   └── use-cases/
│       ├── create-event.ts
│       └── list-events.ts
├── web/events/
│   ├── api/
│   │   ├── events-query.ts               # queryOptions
│   │   └── create-event-mutation.ts      # mutationOptions
│   └── components/
│       ├── event-list-page.tsx
│       ├── event-list.tsx
│       └── event-form.tsx
├── routes/
│   ├── api/events.ts                     # GET + POST handlers
│   └── events/index.tsx                  # page route + loader
```

### Read flow (GET `/api/events` → page)

```
Browser GET /events/
  → routes/events/index.tsx loader
    → web/events/api/events-query.ts (ensureQueryData)
      → fetch GET /api/events
        → routes/api/events.ts handler
          → listEventsUseCase(db)
            → listEvents(db)          [repository]
  → EventListPage (useSuspenseQuery)
    → EventList                       [component]
```

### Create flow (form → POST → list refresh)

```
EventForm submit
  → useMutation(createEventMutationOptions)
    → fetch POST /api/events + JSON body
      → routes/api/events.ts handler
        → parseEventWrite(json)       [shared/events/types.ts — Zod]
        → createEventUseCase(db, data)
          → validateEventWindow(data) [services — pure]
          → insertEvent(db, data)     [repository — Drizzle]
    → onSuccess: invalidate eventsQueryKey
  → EventListPage re-fetches via query cache
```

### Dependency check (events)

| From | May import | Must not import |
| ---- | ---------- | --------------- |
| `routes/api/events.ts` | use-cases, shared types | repository, services, web |
| `routes/events/index.tsx` | web/api, web/components | use-cases, server |
| `web/events/api/*` | shared types | server, use-cases |
| `web/events/components/*` | web/api, shared types, Chakra | server, use-cases, repository |
| `use-cases/*` | repository, services, infra, types | web, routes, React |
| `services/*` | shared/server types | repository, infra, drizzle, fetch |
| `repository/*` | drizzle schema, db client | services (call direction is use-case → both) |

### Scaffold order (new resource feature)

1. `shared/{feature}/types.ts` — Zod + DTOs
2. `server/{feature}/repository/schema.ts` + query/insert functions
3. `server/{feature}/services/` — pure rules (if any)
4. `server/{feature}/use-cases/` — one file per operation
5. `routes/api/{resource}.ts` — thin handlers
6. `web/{feature}/api/` — queryOptions + mutationOptions
7. `web/{feature}/components/` — kebab-case files, PascalCase exports
8. `routes/{resource}/index.tsx` — loader + page component

---

## Context feature: `dashboard` (read-only compose)

Spans multiple resources; no own table. **Web-only slice** consuming existing APIs.

### File tree

```
src/
├── web/dashboard/
│   ├── api/
│   │   └── dashboard-query.ts            # combines events + settings queries
│   └── components/
│       ├── dashboard-page.tsx
│       ├── upcoming-events-card.tsx
│       └── settings-summary-card.tsx
├── routes/
│   └── index.tsx                         # home / dashboard route
```

Server side reuses existing features — no `server/dashboard/` unless a dedicated aggregation use-case is needed (e.g. heavy join across tables → `server/dashboard/use-cases/get-dashboard-snapshot.ts`).

### Read flow (dashboard)

```
Browser GET /
  → routes/index.tsx loader
    → parallel ensureQueryData:
        eventsQueryOptions()     [web/events/api]
        settingsQueryOptions()   [web/settings/api]
  → DashboardPage
    → UpcomingEventsCard + SettingsSummaryCard
```

### When to add `server/dashboard/use-cases/`

Add server orchestration only when:

- Multiple repository calls must run atomically or with shared logic
- Response shape is a server-computed aggregate not owned by one resource
- Client-side fan-out would leak internal service boundaries or hurt perf

Otherwise keep `web/dashboard/api/` composing existing `web/*/api/` queryOptions.

---

## Quick reference

| Feature kind | Server slice | Web slice | API route | Page route |
| ------------ | ------------ | --------- | --------- | ---------- |
| Resource (`events`) | `server/events/` full layers | `web/events/` | `routes/api/events.ts` | `routes/events/index.tsx` |
| Context (`dashboard`) | optional use-case | `web/dashboard/` | none (consumes other APIs) | `routes/index.tsx` |
