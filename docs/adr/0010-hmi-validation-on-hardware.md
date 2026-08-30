# ADR 0010: Validação HMI no hardware (sem simulador host)

## Status

Aceito (2026-08-30). Supersede [ADR 0005](0005-firmware-hmi-simulator.md).

## Contexto

O [simulador LVGL/SDL](0005-firmware-hmi-simulator.md) em `firmware/simulator/` validava pixels e interação no host, mas exigia LVGL vendored, SDL2, libcurl e shims duplicados. Com board Waveshare ESP32-C6 disponível no fluxo de dev, o custo de manutenção superou o benefício.

Testes headless em `firmware/esp32-c6/host/` (`hmi_frame`, parse JSON, `poll`) permanecem — cobrem lógica sem tela.

## Decisão

- **Remover** `firmware/simulator/` por completo.
- **Validação visual:** flash no ESP32-C6 + inspeção na tela física (172×320).
- **Evidência PNG:** obrigatória quando `docs/hmi-screen-design.md` muda no PR (foto da tela real; lanes `hmi-*.png` do `mvp-build-plan.md`).
- **Stubs host:** só `esp_err.h` e `esp_log.h` em `firmware/esp32-c6/host/stubs/` para compilar `poll.c` nos unit tests.
- **`firmware/.dev.vars`:** mantido para `sync-devvars` → flash (ADR 0008); não era exclusivo do simulador.

## Alternativas consideradas

| Alternativa | Por que não |
| --- | --- |
| Manter simulador “só para layout” | Duplica stack LVGL; board cobre pixels reais (touch, heap, drivers) |
| Preview web no `app/` | Rejeitado no ADR 0005 — drift TS ↔ C |
| Remover `host/` junto | Perde CI local barato de parse e máquina de estados |

## Consequências

- Handoff de layout (ADR 0009) aponta para hardware, não simulador.
- PRs de HMI exigem board ou evidência PNG quando o design doc muda.
- ADR 0005 permanece como histórico; status superseded.
