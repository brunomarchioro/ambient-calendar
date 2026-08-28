# ADR 0001: Vendoring mínimo do BSP Waveshare para LVGL

## Status

Aceito (2026-08-27)

## Contexto

O Ambient Calendar Display roda no Waveshare ESP32-C6-Touch-LCD-1.47 (JD9853 + AXS5106L, 172×320, sem PSRAM). A spec congela ESP-IDF ≥ 5.5 com `esp_lcd` + `esp_lvgl_port` e buffer parcial de desenho.

Precisávamos trazer init de display/touch/LVGL para o monorepo sem acoplar o firmware inteiro aos demos Waveshare (`01_factory`, Wi-Fi de teste, SD, IMU).

## Decisão

Vendar em `firmware/esp32-c6/ui/waveshare/` apenas o necessário para boot de hardware:

- sequência de init JD9853 (derivada do demo `01_factory`);
- pinout congelado em `ws_pins.h`;
- touch AXS5106L via I2C master (leitura polled no input LVGL);
- `esp_lvgl_port` como dependência gerenciada (`idf_component.yml`).

`bsp.c` permanece um wrapper fino (`alerts_bsp_init`, `alerts_lvgl_init`); widgets de domínio ficam em `hmi_lvgl.c`.

## Alternativas consideradas

| Alternativa | Por que não |
| --- | --- |
| Submodule do repo de exemplos Waveshare | Demo inteiro inclui SD/IMU/bateria; atualização manual de qualquer forma |
| Reimplementar drivers do zero | Risco de pinout/init errado sem ganho no MVP |
| Arduino GFX + LVGL 8.4 | Fora da stack IDF congelada em `docs/index.md` §7 |
| Component registry Waveshare para este SKU | Não há BSP publicado para ESP32-C6-Touch-LCD-1.47 no momento da decisão |

## Consequências

- Atualizações de demo Waveshare exigem diff manual em `ui/waveshare/` (principalmente `jd9853_vendor_init.c`).
- Build de device depende de `espressif/esp_lvgl_port` e LVGL 9 (via port).
- `CONFIG_ALERTS_LVGL_DRAW_LINES` expõe altura do buffer parcial para tuning de heap pós-TLS.
- Host tests continuam sem LVGL; scheduler/HMI view são testados em `host/`.
