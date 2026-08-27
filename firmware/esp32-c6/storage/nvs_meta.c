#include "nvs_meta.h"

#include "esp_log.h"
#include "nvs.h"
#include "nvs_flash.h"

static const char *TAG = "nvs";
static const char *NS = "sync";

esp_err_t alerts_nvs_meta_init(void)
{
	esp_err_t err = nvs_flash_init();
	if (err == ESP_ERR_NVS_NO_FREE_PAGES || err == ESP_ERR_NVS_NEW_VERSION_FOUND) {
		ESP_ERROR_CHECK(nvs_flash_erase());
		err = nvs_flash_init();
	}
	return err;
}

static esp_err_t open_rw(nvs_handle_t *h)
{
	return nvs_open(NS, NVS_READWRITE, h);
}

esp_err_t alerts_nvs_meta_set_http(int status)
{
	nvs_handle_t h;
	esp_err_t err = open_rw(&h);
	if (err != ESP_OK) {
		return err;
	}
	err = nvs_set_i32(h, "http", status);
	if (err == ESP_OK) {
		err = nvs_commit(h);
	}
	nvs_close(h);
	ESP_LOGI(TAG, "nvs meta http=%d", status);
	return err;
}

esp_err_t alerts_nvs_meta_set_ok(int status, size_t bytes, int64_t unix_ok)
{
	nvs_handle_t h;
	esp_err_t err = open_rw(&h);
	if (err != ESP_OK) {
		return err;
	}
	if (err == ESP_OK) {
		err = nvs_set_i32(h, "http", status);
	}
	if (err == ESP_OK) {
		err = nvs_set_u32(h, "bytes", (uint32_t)bytes);
	}
	if (err == ESP_OK) {
		err = nvs_set_i64(h, "last_ok", unix_ok);
	}
	if (err == ESP_OK) {
		err = nvs_commit(h);
	}
	nvs_close(h);
	ESP_LOGI(TAG, "nvs meta http=%d bytes=%u last_ok=%lld", status, (unsigned)bytes, (long long)unix_ok);
	return err;
}

esp_err_t alerts_nvs_meta_get(int *status, size_t *bytes, int64_t *unix_ok)
{
	nvs_handle_t h;
	int32_t http = 0;
	uint32_t n = 0;
	int64_t ok = 0;
	esp_err_t err = nvs_open(NS, NVS_READONLY, &h);
	if (err != ESP_OK) {
		return err;
	}
	err = nvs_get_i32(h, "http", &http);
	if (err == ESP_OK) {
		err = nvs_get_u32(h, "bytes", &n);
	}
	if (err == ESP_OK) {
		err = nvs_get_i64(h, "last_ok", &ok);
	}
	nvs_close(h);
	if (err != ESP_OK) {
		return err;
	}
	if (status) {
		*status = (int)http;
	}
	if (bytes) {
		*bytes = n;
	}
	if (unix_ok) {
		*unix_ok = ok;
	}
	return ESP_OK;
}
