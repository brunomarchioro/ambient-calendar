# 07: Reconciliar spec MVP com features já entregues (OAuth multi-conta + MCP)

**What to build:** Map e tickets do MVP deixam de contradizer o que já roda em produção: OAuth interativo Google na web, multi-conta (até N contas), sync por calendário habilitado, e MCP OAuth para Lembretes. Escopo pós-MVP fica consciente — ou features são explicitamente adiadas com rationale.

**Blocked by:** 06 — Registrar estratégia de auth web (Basic Auth vs Cloudflare Access)

**Status:** resolved

- [x] `.scratch/ambient-calendar-mvp-spec/map.md` Out of scope / Decisions atualizados para OAuth web e multi-conta
- [x] MCP documentado como extensão pós-MVP (ou movido para escopo) com link para ADR/spec
- [x] Ticket 02 google sync: texto reflete sync por calendários habilitados vs só `primary`, se for intencional
- [x] `CONTEXT.md` ou `docs/index.md` coerente com vocabulário de domínio (Cliente MCP, etc.)
