# ADR 0003: Node isolado em `app/`

## Status

Aceito (2026-08-27). Supersede [ADR 0002](./0002-app-workspace-package.md).

## Contexto

ADR 0002 moveu o TanStack Start para `packages/app/` com npm workspaces e tooling (Vite, Wrangler, Vitest) na raiz do repo. `db/migrations/` ficou na raiz. Na prática o repo tem **um** app Node, firmware C e docs — o layout parecia monorepo multi-pacote sem ser.

## Decisão

Consolidar **todo** código e configuração Node em `app/` (`@app/alerts`):

- camadas `domain/`, `server/`, `client/`, `routes/`, entry `worker.ts`
- `db/migrations/` dentro de `app/db/`
- `package.json`, Vite, Wrangler, Vitest, TypeScript na mesma pasta

Raiz do repo: `app/`, `firmware/`, `docs/`, `CONTEXT.md`, `README.md`. Sem npm workspaces.

## Alternativas consideradas

| Alternativa | Por que não |
| --- | --- |
| Manter `packages/app/` + tooling na raiz | Node partido em dois lugares; workspaces com um pacote só |
| Pacote `@app/worker` separado | Um deploy Worker; entry fino no mesmo app |
| `backend/` em vez de `app/` | Nome `app/` alinha com TanStack `srcDirectory` e spec histórica |

## Consequências

- Comandos de dev/test/build rodam de `app/` (`cd app && npm run dev`).
- `wrangler.jsonc` e migrations D1 vivem em `app/`.
- Imports internos continuam com alias `@app/*`.
