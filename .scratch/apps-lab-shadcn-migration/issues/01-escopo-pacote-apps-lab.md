# Escopo do pacote: apps/lab vs app/

Type: grilling
Status: resolved

## Question

O destino da migração é o pacote **`app/`** existente (in-place), ou inclui **reestruturação de monorepo** renomeando/movendo para `apps/lab`?

Contexto fact-finding: hoje só existe `app/` na raiz do repo; não há pasta `apps/`. O workspace (`alerts.code-workspace`) referencia `.` e `firmware/esp32-c6`.

Opções:

- **A)** Migrar UI de `app/` in-place; ignorar `apps/lab` como nome aspiracional ou typo.
- **B)** Renomear/mover `app/` → `apps/lab` **antes** da migração shadcn.
- **C)** Renomear/mover **depois** da migração shadcn (UI primeiro, estrutura depois).
- **D)** Criar `apps/lab` como pacote novo e deprecar `app/` (split).

## Answer

**A — in-place.** Migrar UI em `app/` sem rename para `apps/lab`. Reestruturação de monorepo fica fora deste esforço (out of scope / fog futuro).
