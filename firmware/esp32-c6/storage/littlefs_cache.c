#include "littlefs_cache.h"

#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/stat.h>
#include <unistd.h>

#include "esp_littlefs.h"
#include "esp_log.h"

static const char *TAG = "littlefs";
static const char *PATH = "/littlefs/schedule.json";

esp_err_t alerts_littlefs_init(void)
{
	esp_vfs_littlefs_conf_t conf = {
		.base_path = "/littlefs",
		.partition_label = "littlefs",
		.format_if_mount_failed = true,
		.dont_mount = false,
	};
	esp_err_t err = esp_vfs_littlefs_register(&conf);
	if (err != ESP_OK) {
		ESP_LOGE(TAG, "mount failed: %s", esp_err_to_name(err));
		return err;
	}
	ESP_LOGI(TAG, "mounted /littlefs");
	return ESP_OK;
}

esp_err_t alerts_littlefs_write_schedule(const char *json, size_t len)
{
	FILE *f;
	size_t n;
	if (json == NULL) {
		return ESP_ERR_INVALID_ARG;
	}
	f = fopen(PATH, "w");
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
	ESP_LOGI(TAG, "littlefs write %s bytes=%u", PATH, (unsigned)len);
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
	if (stat(PATH, &st) != 0 || st.st_size <= 0) {
		ESP_LOGW(TAG, "no cache");
		return ESP_ERR_NOT_FOUND;
	}
	f = fopen(PATH, "r");
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
	ESP_LOGI(TAG, "littlefs read bytes=%u", (unsigned)n);
	return ESP_OK;
}
