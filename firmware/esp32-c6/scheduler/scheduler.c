#include "scheduler.h"

#include "esp_log.h"
#include "poll.h"

static const char *TAG = "sched";

esp_err_t alerts_scheduler_init(void)
{
	if (!alerts_poll_has_schedule()) {
		ESP_LOGI(TAG, "no schedule loaded");
		return ESP_OK;
	}
	const alerts_schedule_t *s = alerts_poll_schedule();
	ESP_LOGI(TAG, "ready events=%u reminder=%d show=%d tz=%s",
		(unsigned)s->event_count, s->reminder_minutes, s->show_next_events, s->timezone);
	return ESP_OK;
}
