#include "wifi.h"

#include <string.h>

#include "esp_event.h"
#include "esp_log.h"
#include "esp_netif.h"
#include "esp_wifi.h"
#include "freertos/FreeRTOS.h"
#include "freertos/event_groups.h"
#include "sdkconfig.h"

static const char *TAG = "wifi";
static EventGroupHandle_t s_bits;
static int s_retry;
#define WIFI_OK BIT0
#define WIFI_FAIL BIT1
#define WIFI_MAX_RETRY 10

static void on_wifi_event(void *arg, esp_event_base_t base, int32_t id, void *data)
{
	(void)arg;
	(void)data;
	if (base == WIFI_EVENT && id == WIFI_EVENT_STA_START) {
		esp_wifi_connect();
	} else if (base == WIFI_EVENT && id == WIFI_EVENT_STA_DISCONNECTED) {
		if (s_retry < WIFI_MAX_RETRY) {
			esp_wifi_connect();
			s_retry++;
			ESP_LOGW(TAG, "retry %d", s_retry);
		} else {
			xEventGroupSetBits(s_bits, WIFI_FAIL);
		}
	} else if (base == IP_EVENT && id == IP_EVENT_STA_GOT_IP) {
		ip_event_got_ip_t *event = (ip_event_got_ip_t *)data;
		ESP_LOGI(TAG, "got ip:" IPSTR, IP2STR(&event->ip_info.ip));
		s_retry = 0;
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

	wifi_config_t wifi = {0};
	strncpy((char *)wifi.sta.ssid, CONFIG_ALERTS_WIFI_SSID, sizeof(wifi.sta.ssid) - 1);
	strncpy((char *)wifi.sta.password, CONFIG_ALERTS_WIFI_PASSWORD, sizeof(wifi.sta.password) - 1);
	wifi.sta.threshold.authmode = WIFI_AUTH_WPA2_PSK;
	ESP_ERROR_CHECK(esp_wifi_set_mode(WIFI_MODE_STA));
	ESP_ERROR_CHECK(esp_wifi_set_config(WIFI_IF_STA, &wifi));
	ESP_ERROR_CHECK(esp_wifi_start());

	EventBits_t bits = xEventGroupWaitBits(s_bits, WIFI_OK | WIFI_FAIL, pdFALSE, pdFALSE, pdMS_TO_TICKS(30000));
	if (bits & WIFI_OK) {
		return ESP_OK;
	}
	ESP_LOGE(TAG, "Wi-Fi failed SSID=%s", CONFIG_ALERTS_WIFI_SSID);
	return ESP_FAIL;
}
