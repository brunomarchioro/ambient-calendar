#include "bsp.h"
#include "esp_log.h"
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"
#include "hmi.h"
#include "littlefs_cache.h"
#include "nvs_meta.h"
#include "poll.h"
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
	ESP_LOGI(TAG, "alerts esp32-c6 hmi boot");
	ESP_ERROR_CHECK(alerts_nvs_meta_init());
	ESP_ERROR_CHECK(alerts_littlefs_init());
	ESP_ERROR_CHECK(alerts_bsp_init());
	ESP_ERROR_CHECK(alerts_lvgl_init());
	ESP_ERROR_CHECK(alerts_hmi_init());
	ESP_ERROR_CHECK(alerts_time_init());

	if (alerts_poll_current() != NULL) {
		ESP_LOGI(TAG, "boot cache loaded");
	} else {
		ESP_LOGW(TAG, "boot cache miss");
	}
	log_nvs_meta();

	ESP_ERROR_CHECK(alerts_wifi_start());
	(void)alerts_poll_refresh();
	alerts_bsp_log_heap("after first poll");

	int poll_countdown = 0;
	for (;;) {
		(void)alerts_hmi_loop_once();
		vTaskDelay(pdMS_TO_TICKS(1000));
		if (++poll_countdown >= CONFIG_ALERTS_POLL_INTERVAL_S) {
			poll_countdown = 0;
			(void)alerts_poll_refresh();
		}
	}
}
