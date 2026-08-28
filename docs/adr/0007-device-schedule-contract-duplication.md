# ADR 0007: Contrato device schedule duplicado — sem artefato compartilhado app ↔ firmware

## Status

Aceito (2026-08-28)

## Contexto

`GET /api/device/schedule` é o seam HTTP entre o Worker (`app/`) e o firmware ESP32-C6 (`firmware/esp32-c6/`), consumido também pelo **Simulador** (ADR 0005). O body JSON (unix seconds, camelCase) é definido hoje em dois lugares:

- **Emit:** `app/src/server/device/` — tipos TS, `toDeviceSchedule`, testes Vitest
- **Parse:** `firmware/esp32-c6/storage/` — `schedule_parse.c`, `schedule.h`, `alerts_schedule_t`, testes host C

Uma revisão de arquitetura (2026-08-28) propôs um “dono único” cross-tier: fixtures JSON na raiz, Zod em `shared/`, validação compartilhada entre TS e C. O trade-off real é **locality do contrato** vs **acoplamento de build** entre stacks sem runtime comum (Node/Workers vs C embarcado).

## Decisão

**Aceitar a duplicação** do contrato JSON do device schedule entre aplicação e firmware. **Não** criar artefato compartilhado entre `app/` e `firmware/`:

- Sem diretório `fixtures/device-schedule/` (ou equivalente) como fonte canônica cross-tier
- Sem JSON Schema / codegen / script que gere headers C a partir de TS (ou vice-versa)
- Sem mover o contrato wire para `shared/` com expectativa de ser “dono” do seam HTTP↔device

Cada lado mantém sua interface e testes no próprio tree. Mudança de campo exige editar **ambos** (mapper TS + parser C) e rodar testes dos dois lados.

Documentação de referência do wire format permanece onde já existe: comentário na rota `app/src/routes/api/device/schedule.ts`, tipos em `server/device/types.ts`, struct/parser em `firmware/esp32-c6/storage/`. ADR 0004 continua valendo para unix + truncamento server-side.

## Alternativas consideradas

| Alternativa | Por que não |
| --- | --- |
| Fixtures JSON na raiz consumidas por TS e C | Acopla CI/build; path relativo frágil entre trees; ganho de locality não paga o custo no MVP |
| `shared/device/` + Zod como dono do contrato | `shared/` é web↔server (vanguarda); firmware não importa TS — dono fictício |
| JSON Schema + validação dupla gerada | Dependência e pipeline extra; duas linguagens já têm parsers adequados |
| Contrato único em `firmware/contract/` | Inverte ownership; Worker passaria a depender do tree firmware |

## Consequências

- Revisões de arquitetura **não** devem re-sugerir compartilhamento cross-tier deste contrato; apontar para este ADR.
- Drift TS↔C é risco aceito; mitigação: checklist manual em PRs que tocam device schedule (ambos os lados + testes).
- `unavailable()` e política de horizonte/truncamento permanecem concerns separados (app vs firmware); candidatos de deepening adjacentes não dependem de fixture compartilhada.
- Se no futuro houver **terceiro consumidor** do mesmo JSON ou churn alto no contrato, reabrir este ADR — até lá, duplicação explícita é cheaper.
