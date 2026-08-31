# ESP32-C6 platform (pr-fw-platform)

Wi-Fi, HTTPS poll of `GET /api/device/schedule`, LittleFS cache, NVS meta, SNTP with `serverUnix` seed.

## Host tests

```bash
cd firmware/esp32-c6/host && make test
```

Runs JSON parse tests and HMI frame tests (Empty, Ambient, Alerta, Agora, all-day exclusion, focus ties, Overlay list).

## Pré-requisitos

- [ESP-IDF](https://docs.espressif.com/projects/esp-idf/) ≥ 5.5 (target `esp32c6`)
- USB serial para flash/monitor (permissões `dialout` no Linux, se necessário)

Instale com o [instalador oficial](https://docs.espressif.com/projects/esp-idf/en/stable/esp32/get-started/linux-macos-setup.html) ou o EIM. O `idf.py` **não** fica no PATH global — ative o ambiente em **cada terminal novo**:

```bash
# Ajuste o caminho se instalou em outro lugar (ex.: ~/esp/esp-idf)
source ~/.espressif/v5.5.1/esp-idf/export.sh
idf.py --version   # deve responder sem "comando não encontrado"
```

Opcional no `~/.bashrc`: `alias get_idf='. ~/.espressif/v5.5.1/esp-idf/export.sh'`.

## Device build and flash

```bash
cd firmware/esp32-c6
cp ../.dev.vars.example ../.dev.vars   # edite URL, token e Wi-Fi
make -C tools sync-devvars             # firmware/.dev.vars → sdkconfig.defaults.devvars
idf.py set-target esp32c6              # só na primeira vez ou ao trocar de chip
idf.py menuconfig                      # Wi-Fi (e demais se não veio do .dev.vars)
idf.py build flash monitor
```

`sync-devvars` lê `firmware/.dev.vars` (dotenv-c, ADR 0008) e gera `sdkconfig.defaults.devvars` (gitignored). Sem esse passo, use menuconfig para URL/token.

Set `CONFIG_ALERTS_API_BASE_URL` to the Worker origin (no trailing slash) and `CONFIG_ALERTS_DEVICE_API_TOKEN` to the same value as the Worker secret.

## Waveshare BSP + LVGL

Display/touch/LVGL live under `ui/waveshare/` (JD9853 init, AXS5106L I2C touch, `esp_lvgl_port`). `alerts_hmi_build_frame()` monta o frame de apresentação (Empty, Ambient, Alerta, Agora, Overlay); `alerts_hmi_lvgl_render()` só pinta. Layout e visibilidade por estado: [`docs/hmi-screen-design.md`](../../docs/hmi-screen-design.md). Validação visual na board (ADR 0010).

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
