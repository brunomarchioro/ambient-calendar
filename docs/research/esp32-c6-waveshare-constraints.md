# Constraints ESP32-C6 + Waveshare 1.47"

Research for wayfinder ticket `04-esp32-c6-waveshare-constraints`.  
Question: for firmware **ESP-IDF + LVGL** on the Waveshare ESP32-C6 Touch LCD 1.47", which official hardware/docs facts should the MVP firmware spec freeze (display/touch drivers, memory for schedule cache, filesystem options, clock sync, HTTPS on C6)?

**Date:** 2026-08-27  
**Sources:** Waveshare product wiki/docs + schematic; Espressif ESP32-C6 datasheet; ESP-IDF (C6) filesystem, system time, HTTP client, security docs.  
**Note:** workspace has no git repo — no `research/esp32-c6-waveshare-constraints` branch was created.

---

## Verdict (one line)

Freeze on Waveshare’s JD9853 (SPI) + AXS5106L (I2C) via the board’s ESP-IDF BSP/`esp_lcd` path (IDF ≥ 5.5), **512 KB HP SRAM / 8 MB flash / no PSRAM**, **NVS + LittleFS** (not SPIFFS) for config vs agenda cache, **SNTP as primary clock** with API `serverTime` only as cold-start/fallback seed, and **`esp_http_client` + certificate bundle** for HTTPS.

---

## Spec defaults to copy (no silicon re-debate)

| Topic | Default for MVP firmware spec |
| --- | --- |
| Board / SoC | Waveshare **ESP32-C6-Touch-LCD-1.47** / **ESP32-C6FH8** |
| IDF baseline | **ESP-IDF ≥ 5.5.0** (Waveshare requirement for this board’s IDF demos) |
| Display | **JD9853**, **172×320**, 4-wire SPI, RGB565 path in practice |
| Touch | **AXS5106L**, I2C (+ RST/INT) |
| LVGL integration | Waveshare IDF demo pattern: `bsp_display_init` / `bsp_touch_init` + `app_lvgl_init` / `lvgl_port_*` |
| RAM budget | **512 KB HP SRAM**, **16 KB LP SRAM**, **no onboard PSRAM** — keep LVGL **partial draw buffers**; keep schedule cache **on flash**, not a large in-RAM mirror |
| Flash | **8 MB** in-package; partition for app + NVS + LittleFS data |
| Filesystem | **NVS** = small key/value (sync meta, flags); **LittleFS** = offline agenda blob(s); **do not** pick SPIFFS; **FatFS/TF** only if MVP explicitly needs the TF slot |
| Clock | **SNTP** (`esp_netif_sntp_*`) after Wi-Fi; seed/override with API **`serverTime`** when SNTP is late/unavailable; expect time loss across **power-on reset** |
| HTTPS | **`esp_http_client`** over TLS + **`crt_bundle_attach`** (or pinned `cert_pem`); enable system time before strict cert date checks |

---

## 1. Board silicon and panel

### Waveshare product facts

Official Waveshare materials state:

- MCU: **ESP32-C6FH8**
- Memory on board: **320 KB ROM**, **512 KB HP SRAM**, **16 KB LP SRAM**, **8 MB Flash**
- Display: **1.47" IPS**, **172×320**, **262K** color, driver **JD9853**, **4-wire SPI**
- Touch: capacitive **AXS5106L**, **I2C**
- Also onboard: TF slot (SPI shared with LCD), QMI8658A IMU, battery charge path — out of MVP unless needed

Citations:

- [ESP32-C6-Touch-LCD-1.47 · Waveshare Wiki](https://www.waveshare.com/wiki/ESP32-C6-Touch-LCD-1.47)
- [ESP32-C6-Touch-LCD-1.47 · Waveshare Docs](https://docs.waveshare.com/ESP32-C6-Touch-LCD-1.47)
- [Product page](https://www.waveshare.com/esp32-c6-touch-lcd-1.47.htm) (comparison table shows C6 1.47" Touch with flash **8 MB** and PSRAM blank/`-`, vs S3 sibling with PSRAM)

### Espressif C6FH8 confirmation

ESP32-C6 Series datasheet:

- Series memory: **512 KB HP SRAM**, **16 KB LP SRAM**
- **ESP32-C6FH8**: **8 MB** Quad SPI **in-package flash**
- Datasheet discusses external flash connectivity; it does **not** list in-package PSRAM for FH8. Waveshare’s own marketing likewise omits PSRAM for this board.

Citation: [ESP32-C6 Series Datasheet](https://www.espressif.com/sites/default/files/documentation/esp32-c6_datasheet_en.pdf) (memory / FH8 table).

### Pin map the firmware BSP must own

From Waveshare docs (freeze these GPIO numbers in the firmware module, not rediscuss them in product spec debates):

| Function | GPIO |
| --- | --- |
| LCD SCK / TF SCK | 1 |
| LCD MOSI / TF MOSI | 2 |
| TF MISO | 3 |
| TF CS | 4 |
| LCD CS | 14 |
| LCD DC | 15 |
| LCD RST | 22 |
| LCD backlight | 23 |
| I2C SDA (touch/IMU) | 18 |
| I2C SCL | 19 |
| TP RST | 20 |
| TP INT | 21 |

LCD and TF **share** SPI clock/data — inactive CS must stay deasserted. Touch and IMU share I2C.

Citation: [Peripheral Quick Reference / Pinout · Waveshare Docs](https://docs.waveshare.com/ESP32-C6-Touch-LCD-1.47)

---

## 2. Display / touch / LVGL drivers (ESP-IDF path)

### Official board path

Waveshare documents **Arduino** and **ESP-IDF**. For this MVP stack (**ESP-IDF + LVGL**):

- **ESP-IDF V5.5.0 or above** is required for this board’s IDF examples.
- IDF demos include `01_factory`, `03_lvgl_example`, `04_lvgl_image`.
- Factory init sequence (official snippet) initializes display/touch BSP then LVGL port:

```c
bsp_display_init(&io_handle, &panel_handle, EXAMPLE_LCD_H_RES * EXAMPLE_LCD_DRAW_BUFF_HEIGHT);
bsp_touch_init(&touch_handle, i2c_bus_handle, EXAMPLE_LCD_H_RES, EXAMPLE_LCD_V_RES, EXAMPLE_DISPLAY_ROTATION);
ESP_ERROR_CHECK(app_lvgl_init());
```

That is the first-party pattern to treat as default: **`esp_lcd` panel handle + touch handle + `esp_lvgl_port`**, with a **partial draw buffer** sized as `H_RES * DRAW_BUFF_HEIGHT` (not a full-screen mirror unless RAM is proven free).

Citations:

- [Working with ESP-IDF · Waveshare](https://docs.waveshare.com/ESP32-C6-Touch-LCD-1.47/Development-Environment-Setup-ESP-IDF)
- Same factory snippet on the [Wiki ESP-IDF Demo section](https://www.waveshare.com/wiki/ESP32-C6-Touch-LCD-1.47)

### Arduino path (context only)

Arduino demos use **LVGL v8.4.0**, **GFX_Library_for_Arduino** for the panel, and offline **`esp_lcd_touch_axs5106l`**. Useful as IC confirmation; MVP firmware should still follow the **IDF BSP demos**, not Arduino GFX.

Citation: [Working with Arduino · Waveshare Wiki](https://www.waveshare.com/wiki/ESP32-C6-Touch-LCD-1.47)

### Spec implication

Firmware ownership should absorb Waveshare’s demo BSP (or an equivalent `esp_lcd` JD9853 panel + AXS5106L touch component wired to the pin table above). Product spec only needs to name: **JD9853 + AXS5106L + LVGL via ESP-IDF ≥ 5.5 board demos**.

---

## 3. Memory available for agenda cache

Hard limits:

| Resource | Size | Implication |
| --- | --- | --- |
| HP SRAM | 512 KB | Shared by Wi-Fi, TLS, LVGL, app heaps — **not** a place for a large schedule dump |
| LP SRAM | 16 KB | Not for agenda cache |
| PSRAM | **none** on this board | No “spill LVGL/framebuffers to PSRAM” option |
| Flash | 8 MB | Fit app image + NVS + **LittleFS partition** for offline events |

Full RGB565 framebuffer math: \(172 \times 320 \times 2 = 110\,080\) bytes (~108 KB). Waveshare’s own IDF init passes a **partial** buffer (`H_RES * DRAW_BUFF_HEIGHT`), which is the right default under 512 KB SRAM.

**Recommended cache model for the MVP spec:**

1. Persist a **compact upcoming-events window** on **LittleFS** (normalized JSON or a packed binary).
2. Keep in RAM only what the local alert scheduler needs for the near horizon (small struct array), reload from flash after reboot/offline.
3. Do **not** size the offline cache assuming PSRAM or a multi-megabyte in-RAM calendar.

---

## 4. Filesystem options (NVS / LittleFS / SPIFFS / TF)

ESP-IDF File System Considerations (ESP32-C6):

| Option | Official role | MVP default |
| --- | --- | --- |
| **NVS** | Key/value store; “good choice for configuration data, calibration data, and similar” | Sync cursors, last-success timestamps, feature flags — **not** the event list blob |
| **LittleFS** | Fail-safe, wear-levelling, low RAM; **“recommended choice for general type of application”** | **Offline agenda cache** partition (`littlefs` subtype in partition table) |
| **SPIFFS** | Still documented, but **“not being developed and maintained anymore”** | **Do not use** for new MVP |
| **FatFS** | Best when you need host-visible FAT (e.g. TF card) | Optional; Waveshare TF demos use `esp_vfs_fat_sdspi_mount` and FAT32 cards — only if TF is in scope |

Citations:

- [File System Considerations · ESP-IDF ESP32-C6](https://docs.espressif.com/projects/esp-idf/en/stable/esp32c6/api-guides/file-system-considerations.html)
- [Partition Tables · ESP-IDF](https://docs.espressif.com/projects/esp-idf/en/stable/esp32c6/api-guides/partition-tables.html) (`nvs`, `spiffs` 0x82, `littlefs` 0x83)
- Waveshare TF examples: [ESP-IDF demos](https://docs.waveshare.com/ESP32-C6-Touch-LCD-1.47/Development-Environment-Setup-ESP-IDF) / [Wiki](https://www.waveshare.com/wiki/ESP32-C6-Touch-LCD-1.47)

Compile-time Wi-Fi / API URL / `DEVICE_API_TOKEN` (already decided) do **not** require NVS for secrets in MVP; NVS remains useful for **runtime** sync metadata.

---

## 5. Clock sync: SNTP vs API `serverTime`

### What the silicon/RTC can do

ESP-IDF System Time (ESP32-C6):

- Timekeeping uses **RTC timer** and/or high-resolution timer.
- RTC can persist across many resets **except power-on resets** (RTC timer resets on power-on).
- Preferred sleep accuracy uses an **external 32 kHz crystal**; default is the **internal RC** oscillator with more drift.

Citation: [System Time · ESP-IDF ESP32-C6](https://docs.espressif.com/projects/esp-idf/en/latest/esp32c6/api-reference/system/system_time.html)

### What this board actually wires

Waveshare schematic (`ESP32-C6-Touch-LCD-1.47-Schematic.pdf`) shows the main **40 MHz** crystal (`Y1`) and labels `XTAL_32K_P` / `XTAL_32K_N` on the SoC. On this board those pads are in the GPIO/net region used for battery ADC / SPI (GPIO0/1/2 family) — there is **no evidence of a populated 32 kHz crystal** dedicated to RTC. Treat RTC clock source as **internal RC** unless a later hardware revision proves otherwise.

Schematic: [Waveshare schematic PDF](https://files.waveshare.com/wiki/ESP32-C6-Touch-LCD-1.47/ESP32-C6-Touch-LCD-1.47-Schematic.pdf)

### SNTP (primary)

Official path after Wi-Fi:

- `esp_netif_sntp_init()` with a server such as `pool.ntp.org`
- Optional `esp_netif_sntp_sync_wait()`
- Periodic refresh via `CONFIG_LWIP_SNTP_UPDATE_DELAY` (default one hour)

Citation: same System Time doc; also [ESP-NETIF SNTP Service](https://docs.espressif.com/projects/esp-idf/en/stable/esp32c6/api-reference/network/esp_netif_programming.html)

### Why SNTP is not optional if HTTPS verifies cert dates

ESP-IDF Security Overview: if `CONFIG_MBEDTLS_HAVE_TIME_DATE` is enabled, you need a **time sync mechanism (SNTP)** and trusted certificates. Certificate-bundle verification of “almost all standard TLS servers” is the recommended easy path.

Citation: [Security Overview · ESP-IDF ESP32-C6](https://docs.espressif.com/projects/esp-idf/en/stable/esp32c6/security/security.html)

### Role of API `serverTime`

`settimeofday()` is an officially supported way to set system time (SNTP uses it internally). Spec default:

1. **Primary:** SNTP once associated.
2. **Bootstrap / fallback:** apply API **`serverTime`** (and timezone policy separately) via `settimeofday` when SNTP has not synced yet or fails — enough for local alert scheduling and to unblock TLS date checks in constrained networks.
3. **Do not** rely on RTC alone across unplug/power-on without a fresh SNTP or `serverTime` seed.

---

## 6. HTTPS client on ESP32-C6

ESP HTTP Client on ESP32-C6:

- HTTPS via mbedTLS when URL is `https://` or transport is `HTTP_TRANSPORT_OVER_SSL`
- `CONFIG_ESP_HTTP_CLIENT_ENABLE_HTTPS` **enabled by default**
- Server verification: `cert_pem` **or** `crt_bundle_attach` (ESP x509 Certificate Bundle)

Citation: [ESP HTTP Client · ESP-IDF ESP32-C6](https://docs.espressif.com/projects/esp-idf/en/stable/esp32c6/api-reference/protocols/esp_http_client.html)

Combined with Security Overview: prefer TLS for cloud calls; use the certificate bundle for public API hosts (Cloudflare).

**MVP firmware defaults:**

- Poll schedule API with **`esp_http_client`** over **HTTPS**
- Attach **certificate bundle**
- Send **`DEVICE_API_TOKEN`** as an Authorization bearer (app-level; not a silicon constraint)
- Budget RAM carefully: TLS + Wi-Fi + LVGL share the same **512 KB** HP SRAM (no PSRAM relief)

---

## 7. Out of scope / non-goals from this research

- Implementing firmware or copying Waveshare demo trees into the monorepo
- Choosing OTA layout beyond “HTTPS when/if OTA appears”
- Declaring exact LittleFS partition megabytes (depends on app image size at build time)
- IMU, battery UI, or TF card as MVP features

---

## Primary sources checklist

| Claim area | Source |
| --- | --- |
| Board features, ICs, LVGL claim | [Waveshare Wiki](https://www.waveshare.com/wiki/ESP32-C6-Touch-LCD-1.47), [Waveshare Docs](https://docs.waveshare.com/ESP32-C6-Touch-LCD-1.47) |
| Pins / shared buses | [Waveshare Docs pinout](https://docs.waveshare.com/ESP32-C6-Touch-LCD-1.47) |
| IDF ≥ 5.5 + BSP/LVGL demos | [Waveshare ESP-IDF guide](https://docs.waveshare.com/ESP32-C6-Touch-LCD-1.47/Development-Environment-Setup-ESP-IDF) |
| C6FH8 flash / SRAM | [ESP32-C6 datasheet PDF](https://www.espressif.com/sites/default/files/documentation/esp32-c6_datasheet_en.pdf) |
| No PSRAM on this SKU | Waveshare product comparison + datasheet FH8 flash-only packaging |
| NVS / LittleFS / SPIFFS | [File System Considerations](https://docs.espressif.com/projects/esp-idf/en/stable/esp32c6/api-guides/file-system-considerations.html) |
| SNTP / RTC semantics | [System Time](https://docs.espressif.com/projects/esp-idf/en/latest/esp32c6/api-reference/system/system_time.html) |
| HTTPS client + bundle | [ESP HTTP Client](https://docs.espressif.com/projects/esp-idf/en/stable/esp32c6/api-reference/protocols/esp_http_client.html), [Security Overview](https://docs.espressif.com/projects/esp-idf/en/stable/esp32c6/security/security.html) |
| 40 MHz crystal / 32K nets | [Schematic PDF](https://files.waveshare.com/wiki/ESP32-C6-Touch-LCD-1.47/ESP32-C6-Touch-LCD-1.47-Schematic.pdf) |
