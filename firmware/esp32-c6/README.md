# ESP32-C6 platform (pr-fw-platform)

Wi-Fi, HTTPS poll of `GET /api/device/schedule`, LittleFS cache, NVS meta, SNTP with `serverUnix` seed.

## Host tests

```bash
cd firmware/esp32-c6/host && make test
```

Runs JSON parse tests and HMI frame tests (Empty, Ambient, Alerta, Agora, all-day exclusion, focus ties, Overlay list).

## HMI simulator (host)

LVGL/SDL interactive build for dev review without hardware. See [`../simulator/README.md`](../simulator/README.md) and ADR 0005.

Requires [ESP-IDF](https://docs.espressif.com/projects/esp-idf/) ≥ 5.5 and target `esp32c6`.

```bash
cd firmware/esp32-c6
idf.py set-target esp32c6
idf.py menuconfig   # Alerts device: Wi-Fi, API URL, token
idf.py build flash monitor
```

Set `CONFIG_ALERTS_API_BASE_URL` to the Worker origin (no trailing slash) and `CONFIG_ALERTS_DEVICE_API_TOKEN` to the same value as the Worker secret.

## Waveshare BSP + LVGL

Display/touch/LVGL live under `ui/waveshare/` (JD9853 init, AXS5106L I2C touch, `esp_lvgl_port`). `alerts_hmi_build_frame()` monta o frame de apresentação (Empty, Ambient, Alerta, Agora, Overlay); `alerts_hmi_lvgl_render()` só pinta.

`CONFIG_ALERTS_LVGL_DRAW_LINES` (default 20) sets partial buffer height. See `docs/adr/0001-waveshare-bsp-vendoring.md`.

## Serial pass criteria (live lanes)

| Lane | Pass when log contains |
| --- | --- |
| boot | `display init ok` |
| wifi | `got ip:` |
| poll ok | `HTTPS 200` and `littlefs write` |
| poll 401 | `poll unauthorized; cache kept` |
| littlefs | `littlefs read bytes=` after reboot |
| nvs | `nvs meta http=` survives reboot |
| serverUnix | `seed unix=` before SNTP when clock was unset |
| no SPIFFS | partition table has `littlefs`, not `spiffs` |
| heap | `free_heap=` ≥ `CONFIG_ALERTS_HEAP_FLOOR_KB` |
| cache boot | `boot cache loaded` with Wi-Fi off |

Save serial screenshots to `.scratch/pr-fw-platform/`.
