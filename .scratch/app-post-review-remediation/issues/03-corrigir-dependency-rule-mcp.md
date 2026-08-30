# 03: Corrigir dependency rule no fluxo MCP (Lembretes)

**What to build:** Ferramentas MCP de Lembretes continuam listando, criando, editando e excluindo lembretes, mas a camada `services/` deixa de importar use-cases diretamente — respeitando a regra vanguarda-fullstack de que só adapters chamam use-cases.

**Blocked by:** 01 — Concluir rename ADR 0011 (pacote + docs operacionais)

**Status:** resolved

- [x] Nenhum módulo em `server/mcp/services/` importa de `server/*/use-cases/`
- [x] Orquestração MCP passa por adapter ou use-case único invocado na borda MCP
- [x] CRUD de Lembretes via MCP funciona manualmente (smoke) ou via testes existentes
- [x] Testes do pacote `app/` passam

## Answer

Orquestração movida para `server/mcp/use-cases/mcp-reminder-tools.ts`; `services/reminder-tool-actions.ts` ficou só com helpers puros. `build-mcp-server.ts` importa use-cases.
