# ADR 0002: Workspace npm `@app/alerts` para a aplicação fullstack

## Status

Superseded by [ADR 0003](./0003-node-app-folder.md) (2026-08-27).

## Contexto

O Ambient Calendar Display combina firmware ESP32, migrations D1 e uma aplicação TanStack Start (UI + server routes + Cron Worker) no mesmo repositório. O código Start vivia em `app/` flat — domínio, handlers HTTP, cliente React e entry Worker no mesmo nível, com imports relativos profundos nas rotas.

Precisávamos separar artefatos npm (Node/Worker) de C/firmware sem virar monorepo pesado, e preparar camadas explícitas para crescimento futuro.

## Decisão

Mover a aplicação fullstack para `packages/app/` como pacote npm workspace `@app/alerts`, com camadas:

- `domain/` — Event, Settings, sync Google, contrato device schedule
- `server/` — handlers HTTP reutilizados pelas server routes (health, device auth)
- `client/` — React Query, Chakra theme, componentes UI
- `routes/` — TanStack Start (UI + server routes), intocável pelo framework

Tooling (Vite, Wrangler, Vitest, scripts `dev`/`build`/`test`) permanece na raiz. Imports internos usam alias `@app/*` → `packages/app/*`. `shared/` fica adiado até existir segundo consumidor Node dos mesmos contratos.

## Alternativas consideradas

| Alternativa | Por que não |
| --- | --- |
| Manter `app/` flat com alias `@app/` | Não separa artefato npm de firmware/D1 na árvore do repo |
| Pacote `@app/shared` agora | Sem segundo consumidor; tipos já vivem em `domain/` |
| Two-step (move flat, depois camadas) | Operador preferiu big bang em PR único |
| dependency-cruiser no v1 | Overhead antes de boundaries estabilizarem |

## Consequências

- `docs/index.md` §11 e `docs/mvp-build-plan.md` referenciam `packages/app/` em vez de `app/`.
- `wrangler.jsonc` `main` aponta para `packages/app/worker.ts`.
- TanStack `srcDirectory` é `packages/app`.
- Supersede o decreto Appendix A "Monorepo path stays `app/`".
