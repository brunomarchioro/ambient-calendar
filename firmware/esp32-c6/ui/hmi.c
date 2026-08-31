#include "hmi.h"

#include "hmi_dismiss.h"
#include "hmi_lvgl.h"
#include "poll.h"
#include "time_seed.h"
#include "waveshare/ws_lvgl.h"

#include "esp_check.h"
#include "esp_log.h"
#include "lvgl.h"

static const char *TAG = "hmi";

#define HMI_LVGL_LOCK_MS UINT32_MAX

static alerts_hmi_present_t s_present;
static alerts_hmi_frame_t s_frame;

static int build_frame(void)
{
	const alerts_schedule_t *schedule = alerts_poll_current();
	if (alerts_hmi_build_frame(alerts_time_now_unix(), schedule, &s_present, &s_frame) != 0) {
		return -1;
	}
	s_frame.schedule_loaded_at_unix = alerts_poll_loaded_at_unix();
	return 0;
}

static esp_err_t hmi_paint(int elapsed_ms, bool lvgl_already_locked)
{
	alerts_hmi_present_tick(&s_present, elapsed_ms);
	if (build_frame() != 0) {
		return ESP_FAIL;
	}

	if (!lvgl_already_locked && !alerts_lvgl_lock(HMI_LVGL_LOCK_MS)) {
		return ESP_FAIL;
	}
	esp_err_t err = alerts_hmi_lvgl_render(&s_frame);
	if (err == ESP_OK) {
		lv_refr_now(lv_display_get_default());
	}
	if (!lvgl_already_locked) {
		alerts_lvgl_unlock();
	}
	if (err != ESP_OK) {
		return err;
	}

	ESP_LOGD(TAG, "state=%s focus=%s sec=%d overlay=%d ambient=%u", alerts_hmi_state_name(s_frame.state),
		 s_frame.has_focus ? s_frame.focus.title : "-", s_frame.has_secondary, s_frame.overlay_open,
		 (unsigned)s_frame.ambient_list_count);
	return ESP_OK;
}

esp_err_t alerts_hmi_init(void)
{
	alerts_hmi_present_init(&s_present);
	ESP_RETURN_ON_ERROR(alerts_hmi_dismiss_init(), TAG, "dismiss init");
	if (!alerts_lvgl_lock(HMI_LVGL_LOCK_MS)) {
		return ESP_FAIL;
	}
	esp_err_t err = alerts_hmi_lvgl_init();
	alerts_lvgl_unlock();
	if (err != ESP_OK) {
		return err;
	}
	alerts_hmi_lvgl_set_background_tap_cb(alerts_hmi_on_background_tap);
	alerts_hmi_lvgl_set_dismiss_tap_cb(alerts_hmi_on_dismiss_tap);
	ESP_LOGI(TAG, "hmi init");
	return ESP_OK;
}

esp_err_t alerts_hmi_loop_once(void)
{
	return hmi_paint(1000, false);
}

void alerts_hmi_on_background_tap(void)
{
	if (build_frame() != 0) {
		return;
	}
	alerts_hmi_present_tap(&s_present, &s_frame);
	ESP_LOGI(TAG, "tap overlay=%d", s_present.overlay_open);
	(void)hmi_paint(0, true);
}

void alerts_hmi_on_dismiss_tap(void)
{
	if (build_frame() != 0) {
		return;
	}
	if (alerts_hmi_dismiss_focus(s_frame.now_unix, &s_frame) == 0) {
		ESP_LOGI(TAG, "dismiss focus id=%s", s_frame.focus.id);
	}
	(void)hmi_paint(0, true);
}
