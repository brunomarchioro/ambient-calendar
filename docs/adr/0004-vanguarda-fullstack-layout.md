# ADR 0004: Layout vanguarda-fullstack em `app/src/`

## Status

Aceito (2026-08-28). Supersede o layout interno descrito em [ADR 0003](./0003-node-app-folder.md) (`domain/`, `client/`, rotas flat). A decisão de consolidar Node em `app/` (ADR 0003) permanece.

## Contexto

O pacote `@app/alerts` vivia com camadas planas (`domain/`, `client/`, `server/` mínimo, `routes/`), SQL raw inline, e tipos compartilhados acoplados ao domínio. A skill `.agents/skills/vanguarda-fullstack` define feature-sliced architecture (shared, server, web, routes) alinhada a TanStack Start + Drizzle + Cloudflare D1.

Precisávamos refatorar sem legado, preparar crescimento por feature (events, settings, sync, device), e desacoplar web de server via `shared/`.

## Decisão

Reorganizar o código TypeScript/React em `app/src/` com alias `@/` → `app/src/`:

```text
app/src/
├── shared/{common,events,settings}/   # DTOs, Zod, utils puros (web ↔ server)
├── server/{feature}/{use-cases,repository,services,infra}/
├── web/{feature}/{api,components}/ + web/common/
└── routes/ + routes/api/              # adapters finos → use-cases
```

Decisões complementares:

- **ORM:** Drizzle Kit; migrations em `app/db/migrations/` (substitui SQL manual legado).
- **Data fetching UI:** SPA (`ssr: false`); TanStack Query via `queryOptions` em `web/{feature}/api/`.
- **Rotas UI:** `/events` (agenda), `/settings`, `/` redireciona para `/events`.
- **API paths:** inalterados (`/api/events`, `/api/settings`, `/api/device/schedule`, `/api/health`).
- **Device schedule JSON:** unix seconds (`serverUnix`, `startUnix`, `endUnix`); truncamento server-side a `showNextEvents`. Firmware ESP32 deve ser atualizado (ver prompt de refatoração em chat 2026-08-28).

Features: `events`, `settings`, `sync`, `device`, `health`; utilitários de tempo em `shared/common/instant.ts`.

Removidos: `domain/`, `client/`, `routes/` e `router.tsx` na raiz de `app/`.

## Alternativas consideradas

| Alternativa | Por que não |
| --- | --- |
| Manter `domain/` monolítico | Mistura regras puras, SQL e orquestração; viola dependency rule |
| SQL raw em `repository/` | Drizzle é padrão da stack vanguarda; schema tipado por feature |
| Versionar API (`/api/v1/…`) | Sem consumidor externo além do firmware; path mantido, só body mudou |
| Loaders SSR nas rotas UI | Escopo extra; SPA + queryOptions suficiente no MVP |

## Consequências

- Comandos dev/test/build continuam em `app/`; TanStack `srcDirectory: 'src'`.
- Imports internos usam `@/` (não mais `@app/`).
- `docs/index.md` §11 reflete a árvore `app/src/`.
- Firmware `firmware/esp32-c6/` parser de schedule quebra até adaptar ao JSON unix (contrato HTTP igual).
- ADR 0002 permanece superseded por 0003; camadas `packages/app/` e `domain/` são históricas.
