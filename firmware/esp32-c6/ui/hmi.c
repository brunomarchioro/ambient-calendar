#include "hmi.h"

#include "hmi_lvgl.h"
#include "poll.h"
#include "time_seed.h"
#include "waveshare/ws_lvgl.h"

#include "esp_log.h"

static const char *TAG = "hmi";

#define HMI_LVGL_LOCK_MS UINT32_MAX
#define HMI_OVERLAY_TIMEOUT_MS 15000

typedef struct {
	bool open;
	int elapsed_ms;
} hmi_overlay_t;

static hmi_overlay_t s_overlay;

static const alerts_schedule_t *resolve_schedule(void)
{
	if (!alerts_poll_has_schedule()) {
		(void)alerts_poll_load_cache();
	}
	if (!alerts_poll_has_schedule()) {
		return NULL;
	}
	return alerts_poll_schedule();
}

static esp_err_t hmi_paint(int elapsed_ms)
{
	if (s_overlay.open && elapsed_ms > 0) {
		s_overlay.elapsed_ms += elapsed_ms;
		if (s_overlay.elapsed_ms >= HMI_OVERLAY_TIMEOUT_MS) {
			s_overlay.open = false;
			s_overlay.elapsed_ms = 0;
			ESP_LOGI(TAG, "overlay timeout 15s");
		}
	}

	alerts_hmi_frame_t frame;
	const alerts_schedule_t *schedule = resolve_schedule();
	if (alerts_hmi_build_frame(alerts_time_now_unix(), schedule, s_overlay.open, &frame) != 0) {
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
	if (!alerts_lvgl_lock(HMI_LVGL_LOCK_MS)) {
		return ESP_FAIL;
	}
	esp_err_t err = alerts_hmi_lvgl_init();
	alerts_lvgl_unlock();
	if (err == ESP_OK) {
		ESP_LOGI(TAG, "hmi init (lvgl screens wired in ui/hmi_lvgl.c on device)");
	}
	return err;
}

esp_err_t alerts_hmi_loop_once(void)
{
	return hmi_paint(1000);
}

void alerts_hmi_on_short_tap(void)
{
	if (s_overlay.open) {
		s_overlay.open = false;
		s_overlay.elapsed_ms = 0;
		ESP_LOGI(TAG, "overlay close tap");
	} else {
		s_overlay.open = true;
		s_overlay.elapsed_ms = 0;
		ESP_LOGI(TAG, "overlay open");
	}
	(void)hmi_paint(0);
}
