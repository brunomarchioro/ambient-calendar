#pragma once

#include "esp_err.h"
#include "esp_lcd_panel_io.h"
#include "esp_lcd_panel_ops.h"

esp_err_t ws_lcd_init(esp_lcd_panel_io_handle_t *out_io, esp_lcd_panel_handle_t *out_panel);
esp_err_t ws_lcd_backlight_on(void);
