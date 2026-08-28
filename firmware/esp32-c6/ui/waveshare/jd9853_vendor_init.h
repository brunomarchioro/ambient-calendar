#pragma once

#include "esp_lcd_panel_vendor.h"

/* JD9853 init sequence from Waveshare 01_factory (ST7789 command set). */
const esp_lcd_panel_vendor_init_cmd_t *ws_jd9853_vendor_init_cmds(void);
size_t ws_jd9853_vendor_init_cmd_count(void);
