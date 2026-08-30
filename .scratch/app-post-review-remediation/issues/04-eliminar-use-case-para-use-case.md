# 04: Eliminar imports use-case → use-case

**What to build:** Fluxos de Eventos, schedule do device e sync Google deixam de encadear use-cases dentro de use-cases (ex.: `getOrSeedSettingsUseCase` chamado de dentro de outro use-case). Orquestração sobe para adapters (`routes/`, `worker.ts`) ou vira função pura em `services/` compartilhado.

**Blocked by:** 03 — Corrigir dependency rule no fluxo MCP (Lembretes)

**Status:** resolved

- [x] Nenhum arquivo em `server/*/use-cases/` importa outro use-case
- [x] Settings seed/get continua funcionando em API, cron e device schedule
- [x] CRUD manual de Eventos e sync Google inalterados do ponto de vista do usuário web
- [x] Testes existentes passam

## Answer

Settings injetado em event/device use-cases; sync manual orquestrado na rota `google/sync`; MCP tools movidos para `infra/reminder-tools.ts` (adapter).
