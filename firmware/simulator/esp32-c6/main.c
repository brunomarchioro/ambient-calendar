#include "hmi.h"
#include "littlefs_cache.h"
#include "nvs_meta.h"
#include "poll.h"
#include "sim_config.h"
#include "sim_display.h"
#include "time_seed.h"

#include <curl/curl.h>
#include <SDL2/SDL.h>
#include <stdio.h>

#include "esp_log.h"

static const char *TAG = "main";

int main(int argc, char **argv)
{
	sim_config_t cfg;
	Uint32 last_hmi_ms = 0;
	Uint32 last_poll_ms = 0;

	if (sim_config_parse(argc, argv, &cfg) != 0) {
		return 1;
	}
	sim_config_use(&cfg);

	if (curl_global_init(CURL_GLOBAL_DEFAULT) != 0) {
		fprintf(stderr, "sim: curl_global_init failed\n");
		return 1;
	}

	if (alerts_nvs_meta_init() != ESP_OK || alerts_littlefs_init() != ESP_OK || sim_display_init() != ESP_OK ||
	    alerts_time_init() != ESP_OK || alerts_hmi_init() != ESP_OK) {
		curl_global_cleanup();
		return 1;
	}

	if (alerts_poll_load_cache() == ESP_OK) {
		ESP_LOGI(TAG, "boot cache loaded");
	} else {
		ESP_LOGW(TAG, "boot cache miss");
	}

	if (alerts_poll_schedule_once() != ESP_OK) {
		ESP_LOGE(TAG, "initial poll failed — is wrangler dev running?");
		curl_global_cleanup();
		return 1;
	}

	ESP_LOGI(TAG, "controls: click=overlay ←/→=±15min r=poll q=quit");
	last_hmi_ms = SDL_GetTicks();
	last_poll_ms = last_hmi_ms;

	while (!sim_display_wants_quit()) {
		Uint32 now = SDL_GetTicks();
		sim_display_pump();

		if (sim_display_consume_repoll()) {
			(void)alerts_poll_schedule_once();
			last_poll_ms = now;
		}

		if (now - last_hmi_ms >= 1000U) {
			(void)alerts_hmi_loop_once();
			last_hmi_ms = now;
		}

		sim_display_timer_handler();

		if (now - last_poll_ms >= 300000U) {
			(void)alerts_poll_schedule_once();
			last_poll_ms = now;
		}
	}

	curl_global_cleanup();
	return 0;
}
