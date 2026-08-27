#include "hmi.h"

#include "esp_log.h"
#include "poll.h"
#include "scheduler.h"
#include "touch.h"

static const char *TAG = "hmi";

esp_err_t alerts_hmi_init(void)
{
	ESP_LOGI(TAG, "hmi init (lvgl screens wired in ui/hmi.c on device)");
	return ESP_OK;
}

esp_err_t alerts_hmi_render(const alerts_hmi_view_t *view, bool overlay_open)
{
	if (view == NULL) {
		return ESP_ERR_INVALID_ARG;
	}
	ESP_LOGI(TAG, "state=%s focus=%s overlay=%d list=%u",
		alerts_hmi_state_name(view->state),
		view->focus ? view->focus->title : "-",
		overlay_open,
		(unsigned)view->list_count);
	return ESP_OK;
}

esp_err_t alerts_hmi_loop_once(void)
{
	alerts_hmi_view_t view;
	bool overlay = alerts_touch_overlay_open();
	if (alerts_scheduler_tick(&view) != ESP_OK) {
		if (alerts_poll_load_cache() == ESP_OK) {
			(void)alerts_scheduler_tick(&view);
		} else {
			view.state = ALERTS_HMI_EMPTY;
		}
	}
	return alerts_hmi_render(&view, overlay);
}
