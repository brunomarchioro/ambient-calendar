#include "scheduler.h"

#include "esp_log.h"
#include "poll.h"
#include "scheduler_eval.h"
#include "time_seed.h"

static const char *TAG = "sched";

esp_err_t alerts_scheduler_init(void)
{
	if (!alerts_poll_has_schedule()) {
		ESP_LOGI(TAG, "no schedule loaded");
		return ESP_OK;
	}
	const alerts_schedule_t *s = alerts_poll_schedule();
	alerts_hmi_view_t view;
	(void)alerts_scheduler_eval(alerts_time_now_unix(), s, &view);
	ESP_LOGI(TAG, "ready state=%s events=%u", alerts_hmi_state_name(view.state), (unsigned)s->event_count);
	return ESP_OK;
}

esp_err_t alerts_scheduler_tick(alerts_hmi_view_t *view)
{
	const alerts_schedule_t *s;
	if (view == NULL || !alerts_poll_has_schedule()) {
		return ESP_ERR_INVALID_STATE;
	}
	s = alerts_poll_schedule();
	if (alerts_scheduler_eval(alerts_time_now_unix(), s, view) != 0) {
		return ESP_FAIL;
	}
	return ESP_OK;
}
