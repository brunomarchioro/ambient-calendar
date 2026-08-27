# Constraints ESP32-C6 + Waveshare 1.47"

Type: research
Status: resolved
Blocked by:

## Question

Para firmware **ESP-IDF + LVGL** no Waveshare ESP32-C6 Touch LCD 1.47", quais fatos de hardware/docs oficiais a spec do MVP precisa fixar: driver de display/touch, memória disponível para cache de agenda, opções de filesystem (NVS/LittleFS/SPIFFS), sincronização de relógio (SNTP vs uso de `serverTime` da API), e HTTPS client no C6?

Saída: restrições e defaults recomendados que a spec de firmware possa copiar sem rediscutir o silício.

## Answer

Freeze: JD9853 (SPI 172×320) + AXS5106L (I2C) via Waveshare ESP-IDF BSP/LVGL demos (IDF ≥ 5.5); 512 KB HP SRAM / 8 MB flash / sem PSRAM — cache de agenda em LittleFS, NVS só para meta; SNTP primário + `serverTime` como seed/fallback; HTTPS com `esp_http_client` + certificate bundle.

Findings: [docs/research/esp32-c6-waveshare-constraints.md](../../../docs/research/esp32-c6-waveshare-constraints.md)
