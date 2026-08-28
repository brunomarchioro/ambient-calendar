#include "nvs_meta.h"

#include "esp_log.h"

static const char *TAG = "nvs";

static int s_http;
static size_t s_bytes;
static int64_t s_last_ok;
static bool s_have;

esp_err_t alerts_nvs_meta_init(void)
{
	s_have = false;
	ESP_LOGI(TAG, "nvs meta (in-memory stub)");
	return ESP_OK;
}

esp_err_t alerts_nvs_meta_set_http(int status)
{
	s_http = status;
	s_have = true;
	ESP_LOGI(TAG, "nvs meta http=%d", status);
	return ESP_OK;
}

esp_err_t alerts_nvs_meta_set_ok(int status, size_t bytes, int64_t unix_ok)
{
	s_http = status;
	s_bytes = bytes;
	s_last_ok = unix_ok;
	s_have = true;
	ESP_LOGI(TAG, "nvs meta http=%d bytes=%u last_ok=%lld", status, (unsigned)bytes, (long long)unix_ok);
	return ESP_OK;
}

esp_err_t alerts_nvs_meta_get(int *status, size_t *bytes, int64_t *unix_ok)
{
	if (!s_have) {
		return ESP_ERR_NOT_FOUND;
	}
	if (status) {
		*status = s_http;
	}
	if (bytes) {
		*bytes = s_bytes;
	}
	if (unix_ok) {
		*unix_ok = s_last_ok;
	}
	return ESP_OK;
}
