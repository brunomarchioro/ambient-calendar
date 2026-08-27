# ESP32-C6 platform (pr-fw-platform)

Wi-Fi, HTTPS poll of `GET /api/device/schedule`, LittleFS cache, NVS meta, SNTP with `serverTime` seed.

## Host tests

```bash
cd firmware/esp32-c6/host && make test
```

## Device build

Requires [ESP-IDF](https://docs.espressif.com/projects/esp-idf/) ≥ 5.5 and target `esp32c6`.

```bash
cd firmware/esp32-c6
idf.py set-target esp32c6
idf.py menuconfig   # Alerts device: Wi-Fi, API URL, token
idf.py build flash monitor
```

Set `CONFIG_ALERTS_API_BASE_URL` to the Worker origin (no trailing slash) and `CONFIG_ALERTS_DEVICE_API_TOKEN` to the same value as the Worker secret.

## Waveshare BSP

Display/touch init logs success with a stub until the Waveshare `01_factory` BSP from the [board ESP-IDF examples](https://docs.waveshare.com/ESP32-C6-Touch-LCD-1.47/Development-Environment-Setup-ESP-IDF) is vendored into `ui/`. pr-fw-hmi adds LVGL screens on top.

## Serial pass criteria (live lanes)

| Lane | Pass when log contains |
| --- | --- |
| boot | `display init ok` |
| wifi | `got ip:` |
| poll ok | `HTTPS 200` and `littlefs write` |
| poll 401 | `poll unauthorized; cache kept` |
| littlefs | `littlefs read bytes=` after reboot |
| nvs | `nvs meta http=` survives reboot |
| serverTime | `seed unix=` before SNTP when clock was unset |
| no SPIFFS | partition table has `littlefs`, not `spiffs` |
| heap | `free_heap=` ≥ `CONFIG_ALERTS_HEAP_FLOOR_KB` |
| cache boot | `boot cache loaded` with Wi-Fi off |

Save serial screenshots to `.scratch/pr-fw-platform/`.
