# ADR 0005: Simulador HMI em `firmware/simulator/`

## Status

Aceito (2026-08-28)

## Contexto

O Ambient Calendar Display valida estados de apresentação (**Alerta**, **Agora**, **Overlay**) no ESP32-C6 com LVGL e touch físico. Desenvolvimento e review de `pr-fw-hmi` dependem de board Waveshare. Precisávamos de validação no host com fidelidade à stack firmware (poll HTTP, cache, seed de relógio, overlay 15 s, pixels LVGL), sem preview web no `app/`.

`firmware/esp32-c6/host/` já cobre lógica headless (`hmi_frame`, parse JSON) para CI rápido.

## Decisão

Adicionar `firmware/simulator/` com target por chip (`esp32-c6/` primeiro):

- Compila `hmi_frame.c`, `hmi_lvgl.c`, `hmi.c`, `poll.c` e `schedule_parse.c` do tree `esp32-c6/` sem `#ifdef` no firmware de device.
- **Shims host-only** em `simulator/esp32-c6/stubs/`: HTTP (libcurl), cache em arquivo (`.cache/schedule.json`), NVS in-memory, tempo com seed `serverUnix` + scrub, lock LVGL no-op.
- **Display:** LVGL 9 + SDL2, janela 172×320 lógicos.
- **Dados:** `GET /api/device/schedule` contra `wrangler dev` (env `ALERTS_API_BASE_URL`, `ALERTS_DEVICE_API_TOKEN`; override CLI `--url` / `--token`). Sem fallback fixture offline.
- **CI:** inalterado (`host/make test`); simulador é ferramenta de dev local.
- **Fora de escopo:** preview web, port TS/WASM, QEMU/Wokwi.

## Alternativas consideradas

| Alternativa | Por que não |
| --- | --- |
| Preview React no `app/` | Escopo explícito fora; drift TS ↔ C |
| Só estender `host/` com ASCII | Não valida pixels LVGL |
| `#ifdef ALERTS_SIMULATOR` no firmware | Polui código de flash |
| Fixtures JSON como fonte primária | Decisão de produto: HTTP live |
| QEMU | Não emula painel JD9853/touch; setup pesado |

## Consequências

- LVGL vendored/clonado em `simulator/esp32-c6/third_party/lvgl` no primeiro build (`make deps`).
- Prereqs de dev: `libsdl2-dev`, `libcurl4-openssl-dev`, Worker local com token de device.
- Board real permanece prova de heap, touch I2C e drivers Waveshare.
- Termo **Simulador** registrado em `CONTEXT.md`.
