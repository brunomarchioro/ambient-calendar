#include "wifi.h"

#include <string.h>

#include "esp_event.h"
#include "esp_log.h"
#include "esp_netif.h"
#include "esp_timer.h"
#include "esp_wifi.h"
#include "freertos/FreeRTOS.h"
#include "freertos/event_groups.h"
#include "wifi_networks.gen.h"
#include "wifi_select.h"

static const char *TAG = "wifi";
static EventGroupHandle_t s_bits;
static esp_timer_handle_t s_rescan_timer;
#define WIFI_OK BIT0
#define WIFI_RETRY_PER_NETWORK 3
#define WIFI_BOOT_WAIT_MS 30000
#define WIFI_RESCAN_US (30LL * 1000 * 1000)
/* ponytail: strongest 20 APs only (scan is RSSI-sorted); raise if a configured network gets cut in dense areas. */
#define WIFI_SCAN_MAX_AP 20

/* Event loop task only, except scan() which the rescan timer also calls. */
static size_t s_candidates[ALERTS_WIFI_NETWORK_COUNT];
static size_t s_n_candidates;
static size_t s_current;
static int s_retry;

static void rescan_later(void)
{
	(void)esp_timer_start_once(s_rescan_timer, WIFI_RESCAN_US);
}

static void scan(void)
{
	esp_err_t err = esp_wifi_scan_start(NULL, false);
	if (err != ESP_OK) {
		ESP_LOGW(TAG, "scan start: %s", esp_err_to_name(err));
		rescan_later();
	}
}

static void on_rescan_timer(void *arg)
{
	(void)arg;
	scan();
}

static void give_up(const char *why)
{
	ESP_LOGW(TAG, "%s; rescan in %llds", why, WIFI_RESCAN_US / 1000000);
	s_n_candidates = 0;
	rescan_later();
}

static void connect_current(void)
{
	const alerts_wifi_network_t *net = &ALERTS_WIFI_NETWORKS[s_candidates[s_current]];
	wifi_config_t cfg = {0};
	strncpy((char *)cfg.sta.ssid, net->ssid, sizeof(cfg.sta.ssid));
	strncpy((char *)cfg.sta.password, net->password, sizeof(cfg.sta.password));
	cfg.sta.threshold.authmode = WIFI_AUTH_WPA2_PSK;
	s_retry = 0;
	ESP_LOGI(TAG, "connecting SSID=%s", net->ssid);
	if (esp_wifi_set_config(WIFI_IF_STA, &cfg) != ESP_OK || esp_wifi_connect() != ESP_OK) {
		give_up("connect start failed");
	}
}

static void on_scan_done(void)
{
	static wifi_ap_record_t recs[WIFI_SCAN_MAX_AP];
	uint16_t n = WIFI_SCAN_MAX_AP;
	if (esp_wifi_scan_get_ap_records(&n, recs) != ESP_OK) {
		n = 0;
	}
	const char *visible[WIFI_SCAN_MAX_AP];
	for (uint16_t i = 0; i < n; i++) {
		visible[i] = (const char *)recs[i].ssid;
	}
	s_n_candidates = alerts_wifi_select(ALERTS_WIFI_NETWORKS, ALERTS_WIFI_NETWORK_COUNT, visible, n, s_candidates);
	if (s_n_candidates == 0) {
		ESP_LOGW(TAG, "no configured network visible (%u APs)", (unsigned)n);
		rescan_later();
		return;
	}
	s_current = 0;
	connect_current();
}

static void on_disconnected(void)
{
	if (xEventGroupClearBits(s_bits, WIFI_OK) & WIFI_OK) {
		ESP_LOGW(TAG, "connection lost; rescanning");
		scan();
	} else if (s_n_candidates == 0) {
		return;
	} else if (++s_retry < WIFI_RETRY_PER_NETWORK) {
		ESP_LOGW(TAG, "retry %d", s_retry);
		if (esp_wifi_connect() != ESP_OK) {
			give_up("connect start failed");
		}
	} else if (++s_current < s_n_candidates) {
		connect_current();
	} else {
		give_up("all visible networks failed");
	}
}

static void on_wifi_event(void *arg, esp_event_base_t base, int32_t id, void *data)
{
	(void)arg;
	if (base == WIFI_EVENT && id == WIFI_EVENT_STA_START) {
		scan();
	} else if (base == WIFI_EVENT && id == WIFI_EVENT_SCAN_DONE) {
		on_scan_done();
	} else if (base == WIFI_EVENT && id == WIFI_EVENT_STA_DISCONNECTED) {
		on_disconnected();
	} else if (base == IP_EVENT && id == IP_EVENT_STA_GOT_IP) {
		ip_event_got_ip_t *event = (ip_event_got_ip_t *)data;
		ESP_LOGI(TAG, "got ip:" IPSTR, IP2STR(&event->ip_info.ip));
		xEventGroupSetBits(s_bits, WIFI_OK);
	}
}

esp_err_t alerts_wifi_start(void)
{
	s_bits = xEventGroupCreate();
	ESP_ERROR_CHECK(esp_netif_init());
	ESP_ERROR_CHECK(esp_event_loop_create_default());
	esp_netif_create_default_wifi_sta();

	wifi_init_config_t cfg = WIFI_INIT_CONFIG_DEFAULT();
	ESP_ERROR_CHECK(esp_wifi_init(&cfg));
	ESP_ERROR_CHECK(esp_event_handler_instance_register(WIFI_EVENT, ESP_EVENT_ANY_ID, &on_wifi_event, NULL, NULL));
	ESP_ERROR_CHECK(esp_event_handler_instance_register(IP_EVENT, IP_EVENT_STA_GOT_IP, &on_wifi_event, NULL, NULL));
	const esp_timer_create_args_t timer = {.callback = on_rescan_timer, .name = "wifi_rescan"};
	ESP_ERROR_CHECK(esp_timer_create(&timer, &s_rescan_timer));

	ESP_ERROR_CHECK(esp_wifi_set_mode(WIFI_MODE_STA));
	ESP_ERROR_CHECK(esp_wifi_start());

	EventBits_t bits = xEventGroupWaitBits(s_bits, WIFI_OK, pdFALSE, pdFALSE, pdMS_TO_TICKS(WIFI_BOOT_WAIT_MS));
	return (bits & WIFI_OK) ? ESP_OK : ESP_ERR_TIMEOUT;
}
