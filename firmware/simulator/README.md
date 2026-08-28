# Firmware HMI simulator

Host-side LVGL/SDL build of the ESP32-C6 HMI. See [ADR 0005](../../docs/adr/0005-firmware-hmi-simulator.md).

Unit tests without a window stay in [`../esp32-c6/host/`](../esp32-c6/host/).

## Prerequisites

- `gcc`, `make`, `git`, `pkg-config`
- `libsdl2-dev`, `libcurl4-openssl-dev`
- Local Worker: `cd app && npm run dev` (porta **3000**)
- `firmware/.dev.vars` (copie de [`../.dev.vars.example`](../.dev.vars.example); ADR 0008)

### Installation

```bash
sudo apt install libsdl2-dev libcurl4-openssl-dev
cp firmware/.dev.vars.example firmware/.dev.vars   # edite ALERTS_DEVICE_API_TOKEN
```

`ALERTS_DEVICE_API_TOKEN` deve ser o **mesmo valor** que `DEVICE_API_TOKEN` em `app/.dev.vars` (Worker), mas o arquivo é do firmware.

## Build and run

```bash
cd firmware/simulator/esp32-c6
make deps    # clones LVGL v9.2.2 once
make
./alerts_hmi_sim
```

O simulador carrega `firmware/.dev.vars` automaticamente. Overrides opcionais:

```bash
export ALERTS_API_BASE_URL=http://127.0.0.1:3000
export ALERTS_DEVICE_API_TOKEN=override-token
./alerts_hmi_sim --url http://127.0.0.1:3000 --token override-token
```

## Controls

| Input        | Action                       |
| ------------ | ---------------------------- |
| Click        | Short tap (toggle overlay)   |
| Left / Right | Scrub simulated time ±15 min |
| R            | Re-poll schedule from API    |
| Q / Esc      | Quit                         |

## Tests

```bash
make test   # sim_config unit test (no SDL/LVGL)
```
