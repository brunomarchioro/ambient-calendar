#pragma once

#include "esp_err.h"

/**
 * Start Wi-Fi over the configured Redes Wi-Fi (scan, then priority order; rescans on loss).
 * Waits up to 30 s for an IP: ESP_OK if connected, ESP_ERR_TIMEOUT otherwise (keeps trying in background).
 */
esp_err_t alerts_wifi_start(void);
