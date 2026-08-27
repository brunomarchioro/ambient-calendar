#include "touch.h"

#include "esp_log.h"
#include "sdkconfig.h"

static const char *TAG = "touch";
static bool s_overlay;
static int s_overlay_ms;

esp_err_t alerts_touch_init(void)
{
	ESP_LOGI(TAG, "touch init (no swipe handlers)");
	return ESP_OK;
}

bool alerts_touch_overlay_open(void)
{
	return s_overlay;
}

void alerts_touch_on_short_tap(void)
{
	s_overlay = true;
	s_overlay_ms = 0;
	ESP_LOGI(TAG, "overlay open");
}

void alerts_touch_tick_ms(int elapsed_ms)
{
	if (!s_overlay) {
		return;
	}
	s_overlay_ms += elapsed_ms;
	if (s_overlay_ms >= 15000) {
		s_overlay = false;
		s_overlay_ms = 0;
		ESP_LOGI(TAG, "overlay timeout 15s");
	}
}
