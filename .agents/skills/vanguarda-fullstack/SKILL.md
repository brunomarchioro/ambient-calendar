---
name: vanguarda-fullstack
description: >
  vanguarda-fullstack: arquitetura feature-sliced para apps TanStack Start.
  Use ao criar, modificar ou revisar TypeScript/React/Node fullstack em src/
  (routes, web, server, shared, use-cases, repository, components, hooks).
  Use ao decidir colocação de API handlers, tipos, infra ou features.
license: MIT
metadata:
  author: Bruno Marchioro <emailparabruno@gmail.com>
  organization: Bruno Marchioro
  version: "1.1.0"
---

# vanguarda-fullstack

Feature-sliced architecture for Vanguarda fullstack applications. Follow when creating or moving code.

## When to Apply

- Scaffolding a new Vanguarda fullstack app;
- Adding a `{feature-name}` slice;
- Refactoring toward the target layout;
- Deciding where to place API handlers, types, or infrastructure.

## Steps

1. Leia `CONTEXT.md` — vocabulário de domínio do produto.
2. Classifique: resource feature vs context feature (Decision Rules).
3. Escolha pasta com Decision Rules; ambíguo → prefira `{feature}/` sobre `common/`.
4. Adapters (`routes/`, `web/{feature}/api/`) ficam finos: Zod na borda → use-case.
5. Lógica pura sem I/O → `services/`; persistência → `repository/`; orquestração → `use-cases/`.
6. Tipos que cruzam web + server → `shared/{feature}/types.ts`.
7. Confira dependency rule antes de finalizar.
8. Feature do zero (API → UI) → [`feature-walkthrough.md`](feature-walkthrough.md). Snippets por camada → [`patterns.md`](patterns.md). Colocação → [`decision-tree.md`](decision-tree.md).

## Stack

| Layer         | Choice                                         |
| ------------- | ---------------------------------------------- |
| Framework     | TanStack Start                                 |
| Routing       | TanStack Router — file routes in `src/routes/` |
| Data fetching | TanStack Query                                 |
| UI            | shadcn/ui + Tailwind v4                        |
| Database      | Drizzle ORM + Cloudflare D1                    |
| Validation    | Zod                                            |
| Deploy        | Cloudflare Workers                             |

UI → `building-components`. React/SSR performance → `vercel-react-best-practices`.

## Path Aliases

- `@/` → `src/` (imports cross-layer use the alias).
- Never import upward across the dependency rule (e.g. `services/` must not import `repository/`).

## Design Principles

Light DDD, Clean Architecture, and Hexagonal — expressed through folders, not ceremony.

**Philosophy:** clear > clever · a little copying > a premature shared dependency · simple, readable, maintainable code.

| Idea            | Folder expression                                                        |
| --------------- | ------------------------------------------------------------------------ |
| Bounded context | `{feature-name}/` slice                                                  |
| Use case        | `server/{feature}/use-cases/` function                                   |
| Repository      | `server/{feature}/repository/` function                                  |
| Domain rule     | Pure function in `server/{feature}/services/`                            |
| Port            | Use-case/repository signature + `shared/{feature}/types.ts`              |
| Adapter         | `{feature}/infra/`, `common/infra/`, `routes/api/`, `web/{feature}/api/` |

**Do:** named functions; explicit data flow; Zod at boundaries; layers as folders of functions (repository, use-cases, services, infra); extract to `common/` only when reused.

**Don't:** generic/abstract repository interfaces; classes where a function works; mapper layers; DI containers; domain events without a second consumer; abstract factories "for flexibility."

**Dependency rule:** adapters (`routes/api/`, `web/{feature}/api/`) call `use-cases/` only. `use-cases/` orchestrate `repository/`, `services/`, and `infra/`. `services/` are pure — they do not import `repository/`, `infra/`, UI, or framework. Nothing imports `use-cases/` except adapters.

## Conventions

- Files and directories: **kebab-case** (including React components, e.g. `event-list.tsx`).
- React components: PascalCase **named export** inside a kebab-case file (e.g. `export function EventList` in `event-list.tsx`).
- One React component per file.
- No barrel files.
- No default exports.
- Use-case functions carry the `UseCase` suffix (e.g. `createEventUseCase`). Files stay kebab-case without the suffix (`create-event.ts`). Repository, service, and infra functions have no suffix.

### Exceptions

- **Default export** — only in framework entry points (e.g. `src/server.ts`).
- **`index.ts`** — only in `*/common/infra/*` as a connection point (db client, theme tokens). Never as a re-export barrel.
- **Route files** — export `Route` via named export; this does not violate one-component-per-file.

## Testing

- Colocate tests: `*.test.ts` beside the module under test.
- Fixtures: `{layer}/*.fixtures.ts` in the same folder as the tests that use them.
- Test `services/` as pure functions; test `use-cases/` with mocked repository/infra deps passed explicitly.

## Directory Structure

```
src/
├── routes/              # TanStack Router — thin: compose UI, configure loaders
├── routes/api/          # public REST — delegate to server use-cases
├── web/
│   ├── common/          # components/, hooks/, infra/, utils.ts, types.ts
│   └── {feature-name}/  # components/, hooks/, api/, utils.ts, types.ts
├── server/
│   ├── common/          # infra/, repository/, use-cases/, services/ (layers as needed)
│   └── {feature-name}/
│       ├── repository/  # data access (Drizzle)
│       ├── use-cases/   # orchestration — the only layer adapters call
│       ├── services/    # pure domain rules
│       ├── infra/       # feature external integration
│       ├── utils.ts
│       └── types.ts
└── shared/
    ├── common/          # cross-feature contracts (types.ts, utils.ts)
    └── {feature-name}/  # types.ts, utils.ts
```

Drizzle schema: `server/{feature}/repository/schema.ts`, or `server/common/infra/db/schema/` when shared across features.

## Decision Rules

### Feature

A feature is a vertical slice. Two kinds:

- **Resource feature** — maps to a table/resource with its own UI and API. E.g. `events`, `users`.
- **Context feature** — a capability or screen spanning multiple resources, not a single table. E.g. `dashboard` (web), `metrics` (server).

Web and server features need not map 1:1. A web `dashboard` may consume a server `metrics` feature; name each side for what it does.

Name in kebab-case. No feature for pure infra (db client, cron, external collectors).

### Infrastructure

External connections (DB, brokers, HTTP clients), background jobs, logger, shutdown hooks, frontend theme/providers. Used by 2+ features or outside a feature's request/UI cycle → `common/infra/`.

Same domain word can be both: background collection or external client → `common/infra/` (or `{feature}/infra/`); request- or UI-driven read → `{feature}/use-cases/`. Split by responsibility, not by name.

### Common vs feature

| Question                          | Destination                                         |
| --------------------------------- | --------------------------------------------------- |
| One feature only?                 | `{feature}/`                                        |
| 2+ features?                      | `common/`                                           |
| Orchestration for one screen?     | `server/{feature}/use-cases/`                       |
| Pure domain rule?                 | `server/{feature}/services/`                        |
| Data access?                      | `server/{feature}/repository/`                      |
| Cross-cutting integration, no UI? | `server/common/infra/` or `server/common/services/` |

### Examples

| Case                                    | Kind          | Location                     |
| --------------------------------------- | ------------- | ---------------------------- |
| Read metrics for a chart (compose)      | Use case      | `server/metrics/use-cases/`  |
| Query metric rows from DB               | Repository    | `server/metrics/repository/` |
| Derive/aggregate service status         | Domain rule   | `server/services/services/`  |
| Fetch metrics from SigNoz (feature)     | Infra         | `server/metrics/infra/`      |
| Collect metrics on a cron / prune rows  | Infra         | `server/common/infra/`       |
| Analytics dashboard over many resources | Context feat. | `web/dashboard/`             |
| Auth session helper used everywhere     | Common        | `server/common/services/`    |
| Shared metric DTO web + server          | Shared type   | `shared/metrics/types.ts`    |

### Shared types

- `src/shared/{feature}/types.ts` — DTOs, Zod schemas, and enums for one feature crossing the web/server boundary.
- `src/shared/common/` — contracts shared across features.
- `{feature}/types.ts` on each side (web/server) — private to that layer.
- Prefer `shared/{feature}/` when both sides need the type; `shared/common/` only when 2+ features need it.

## Layer Responsibilities

| Layer        | Responsibility                                      | May import                         |
| ------------ | --------------------------------------------------- | ---------------------------------- |
| `routes/`    | HTTP/UI wiring, Zod parse at boundary               | use-cases, web components, web/api |
| `web/api/`   | fetch + TanStack Query options                      | shared types only                  |
| `use-cases/` | Orchestration, transaction boundaries               | repository, services, infra, types   |
| `repository/`| Drizzle queries, row mapping                        | infra db client, server types      |
| `services/`  | Pure domain rules                                   | shared/server types only           |
| `infra/`     | External I/O (HTTP clients, brokers, cron handlers) | common libs, env                   |

## Routes Pattern

- **API** (`src/routes/api/`): `server.handlers` — parse request → call use-case → `Response.json`. See [`patterns.md`](patterns.md).
- **Pages** (`src/routes/`): loader uses `web/{feature}/api/` queryOptions; component from `web/{feature}/components/`; layout/auth → `web/common/`.
- **New feature end-to-end** → [`feature-walkthrough.md`](feature-walkthrough.md).

## Related Skills

- `building-components` — shadcn/ui components and composition
- `vercel-react-best-practices` — React/SSR performance
- `vercel-composition-patterns` — component composition
- `building-components` — component architecture
