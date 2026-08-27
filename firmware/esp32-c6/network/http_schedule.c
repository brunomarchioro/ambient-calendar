#include "http_schedule.h"

#include <stdlib.h>
#include <string.h>

#include "esp_crt_bundle.h"
#include "esp_http_client.h"
#include "esp_log.h"
#include "sdkconfig.h"

static const char *TAG = "http";

typedef struct {
	char *buf;
	size_t len;
	size_t cap;
	bool overflow;
} acc_t;

static esp_err_t on_http(esp_http_client_event_t *evt)
{
	acc_t *acc = evt->user_data;
	if (evt->event_id != HTTP_EVENT_ON_DATA || acc == NULL || evt->data_len <= 0) {
		return ESP_OK;
	}
	if (acc->overflow) {
		return ESP_OK;
	}
	if (acc->len + (size_t)evt->data_len > acc->cap) {
		acc->overflow = true;
		return ESP_OK;
	}
	memcpy(acc->buf + acc->len, evt->data, (size_t)evt->data_len);
	acc->len += (size_t)evt->data_len;
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
	char url[256];
	char auth[192];
	acc_t acc = {0};
	esp_http_client_config_t cfg;
	esp_http_client_handle_t client;
	esp_err_t err;

	if (out == NULL) {
		return ESP_ERR_INVALID_ARG;
	}
	memset(out, 0, sizeof(*out));
	acc.cap = ALERTS_HTTP_MAX_BODY;
	acc.buf = malloc(acc.cap + 1);
	if (acc.buf == NULL) {
		return ESP_ERR_NO_MEM;
	}

	snprintf(url, sizeof(url), "%s/api/device/schedule", CONFIG_ALERTS_API_BASE_URL);
	snprintf(auth, sizeof(auth), "Bearer %s", CONFIG_ALERTS_DEVICE_API_TOKEN);

	memset(&cfg, 0, sizeof(cfg));
	cfg.url = url;
	cfg.timeout_ms = 20000;
	cfg.buffer_size = 4096;
	cfg.crt_bundle_attach = esp_crt_bundle_attach;
	cfg.event_handler = on_http;
	cfg.user_data = &acc;

	client = esp_http_client_init(&cfg);
	if (client == NULL) {
		free(acc.buf);
		return ESP_FAIL;
	}
	esp_http_client_set_header(client, "Authorization", auth);
	err = esp_http_client_perform(client);
	out->status = esp_http_client_get_status_code(client);
	esp_http_client_cleanup(client);

	if (err != ESP_OK) {
		ESP_LOGE(TAG, "HTTPS failed: %s", esp_err_to_name(err));
		free(acc.buf);
		return err;
	}
	if (acc.overflow) {
		ESP_LOGE(TAG, "HTTPS body overflow status=%d", out->status);
		free(acc.buf);
		return ESP_ERR_NO_MEM;
	}
	acc.buf[acc.len] = '\0';
	out->body = acc.buf;
	out->len = acc.len;
	ESP_LOGI(TAG, "HTTPS %d bytes=%u", out->status, (unsigned)out->len);
	return ESP_OK;
}
