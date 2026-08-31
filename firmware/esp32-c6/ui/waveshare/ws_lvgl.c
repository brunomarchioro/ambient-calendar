#include "ws_lvgl.h"

#include "ws_pins.h"
#include "ws_touch.h"

#include "esp_check.h"
#include "esp_log.h"
#include "esp_lvgl_port.h"
#include "lvgl.h"
#include "sdkconfig.h"

static const char *TAG = "ws_lvgl";

esp_err_t ws_lvgl_start(esp_lcd_panel_io_handle_t io, esp_lcd_panel_handle_t panel)
{
	const lvgl_port_cfg_t port_cfg = ESP_LVGL_PORT_INIT_CONFIG();
	ESP_RETURN_ON_ERROR(lvgl_port_init(&port_cfg), TAG, "lvgl port");

	const uint32_t draw_lines = (uint32_t)CONFIG_ALERTS_LVGL_DRAW_LINES;
	const lvgl_port_display_cfg_t disp_cfg = {
		.io_handle = io,
		.panel_handle = panel,
		.buffer_size = WS_LCD_H_RES * draw_lines,
		.double_buffer = true,
		.hres = WS_LCD_H_RES,
		.vres = WS_LCD_V_RES,
		.monochrome = false,
#if LVGL_VERSION_MAJOR >= 9
		.color_format = LV_COLOR_FORMAT_RGB565,
#endif
		.rotation = {
			.swap_xy = false,
			.mirror_x = false,
			.mirror_y = false,
		},
		.flags = {
			.buff_dma = true,
			.buff_spiram = false,
			.swap_bytes = true,
		},
	};
	lv_display_t *disp = lvgl_port_add_disp(&disp_cfg);
	ESP_RETURN_ON_FALSE(disp != NULL, ESP_FAIL, TAG, "add disp");

	ESP_RETURN_ON_ERROR(ws_touch_attach_lvgl(), TAG, "touch lvgl");

	ESP_LOGI(TAG, "lvgl draw_lines=%u buffer_bytes=%u", (unsigned)draw_lines,
		 (unsigned)(WS_LCD_H_RES * draw_lines * sizeof(uint16_t) * 2U));
	return ESP_OK;
}

bool alerts_lvgl_lock(int timeout_ms)
{
	return lvgl_port_lock(timeout_ms);
}

void alerts_lvgl_unlock(void)
{
	lvgl_port_unlock();
}
