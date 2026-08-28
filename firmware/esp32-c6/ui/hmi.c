#include "hmi.h"

#include "hmi_lvgl.h"
#include "poll.h"
#include "time_seed.h"
#include "waveshare/ws_lvgl.h"

#include "esp_log.h"

static const char *TAG = "hmi";

#define HMI_LVGL_LOCK_MS UINT32_MAX

static alerts_hmi_present_t s_present;

static esp_err_t hmi_paint(int elapsed_ms)
{
	alerts_hmi_frame_t frame;
	const alerts_schedule_t *schedule = alerts_poll_current();

	alerts_hmi_present_tick(&s_present, elapsed_ms);
	if (alerts_hmi_build_frame(alerts_time_now_unix(), schedule, &s_present, &frame) != 0) {
		return ESP_FAIL;
	}

	if (!alerts_lvgl_lock(HMI_LVGL_LOCK_MS)) {
		return ESP_FAIL;
	}
	esp_err_t err = alerts_hmi_lvgl_render(&frame);
	alerts_lvgl_unlock();
	if (err != ESP_OK) {
		return err;
	}

	ESP_LOGD(TAG, "state=%s focus=%s overlay=%d ambient=%u overlay_list=%u", alerts_hmi_state_name(frame.state),
		 frame.has_focus ? frame.focus.title : "-", frame.overlay_open, (unsigned)frame.ambient_list_count,
		 (unsigned)frame.overlay_list_count);
	return ESP_OK;
}

esp_err_t alerts_hmi_init(void)
{
	alerts_hmi_present_init(&s_present);
	if (!alerts_lvgl_lock(HMI_LVGL_LOCK_MS)) {
		return ESP_FAIL;
	}
	esp_err_t err = alerts_hmi_lvgl_init();
	alerts_lvgl_unlock();
	if (err != ESP_OK) {
		return err;
	}
	alerts_hmi_lvgl_set_tap_cb(alerts_hmi_on_short_tap);
	ESP_LOGI(TAG, "hmi init (lvgl screens wired in ui/hmi_lvgl.c on device)");
	return ESP_OK;
}

esp_err_t alerts_hmi_loop_once(void)
{
	return hmi_paint(1000);
}

void alerts_hmi_on_short_tap(void)
{
	alerts_hmi_present_tap(&s_present);
	(void)hmi_paint(0);
}
