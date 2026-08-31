#include "hmi_dismiss.h"

#include <string.h>

#ifndef ALERTS_HMI_DISMISS_HOST
#include "esp_log.h"
#include "nvs.h"
#endif

#ifndef ALERTS_HMI_DISMISS_HOST
static const char *TAG = "hmi_dismiss";
static const char *NS = "hmi";
static const char *KEY = "dismiss";
#endif

#define HMI_DISMISS_MAX 4

typedef struct {
	char id[ALERTS_ID_LEN];
	int64_t dismissed_at_unix;
	int64_t end_at_unix;
} hmi_dismiss_entry_t;

typedef struct {
	hmi_dismiss_entry_t entries[HMI_DISMISS_MAX];
} hmi_dismiss_store_t;

static hmi_dismiss_store_t s_store;

static int64_t event_end_at(const alerts_event_t *e)
{
	if (e->has_end && e->end_unix > e->start_unix) {
		return e->end_unix;
	}
	return e->start_unix + 120;
}

static void store_clear_slot(hmi_dismiss_entry_t *e)
{
	memset(e, 0, sizeof(*e));
}

#ifdef ALERTS_HMI_DISMISS_HOST

void alerts_hmi_dismiss_host_reset(void)
{
	memset(&s_store, 0, sizeof(s_store));
}

esp_err_t alerts_hmi_dismiss_init(void)
{
	alerts_hmi_dismiss_host_reset();
	return ESP_OK;
}

static esp_err_t store_save(void)
{
	return ESP_OK;
}

#else

esp_err_t alerts_hmi_dismiss_init(void)
{
	nvs_handle_t h;
	esp_err_t err = nvs_open(NS, NVS_READONLY, &h);
	if (err == ESP_ERR_NVS_NOT_FOUND) {
		memset(&s_store, 0, sizeof(s_store));
		return ESP_OK;
	}
	if (err != ESP_OK) {
		return err;
	}
	size_t len = sizeof(s_store);
	err = nvs_get_blob(h, KEY, &s_store, &len);
	nvs_close(h);
	if (err == ESP_ERR_NVS_NOT_FOUND) {
		memset(&s_store, 0, sizeof(s_store));
		return ESP_OK;
	}
	if (err != ESP_OK) {
		ESP_LOGW(TAG, "dismiss load: %s", esp_err_to_name(err));
		memset(&s_store, 0, sizeof(s_store));
	}
	return ESP_OK;
}

static esp_err_t store_save(void)
{
	nvs_handle_t h;
	esp_err_t err = nvs_open(NS, NVS_READWRITE, &h);
	if (err != ESP_OK) {
		return err;
	}
	err = nvs_set_blob(h, KEY, &s_store, sizeof(s_store));
	if (err == ESP_OK) {
		err = nvs_commit(h);
	}
	nvs_close(h);
	return err;
}

#endif

void alerts_hmi_dismiss_expire(int64_t now_unix)
{
	for (int i = 0; i < HMI_DISMISS_MAX; i++) {
		hmi_dismiss_entry_t *e = &s_store.entries[i];
		if (e->id[0] == '\0') {
			continue;
		}
		if (now_unix >= e->end_at_unix) {
			store_clear_slot(e);
		}
	}
	(void)store_save();
}

bool alerts_hmi_dismiss_blocks_now(const alerts_event_t *e, int64_t now_unix)
{
	if (e == NULL) {
		return false;
	}
	for (int i = 0; i < HMI_DISMISS_MAX; i++) {
		const hmi_dismiss_entry_t *d = &s_store.entries[i];
		if (d->id[0] == '\0') {
			continue;
		}
		if (strcmp(d->id, e->id) != 0) {
			continue;
		}
		if (now_unix >= d->end_at_unix) {
			return false;
		}
		return now_unix >= d->dismissed_at_unix;
	}
	return false;
}

esp_err_t alerts_hmi_dismiss_record(const alerts_event_t *e, int64_t dismissed_at_unix)
{
	if (e == NULL || e->id[0] == '\0') {
		return ESP_ERR_INVALID_ARG;
	}

	hmi_dismiss_entry_t *slot = NULL;
	for (int i = 0; i < HMI_DISMISS_MAX; i++) {
		if (s_store.entries[i].id[0] == '\0') {
			slot = &s_store.entries[i];
			break;
		}
		if (strcmp(s_store.entries[i].id, e->id) == 0) {
			slot = &s_store.entries[i];
			break;
		}
	}
	if (slot == NULL) {
		slot = &s_store.entries[0];
	}

	strncpy(slot->id, e->id, sizeof(slot->id) - 1);
	slot->id[sizeof(slot->id) - 1] = '\0';
	slot->dismissed_at_unix = dismissed_at_unix;
	slot->end_at_unix = event_end_at(e);
#ifndef ALERTS_HMI_DISMISS_HOST
	ESP_LOGI(TAG, "dismiss id=%s at=%lld until=%lld", slot->id, (long long)dismissed_at_unix,
		 (long long)slot->end_at_unix);
#endif
	return store_save();
}
