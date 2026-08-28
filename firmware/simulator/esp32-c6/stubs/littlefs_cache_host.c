#include "littlefs_cache.h"

#include <errno.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/stat.h>

#include "esp_log.h"

static const char *TAG = "littlefs";
static const char *CACHE_DIR = ".cache";
static const char *CACHE_FILE = ".cache/schedule.json";

static esp_err_t ensure_cache_dir(void)
{
	if (mkdir(CACHE_DIR, 0755) != 0 && errno != EEXIST) {
		ESP_LOGE(TAG, "mkdir %s failed", CACHE_DIR);
		return ESP_FAIL;
	}
	return ESP_OK;
}

esp_err_t alerts_littlefs_init(void)
{
	esp_err_t err = ensure_cache_dir();
	if (err == ESP_OK) {
		ESP_LOGI(TAG, "cache dir ready");
	}
	return err;
}

esp_err_t alerts_littlefs_write_schedule(const char *json, size_t len)
{
	FILE *f;
	size_t n;
	if (json == NULL) {
		return ESP_ERR_INVALID_ARG;
	}
	if (ensure_cache_dir() != ESP_OK) {
		return ESP_FAIL;
	}
	f = fopen(CACHE_FILE, "w");
	if (f == NULL) {
		ESP_LOGE(TAG, "open write failed");
		return ESP_FAIL;
	}
	n = fwrite(json, 1, len, f);
	fclose(f);
	if (n != len) {
		ESP_LOGE(TAG, "short write");
		return ESP_FAIL;
	}
	ESP_LOGI(TAG, "cache write bytes=%u", (unsigned)len);
	return ESP_OK;
}

esp_err_t alerts_littlefs_load_schedule(char **json, size_t *len)
{
	FILE *f;
	struct stat st;
	char *buf;
	size_t n;
	if (json == NULL || len == NULL) {
		return ESP_ERR_INVALID_ARG;
	}
	*json = NULL;
	*len = 0;
	if (stat(CACHE_FILE, &st) != 0 || st.st_size <= 0) {
		ESP_LOGW(TAG, "no cache");
		return ESP_ERR_NOT_FOUND;
	}
	f = fopen(CACHE_FILE, "r");
	if (f == NULL) {
		return ESP_FAIL;
	}
	buf = malloc((size_t)st.st_size + 1);
	if (buf == NULL) {
		fclose(f);
		return ESP_ERR_NO_MEM;
	}
	n = fread(buf, 1, (size_t)st.st_size, f);
	fclose(f);
	buf[n] = '\0';
	*json = buf;
	*len = n;
	ESP_LOGI(TAG, "cache read bytes=%u", (unsigned)n);
	return ESP_OK;
}
