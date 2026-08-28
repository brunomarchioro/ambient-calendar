# Firmware HMI simulator

Host-side LVGL/SDL build of the ESP32-C6 HMI. See [ADR 0005](../../docs/adr/0005-firmware-hmi-simulator.md).

Unit tests without a window stay in [`../esp32-c6/host/`](../esp32-c6/host/).

## Prerequisites

- `gcc`, `make`, `git`, `pkg-config`
- `libsdl2-dev`, `libcurl4-openssl-dev`
- Local Worker: `cd app && npx wrangler dev`
- Same `DEVICE_API_TOKEN` as the firmware (`ALERTS_DEVICE_API_TOKEN`)

## Build and run

```bash
cd firmware/simulator/esp32-c6
make deps    # clones LVGL v9.2.2 once
make
export ALERTS_API_BASE_URL=http://127.0.0.1:8787
export ALERTS_DEVICE_API_TOKEN=your-token
./alerts_hmi_sim
```

CLI overrides: `./alerts_hmi_sim --url http://127.0.0.1:8787 --token your-token`

## Controls

| Input | Action |
| --- | --- |
| Click | Short tap (toggle overlay) |
| Left / Right | Scrub simulated time ±15 min |
| R | Re-poll schedule from API |
| Q / Esc | Quit |

## Tests

```bash
make test   # sim_config unit test (no SDL/LVGL)
```
