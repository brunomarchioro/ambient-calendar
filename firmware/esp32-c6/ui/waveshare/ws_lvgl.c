#include "ws_lvgl.h"

#include "ws_pins.h"
#include "ws_touch.h"

#include "esp_check.h"
#include "esp_log.h"
#include "esp_lvgl_port.h"
#include "lvgl.h"
#include "sdkconfig.h"

static const char *TAG = "ws_lvgl";

static void touch_read_cb(lv_indev_t *indev, lv_indev_data_t *data)
{
	(void)indev;
	uint16_t x = 0;
	uint16_t y = 0;
	if (ws_touch_read_pressed(&x, &y)) {
		data->state = LV_INDEV_STATE_PRESSED;
		data->point.x = (lv_coord_t)x;
		data->point.y = (lv_coord_t)y;
		return;
	}
	data->state = LV_INDEV_STATE_RELEASED;
}

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
		.rotation = {
			.swap_xy = false,
			.mirror_x = false,
			.mirror_y = false,
		},
		.flags = {
			.buff_dma = true,
			.buff_spiram = false,
		},
	};
	lv_display_t *disp = lvgl_port_add_disp(&disp_cfg);
	ESP_RETURN_ON_FALSE(disp != NULL, ESP_FAIL, TAG, "add disp");

	lv_indev_t *indev = lv_indev_create();
	ESP_RETURN_ON_FALSE(indev != NULL, ESP_FAIL, TAG, "indev");
	lv_indev_set_type(indev, LV_INDEV_TYPE_POINTER);
	lv_indev_set_read_cb(indev, touch_read_cb);
	lv_indev_set_display(indev, disp);

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
