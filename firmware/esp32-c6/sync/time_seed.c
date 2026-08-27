#include "time_seed.h"

#include <sys/time.h>
#include <time.h>

#include "esp_log.h"
#include "esp_sntp.h"
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"

static const char *TAG = "time";
static bool s_seeded;

static void on_sntp_sync(struct timeval *tv)
{
	(void)tv;
	s_seeded = true;
	ESP_LOGI(TAG, "sntp synced unix=%lld", (long long)alerts_time_now_unix());
}

esp_err_t alerts_time_init(void)
{
	if (esp_sntp_enabled()) {
		return ESP_OK;
	}
	esp_sntp_setoperatingmode(SNTP_OPMODE_POLL);
	esp_sntp_setservername(0, "pool.ntp.org");
	esp_sntp_set_time_sync_notification_cb(on_sntp_sync);
	esp_sntp_init();
	ESP_LOGI(TAG, "sntp started");
	return ESP_OK;
}

bool alerts_time_is_synced(void)
{
	if (s_seeded) {
		return true;
	}
	time_t now = 0;
	time(&now);
	return now > 1704067200;
}

esp_err_t alerts_time_seed_from_unix(int64_t unix_sec)
{
	struct timeval tv = {.tv_sec = unix_sec, .tv_usec = 0};
	if (settimeofday(&tv, NULL) != 0) {
		ESP_LOGE(TAG, "settimeofday failed");
		return ESP_FAIL;
	}
	if (!alerts_time_is_synced()) {
		s_seeded = true;
	}
	ESP_LOGI(TAG, "seed unix=%lld", (long long)unix_sec);
	return ESP_OK;
}

int64_t alerts_time_now_unix(void)
{
	time_t now = 0;
	time(&now);
	return (int64_t)now;
}
