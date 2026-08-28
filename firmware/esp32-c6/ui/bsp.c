#include "bsp.h"

#include "waveshare/ws_lcd.h"
#include "waveshare/ws_lvgl.h"
#include "waveshare/ws_touch.h"

#include "esp_check.h"
#include "esp_heap_caps.h"
#include "esp_log.h"
#include "esp_lcd_panel_io.h"
#include "esp_lcd_panel_ops.h"
#include "sdkconfig.h"

static const char *TAG = "bsp";

static esp_lcd_panel_io_handle_t s_lcd_io;
static esp_lcd_panel_handle_t s_lcd_panel;

esp_err_t alerts_bsp_init(void)
{
	ESP_RETURN_ON_ERROR(ws_lcd_init(&s_lcd_io, &s_lcd_panel), TAG, "lcd");
	ESP_RETURN_ON_ERROR(ws_lcd_backlight_on(), TAG, "backlight");
	ESP_LOGI(TAG, "display init ok");
	return ESP_OK;
}

esp_err_t alerts_lvgl_init(void)
{
	ESP_RETURN_ON_ERROR(ws_touch_init(), TAG, "touch");
	ESP_RETURN_ON_ERROR(ws_lvgl_start(s_lcd_io, s_lcd_panel), TAG, "lvgl");
	ESP_LOGI(TAG, "lvgl port init ok");
	return ESP_OK;
}

size_t alerts_bsp_log_heap(const char *label)
{
	size_t free_hp = heap_caps_get_free_size(MALLOC_CAP_8BIT);
	ESP_LOGI(TAG, "%s free_heap=%u floor_kb=%d", label, (unsigned)free_hp, CONFIG_ALERTS_HEAP_FLOOR_KB);
	if (free_hp < (size_t)CONFIG_ALERTS_HEAP_FLOOR_KB * 1024U) {
		ESP_LOGW(TAG, "heap below floor");
	}
	return free_hp;
}
