#pragma once

#include <stddef.h>

#include "esp_err.h"
#include "esp_lcd_panel_io.h"

/* JD9853 init sequence from Waveshare 01_factory (ST7789 command set). */
typedef struct {
	int cmd;
	const void *data;
	size_t data_bytes;
	unsigned int delay_ms;
} ws_lcd_init_cmd_t;

const ws_lcd_init_cmd_t *ws_jd9853_vendor_init_cmds(void);
size_t ws_jd9853_vendor_init_cmd_count(void);
esp_err_t ws_jd9853_panel_init(esp_lcd_panel_io_handle_t io);
