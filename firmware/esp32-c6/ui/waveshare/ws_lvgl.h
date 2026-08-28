#pragma once

#include <stdbool.h>

#include "esp_err.h"
#include "esp_lcd_panel_io.h"
#include "esp_lcd_panel_ops.h"

esp_err_t ws_lvgl_start(esp_lcd_panel_io_handle_t io, esp_lcd_panel_handle_t panel);
bool alerts_lvgl_lock(int timeout_ms);
void alerts_lvgl_unlock(void);
