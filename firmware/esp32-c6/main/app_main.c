#include "bsp.h"
#include "esp_log.h"
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"
#include "littlefs_cache.h"
#include "nvs_meta.h"
#include "poll.h"
#include "scheduler.h"
#include "sdkconfig.h"
#include "time_seed.h"
#include "wifi.h"

static const char *TAG = "main";

static void log_nvs_meta(void)
{
	int status = 0;
	size_t bytes = 0;
	int64_t last_ok = 0;
	if (alerts_nvs_meta_get(&status, &bytes, &last_ok) == ESP_OK) {
		ESP_LOGI(TAG, "nvs meta http=%d bytes=%u last_ok=%lld", status, (unsigned)bytes, (long long)last_ok);
	}
}

void app_main(void)
{
	ESP_LOGI(TAG, "alerts esp32-c6 platform boot");
	ESP_ERROR_CHECK(alerts_nvs_meta_init());
	ESP_ERROR_CHECK(alerts_littlefs_init());
	ESP_ERROR_CHECK(alerts_bsp_init());
	ESP_ERROR_CHECK(alerts_lvgl_init());
	ESP_ERROR_CHECK(alerts_time_init());

	if (alerts_poll_load_cache() == ESP_OK) {
		ESP_LOGI(TAG, "boot cache loaded");
	} else {
		ESP_LOGW(TAG, "boot cache miss");
	}
	log_nvs_meta();

	ESP_ERROR_CHECK(alerts_wifi_start());
	(void)alerts_poll_schedule_once();
	ESP_ERROR_CHECK(alerts_scheduler_init());
	alerts_bsp_log_heap("after first poll");

	for (;;) {
		vTaskDelay(pdMS_TO_TICKS(CONFIG_ALERTS_POLL_INTERVAL_S * 1000));
		(void)alerts_poll_schedule_once();
	}
}
