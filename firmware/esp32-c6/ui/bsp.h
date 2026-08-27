#pragma once

#include "esp_err.h"

esp_err_t alerts_bsp_init(void);
esp_err_t alerts_lvgl_init(void);
size_t alerts_bsp_log_heap(const char *label);
