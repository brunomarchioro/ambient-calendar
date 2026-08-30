#include "poll.h"

#include <stdlib.h>
#include <string.h>

#include "esp_log.h"
#include "http_schedule.h"
#include "littlefs_cache.h"
#include "nvs_meta.h"
#include "schedule_parse.h"
#include "time_seed.h"

static const char *TAG = "poll";

static alerts_schedule_t s_schedule;
static bool s_have_schedule;
static int64_t s_loaded_at_unix;

static esp_err_t load_cache(void)
{
	char *json = NULL;
	size_t len = 0;
	int err;
	esp_err_t e = alerts_littlefs_load_schedule(&json, &len);
	if (e != ESP_OK) {
		return e;
	}
	err = alerts_schedule_parse(json, len, &s_schedule);
	free(json);
	if (err != ALERTS_PARSE_OK) {
		ESP_LOGE(TAG, "cache parse: %s", alerts_schedule_parse_strerror(err));
		return ESP_FAIL;
	}
	s_have_schedule = true;
	ESP_LOGI(TAG, "cache events=%u", (unsigned)s_schedule.event_count);
	return ESP_OK;
}

const alerts_schedule_t *alerts_poll_current(void)
{
	if (!s_have_schedule) {
		(void)load_cache();
	}
	return s_have_schedule ? &s_schedule : NULL;
}

int64_t alerts_poll_loaded_at_unix(void)
{
	return s_loaded_at_unix;
}

esp_err_t alerts_poll_refresh(void)
{
	alerts_http_body_t body = {0};
	esp_err_t err = alerts_http_get_schedule(&body);
	if (err != ESP_OK) {
		ESP_LOGE(TAG, "HTTPS transport failed");
		return err;
	}

	(void)alerts_nvs_meta_set_http(body.status);

	if (body.status == 200 && body.body != NULL && body.len > 0) {
		alerts_schedule_t parsed;
		int perr = alerts_schedule_parse(body.body, body.len, &parsed);
		if (perr != ALERTS_PARSE_OK) {
			ESP_LOGE(TAG, "parse: %s", alerts_schedule_parse_strerror(perr));
			alerts_http_body_free(&body);
			return ESP_FAIL;
		}
		err = alerts_littlefs_write_schedule(body.body, body.len);
		if (err != ESP_OK) {
			alerts_http_body_free(&body);
			return err;
		}
		s_schedule = parsed;
		s_have_schedule = true;
		if (alerts_time_is_synced()) {
			s_loaded_at_unix = alerts_time_now_unix();
		} else if (parsed.server_unix > 0) {
			s_loaded_at_unix = parsed.server_unix;
		}
		if (!alerts_time_is_synced() && parsed.server_unix > 0) {
			(void)alerts_time_seed_from_unix(parsed.server_unix);
		}
		(void)alerts_nvs_meta_set_ok(body.status, body.len, parsed.server_unix);
		ESP_LOGI(TAG, "poll ok events=%u", (unsigned)parsed.event_count);
		alerts_http_body_free(&body);
		return ESP_OK;
	}

	if (body.status == 401) {
		ESP_LOGW(TAG, "poll unauthorized; cache kept");
		alerts_http_body_free(&body);
		return ESP_ERR_INVALID_STATE;
	}

	ESP_LOGW(TAG, "poll http=%d; cache kept", body.status);
	alerts_http_body_free(&body);
	return ESP_FAIL;
}

#ifdef ALERTS_POLL_HOST_TEST
void alerts_poll_reset(void)
{
	memset(&s_schedule, 0, sizeof(s_schedule));
	s_have_schedule = false;
	s_loaded_at_unix = 0;
}
#endif
