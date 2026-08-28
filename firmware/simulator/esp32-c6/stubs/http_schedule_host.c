#include "http_schedule.h"

#include <curl/curl.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#include "esp_log.h"
#include "sim_config.h"

static const char *TAG = "http";

typedef struct {
	char *buf;
	size_t len;
	size_t cap;
} acc_t;

static size_t on_write(void *ptr, size_t size, size_t nmemb, void *userdata)
{
	acc_t *acc = userdata;
	size_t n = size * nmemb;
	if (acc->len + n > acc->cap) {
		return 0;
	}
	memcpy(acc->buf + acc->len, ptr, n);
	acc->len += n;
	return n;
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
	char url[320];
	char auth[224];
	acc_t acc = {0};
	CURL *curl;
	CURLcode code;
	long status = 0;

	if (out == NULL) {
		return ESP_ERR_INVALID_ARG;
	}
	memset(out, 0, sizeof(*out));
	acc.cap = ALERTS_HTTP_MAX_BODY;
	acc.buf = malloc(acc.cap + 1);
	if (acc.buf == NULL) {
		return ESP_ERR_NO_MEM;
	}

	snprintf(url, sizeof(url), "%s/api/device/schedule", g_sim_config.api_base_url);
	snprintf(auth, sizeof(auth), "Bearer %s", g_sim_config.device_token);

	curl = curl_easy_init();
	if (curl == NULL) {
		free(acc.buf);
		return ESP_FAIL;
	}

	char header_auth[256];
	struct curl_slist *headers = NULL;
	snprintf(header_auth, sizeof(header_auth), "Authorization: %s", auth);
	headers = curl_slist_append(headers, header_auth);

	curl_easy_setopt(curl, CURLOPT_URL, url);
	curl_easy_setopt(curl, CURLOPT_HTTPHEADER, headers);
	curl_easy_setopt(curl, CURLOPT_WRITEFUNCTION, on_write);
	curl_easy_setopt(curl, CURLOPT_WRITEDATA, &acc);
	curl_easy_setopt(curl, CURLOPT_TIMEOUT, 20L);
	curl_easy_setopt(curl, CURLOPT_FOLLOWLOCATION, 1L);

	code = curl_easy_perform(curl);
	curl_easy_getinfo(curl, CURLINFO_RESPONSE_CODE, &status);
	curl_slist_free_all(headers);
	curl_easy_cleanup(curl);

	if (code != CURLE_OK) {
		ESP_LOGE(TAG, "curl: %s", curl_easy_strerror(code));
		free(acc.buf);
		return ESP_FAIL;
	}

	acc.buf[acc.len] = '\0';
	out->status = (int)status;
	out->body = acc.buf;
	out->len = acc.len;
	ESP_LOGI(TAG, "HTTPS %ld bytes=%u", status, (unsigned)acc.len);
	return ESP_OK;
}
