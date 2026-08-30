# 05: Alinhar contrato GET /api/device/schedule (spec ↔ wire ↔ firmware)

**What to build:** Uma decisão explícita e documentada sobre o formato de tempo no wire do device schedule, com implementação coerente em backend e firmware. Opção A: spec MVP atualizada para unix (estado atual). Opção B: API volta a ISO-8601 com offset e firmware acompanha (expand–contract se blast radius exigir batches).

**Blocked by:** None (can start immediately) — requer decisão humana sobre opção A vs B antes da implementação

**Status:** resolved

- [x] Decisão registrada (ADR ou ticket 05 em ambient-calendar-mvp-spec) escolhendo unix ou ISO
- [x] Resposta de `GET /api/device/schedule` bate com a spec escolhida (nomes de campos e formato de tempo)
- [x] ESP32 continua renderizando agenda após smoke no hardware ou simulador acordado
- [x] Testes de contrato device passam ou são atualizados para a spec escolhida

## Answer

**Opção A (unix):** wire já implementado (`serverUnix`, `startUnix`, `endUnix`); spec MVP, `docs/index.md` e ADR 0004 alinhados. ISO descartado — firmware e parser C6 já consomem Unix.
