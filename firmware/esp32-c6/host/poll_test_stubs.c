#include "poll_test_stubs.h"

#define _POSIX_C_SOURCE 200809L

#include <stdlib.h>
#include <string.h>

#include "esp_err.h"
#include "http_schedule.h"
#include "littlefs_cache.h"
#include "nvs_meta.h"
#include "time_seed.h"

static char *s_cache;
static size_t s_cache_len;

static struct {
	esp_err_t transport_err;
	int status;
	char *body;
} s_http;

static bool s_time_synced;
static bool s_time_seed_called;

void poll_test_reset(void)
{
	free(s_cache);
	s_cache = NULL;
	s_cache_len = 0;
	free(s_http.body);
	s_http.body = NULL;
	s_http.status = 0;
	s_http.transport_err = ESP_OK;
	s_time_synced = false;
	s_time_seed_called = false;
}

void poll_test_seed_cache(const char *json)
{
	free(s_cache);
	s_cache_len = strlen(json);
	s_cache = malloc(s_cache_len + 1);
	memcpy(s_cache, json, s_cache_len + 1);
}

void poll_test_set_http(int status, const char *body)
{
	free(s_http.body);
	s_http.transport_err = ESP_OK;
	s_http.status = status;
	s_http.body = body != NULL ? strdup(body) : NULL;
}

void poll_test_set_http_transport_fail(void)
{
	s_http.transport_err = ESP_FAIL;
}

bool poll_test_time_seed_was_called(void)
{
	return s_time_seed_called;
}

void poll_test_set_time_synced(bool synced)
{
	s_time_synced = synced;
}

esp_err_t alerts_littlefs_init(void)
{
	return ESP_OK;
}

esp_err_t alerts_littlefs_write_schedule(const char *json, size_t len)
{
	free(s_cache);
	s_cache = malloc(len + 1);
	if (s_cache == NULL) {
		return ESP_ERR_NO_MEM;
	}
	memcpy(s_cache, json, len);
	s_cache[len] = '\0';
	s_cache_len = len;
	return ESP_OK;
}

esp_err_t alerts_littlefs_load_schedule(char **json, size_t *len)
{
	if (s_cache == NULL) {
		return ESP_ERR_NOT_FOUND;
	}
	char *copy = malloc(s_cache_len + 1);
	if (copy == NULL) {
		return ESP_ERR_NO_MEM;
	}
	memcpy(copy, s_cache, s_cache_len + 1);
	*json = copy;
	*len = s_cache_len;
	return ESP_OK;
}

void alerts_http_body_free(alerts_http_body_t *body)
{
	if (body == NULL) {
		return;
	}
	free(body->body);
	body->body = NULL;
	body->len = 0;
}

esp_err_t alerts_http_get_schedule(alerts_http_body_t *out)
{
	if (out == NULL) {
		return ESP_ERR_INVALID_ARG;
	}
	if (s_http.transport_err != ESP_OK) {
		return s_http.transport_err;
	}
	memset(out, 0, sizeof(*out));
	out->status = s_http.status;
	if (s_http.body != NULL) {
		out->len = strlen(s_http.body);
		out->body = strdup(s_http.body);
		if (out->body == NULL) {
			return ESP_ERR_NO_MEM;
		}
	}
	return ESP_OK;
}

esp_err_t alerts_nvs_meta_init(void)
{
	return ESP_OK;
}

esp_err_t alerts_nvs_meta_set_http(int status)
{
	(void)status;
	return ESP_OK;
}

esp_err_t alerts_nvs_meta_set_ok(int status, size_t bytes, int64_t unix_ok)
{
	(void)status;
	(void)bytes;
	(void)unix_ok;
	return ESP_OK;
}

esp_err_t alerts_time_init(void)
{
	return ESP_OK;
}

bool alerts_time_is_synced(void)
{
	return s_time_synced;
}

esp_err_t alerts_time_seed_from_unix(int64_t unix_sec)
{
	(void)unix_sec;
	s_time_seed_called = true;
	s_time_synced = true;
	return ESP_OK;
}

int64_t alerts_time_now_unix(void)
{
	return 0;
}
