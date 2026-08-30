# App post-review remediation — map

Labels: `wayfinder:map`

## Destination

Fechar gaps do code review de `app/` (eixos Standards + Spec) em tickets tracer-bullet executáveis, sem reabrir escopo de produto além do que já foi entregue.

## Frontier (unblocked)

Tickets prontos para agente: **05** (após decisão A/B), **06**, **08**, **09**. **01**–**04** done.

Sequência sugerida: 03 → 04; 06 → 07.

## Tickets

| # | Título | Blocked by |
|---|--------|------------|
| 01 | Concluir rename ADR 0011 | — |
| 02 | Restaurar typecheck | — |
| 03 | Dependency rule MCP | 01 |
| 04 | Eliminar use-case → use-case | 03 |
| 05 | Contrato device schedule | decisão humana |
| 06 | Estratégia auth web | — |
| 07 | Reconciliar spec MVP | 06 |
| 08 | Decompor settings page | — |
| 09 | Remover dark mode residual | — |

## Source

Code review `app/` vs `main` (Standards + Spec), conversa 2026-08-30.
