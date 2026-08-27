#include "bsp.h"

#include "esp_heap_caps.h"
#include "esp_log.h"
#include "sdkconfig.h"

static const char *TAG = "bsp";

esp_err_t alerts_bsp_init(void)
{
	ESP_LOGI(TAG, "display init ok (waveshare JD9853 path; copy Waveshare 01_factory BSP for hardware)");
	return ESP_OK;
}

esp_err_t alerts_lvgl_init(void)
{
	ESP_LOGI(TAG, "lvgl port init ok (stub until pr-fw-hmi wires screens)");
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
