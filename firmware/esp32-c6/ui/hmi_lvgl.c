#include "hmi_lvgl.h"

#include "waveshare/ws_pins.h"

#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <time.h>

#include "esp_log.h"
#include "lvgl.h"

static const char *TAG = "hmi_lvgl";

#define HMI_LIST_SLOTS 5

static const lv_color_t COLOR_BG = LV_COLOR_MAKE(0x12, 0x12, 0x14);
static const lv_color_t COLOR_TEXT = LV_COLOR_MAKE(0xF2, 0xF2, 0xF2);
static const lv_color_t COLOR_MUTED = LV_COLOR_MAKE(0xA8, 0xA8, 0xB0);
static const lv_color_t COLOR_ALERT = LV_COLOR_MAKE(0xFF, 0x8C, 0x42);
static const lv_color_t COLOR_NOW = LV_COLOR_MAKE(0x4C, 0xD9, 0x8F);

typedef struct {
	lv_obj_t *root;
	lv_obj_t *clock_lbl;
	lv_obj_t *date_lbl;
	lv_obj_t *focus_title_lbl;
	lv_obj_t *focus_time_lbl;
	lv_obj_t *countdown_lbl;
	lv_obj_t *state_lbl;
	lv_obj_t *divider;
	lv_obj_t *list_lbl[HMI_LIST_SLOTS];
	lv_obj_t *overlay;
	lv_obj_t *overlay_title;
	lv_obj_t *overlay_list[HMI_LIST_SLOTS];
	alerts_hmi_state_t last_state;
	char last_tz[ALERTS_TZ_LEN];
} hmi_ui_t;

static hmi_ui_t s_ui;
static alerts_hmi_tap_cb_t s_tap_cb;

void alerts_hmi_lvgl_set_tap_cb(alerts_hmi_tap_cb_t cb)
{
	s_tap_cb = cb;
}

static const char *weekday_pt(int wday)
{
	static const char *days[] = {"DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SAB"};
	if (wday < 0 || wday > 6) {
		return "---";
	}
	return days[wday];
}

static const char *month_pt(int mon)
{
	static const char *months[] = {"JAN", "FEV", "MAR", "ABR", "MAI", "JUN", "JUL", "AGO", "SET", "OUT", "NOV", "DEZ"};
	if (mon < 0 || mon > 11) {
		return "---";
	}
	return months[mon];
}

static void apply_frame_tz(const char *timezone)
{
	if (timezone == NULL || timezone[0] == '\0') {
		return;
	}
	if (strcmp(timezone, s_ui.last_tz) == 0) {
		return;
	}
	setenv("TZ", timezone, 1);
	tzset();
	strncpy(s_ui.last_tz, timezone, sizeof(s_ui.last_tz) - 1);
	s_ui.last_tz[sizeof(s_ui.last_tz) - 1] = '\0';
}

static void format_clock_line(char *buf, size_t buflen, int64_t now_unix)
{
	struct tm tm_local;
	time_t t = (time_t)now_unix;
	if (localtime_r(&t, &tm_local) == NULL) {
		snprintf(buf, buflen, "--:--");
		return;
	}
	strftime(buf, buflen, "%H:%M", &tm_local);
}

static void format_date_line(char *buf, size_t buflen, int64_t now_unix)
{
	struct tm tm_local;
	time_t t = (time_t)now_unix;
	if (localtime_r(&t, &tm_local) == NULL) {
		snprintf(buf, buflen, "--- - -- ---");
		return;
	}
	snprintf(buf, buflen, "%s - %d %s", weekday_pt(tm_local.tm_wday), tm_local.tm_mday, month_pt(tm_local.tm_mon));
}

static void format_event_time(char *buf, size_t buflen, int64_t start_unix)
{
	struct tm tm_local;
	time_t t = (time_t)start_unix;
	if (localtime_r(&t, &tm_local) == NULL) {
		snprintf(buf, buflen, "--:--");
		return;
	}
	strftime(buf, buflen, "%H:%M", &tm_local);
}

static void format_countdown(char *buf, size_t buflen, int64_t now_unix, int64_t start_unix)
{
	if (start_unix <= now_unix) {
		snprintf(buf, buflen, "agora");
		return;
	}
	int64_t mins = (start_unix - now_unix) / 60;
	if (mins < 1) {
		mins = 1;
	}
	if (mins < 60) {
		snprintf(buf, buflen, "em %lld min", (long long)mins);
		return;
	}
	if (mins < 1440) {
		int64_t h = mins / 60;
		int64_t m = mins % 60;
		if (m == 0) {
			snprintf(buf, buflen, "em %lld h", (long long)h);
		} else {
			snprintf(buf, buflen, "em %lld h %lld min", (long long)h, (long long)m);
		}
		return;
	}
	int64_t d = mins / 1440;
	int64_t h = (mins % 1440) / 60;
	if (h == 0) {
		snprintf(buf, buflen, "em %lld %s", (long long)d, d == 1 ? "dia" : "dias");
	} else {
		snprintf(buf, buflen, "em %lld %s %lld h", (long long)d, d == 1 ? "dia" : "dias", (long long)h);
	}
}

static void format_list_line(char *buf, size_t buflen, const alerts_event_t *e)
{
	char timebuf[8];
	format_event_time(timebuf, sizeof(timebuf), e->start_unix);
	snprintf(buf, buflen, "%s %s", timebuf, e->title);
}

static void set_label(lv_obj_t *lbl, const char *text, bool visible)
{
	if (lbl == NULL) {
		return;
	}
	lv_label_set_text(lbl, text);
	if (visible) {
		lv_obj_remove_flag(lbl, LV_OBJ_FLAG_HIDDEN);
	} else {
		lv_obj_add_flag(lbl, LV_OBJ_FLAG_HIDDEN);
	}
}

static void style_label(lv_obj_t *lbl, const lv_font_t *font, lv_color_t color, lv_text_align_t align)
{
	lv_obj_set_style_text_font(lbl, font, 0);
	lv_obj_set_style_text_color(lbl, color, 0);
	lv_obj_set_style_text_align(lbl, align, 0);
	lv_label_set_long_mode(lbl, LV_LABEL_LONG_DOT);
	lv_obj_set_width(lbl, WS_LCD_H_RES - 16);
}

static void root_click_cb(lv_event_t *e)
{
	if (lv_event_get_code(e) == LV_EVENT_CLICKED && s_tap_cb != NULL) {
		s_tap_cb();
	}
}

static void build_list_labels(lv_obj_t **labels, lv_obj_t *parent, int y_start)
{
	for (int i = 0; i < HMI_LIST_SLOTS; i++) {
		labels[i] = lv_label_create(parent);
		lv_obj_align(labels[i], LV_ALIGN_TOP_MID, 0, y_start + i * 22);
		style_label(labels[i], &lv_font_montserrat_14, COLOR_MUTED, LV_TEXT_ALIGN_LEFT);
		lv_obj_add_flag(labels[i], LV_OBJ_FLAG_HIDDEN);
	}
}

esp_err_t alerts_hmi_lvgl_init(void)
{
	memset(&s_ui, 0, sizeof(s_ui));

	s_ui.root = lv_obj_create(lv_screen_active());
	lv_obj_remove_style_all(s_ui.root);
	lv_obj_set_size(s_ui.root, WS_LCD_H_RES, WS_LCD_V_RES);
	lv_obj_set_style_bg_color(s_ui.root, COLOR_BG, 0);
	lv_obj_set_style_bg_opa(s_ui.root, LV_OPA_COVER, 0);
	lv_obj_add_flag(s_ui.root, LV_OBJ_FLAG_CLICKABLE);
	lv_obj_add_event_cb(s_ui.root, root_click_cb, LV_EVENT_CLICKED, NULL);

	s_ui.clock_lbl = lv_label_create(s_ui.root);
	lv_obj_align(s_ui.clock_lbl, LV_ALIGN_TOP_MID, 0, 12);
	style_label(s_ui.clock_lbl, &lv_font_montserrat_28, COLOR_TEXT, LV_TEXT_ALIGN_CENTER);

	s_ui.date_lbl = lv_label_create(s_ui.root);
	lv_obj_align(s_ui.date_lbl, LV_ALIGN_TOP_MID, 0, 48);
	style_label(s_ui.date_lbl, &lv_font_montserrat_14, COLOR_MUTED, LV_TEXT_ALIGN_CENTER);

	s_ui.focus_title_lbl = lv_label_create(s_ui.root);
	lv_obj_align(s_ui.focus_title_lbl, LV_ALIGN_CENTER, 0, -36);
	style_label(s_ui.focus_title_lbl, &lv_font_montserrat_20, COLOR_TEXT, LV_TEXT_ALIGN_CENTER);

	s_ui.focus_time_lbl = lv_label_create(s_ui.root);
	lv_obj_align(s_ui.focus_time_lbl, LV_ALIGN_CENTER, 0, -8);
	style_label(s_ui.focus_time_lbl, &lv_font_montserrat_16, COLOR_MUTED, LV_TEXT_ALIGN_CENTER);

	s_ui.countdown_lbl = lv_label_create(s_ui.root);
	lv_obj_align(s_ui.countdown_lbl, LV_ALIGN_CENTER, 0, 20);
	style_label(s_ui.countdown_lbl, &lv_font_montserrat_16, COLOR_TEXT, LV_TEXT_ALIGN_CENTER);

	s_ui.state_lbl = lv_label_create(s_ui.root);
	lv_obj_align(s_ui.state_lbl, LV_ALIGN_CENTER, 0, 56);
	style_label(s_ui.state_lbl, &lv_font_montserrat_20, COLOR_ALERT, LV_TEXT_ALIGN_CENTER);

	s_ui.divider = lv_obj_create(s_ui.root);
	lv_obj_set_size(s_ui.divider, WS_LCD_H_RES - 24, 1);
	lv_obj_align(s_ui.divider, LV_ALIGN_BOTTOM_MID, 0, -88);
	lv_obj_set_style_bg_color(s_ui.divider, COLOR_MUTED, 0);
	lv_obj_set_style_bg_opa(s_ui.divider, LV_OPA_50, 0);
	lv_obj_set_style_border_width(s_ui.divider, 0, 0);
	lv_obj_add_flag(s_ui.divider, LV_OBJ_FLAG_HIDDEN);

	build_list_labels(s_ui.list_lbl, s_ui.root, WS_LCD_V_RES - 82);

	s_ui.overlay = lv_obj_create(s_ui.root);
	lv_obj_set_size(s_ui.overlay, WS_LCD_H_RES, WS_LCD_V_RES);
	lv_obj_align(s_ui.overlay, LV_ALIGN_CENTER, 0, 0);
	lv_obj_set_style_bg_color(s_ui.overlay, lv_color_black(), 0);
	lv_obj_set_style_bg_opa(s_ui.overlay, LV_OPA_70, 0);
	lv_obj_set_style_border_width(s_ui.overlay, 0, 0);
	lv_obj_add_flag(s_ui.overlay, LV_OBJ_FLAG_HIDDEN);

	s_ui.overlay_title = lv_label_create(s_ui.overlay);
	lv_label_set_text(s_ui.overlay_title, "PRÓXIMOS");
	lv_obj_align(s_ui.overlay_title, LV_ALIGN_TOP_MID, 0, 16);
	style_label(s_ui.overlay_title, &lv_font_montserrat_16, COLOR_TEXT, LV_TEXT_ALIGN_CENTER);

	build_list_labels(s_ui.overlay_list, s_ui.overlay, 52);

	s_ui.last_state = ALERTS_HMI_EMPTY;
	ESP_LOGI(TAG, "lvgl widgets ready");
	return ESP_OK;
}

static void render_list(lv_obj_t **labels, const alerts_event_t *events, size_t count)
{
	char line[128];
	for (int i = 0; i < HMI_LIST_SLOTS; i++) {
		if ((size_t)i < count) {
			format_list_line(line, sizeof(line), &events[i]);
			set_label(labels[i], line, true);
		} else {
			set_label(labels[i], "", false);
		}
	}
}

esp_err_t alerts_hmi_lvgl_render(const alerts_hmi_frame_t *frame)
{
	if (frame == NULL) {
		return ESP_ERR_INVALID_ARG;
	}

	apply_frame_tz(frame->timezone);
	const int64_t now = frame->now_unix;
	char buf[96];

	format_clock_line(buf, sizeof(buf), now);
	set_label(s_ui.clock_lbl, buf, true);

	format_date_line(buf, sizeof(buf), now);
	set_label(s_ui.date_lbl, buf, true);

	const bool state_changed = frame->state != s_ui.last_state;
	s_ui.last_state = frame->state;

	const bool has_focus = frame->has_focus && frame->state != ALERTS_HMI_EMPTY;

	if (has_focus) {
		set_label(s_ui.focus_title_lbl, frame->focus.title, true);
		format_event_time(buf, sizeof(buf), frame->focus.start_unix);
		set_label(s_ui.focus_time_lbl, buf, frame->state != ALERTS_HMI_NOW);
		if (frame->state == ALERTS_HMI_ALERT || frame->state == ALERTS_HMI_AMBIENT) {
			format_countdown(buf, sizeof(buf), now, frame->focus.start_unix);
			set_label(s_ui.countdown_lbl, buf, true);
		} else {
			set_label(s_ui.countdown_lbl, "", false);
		}
	} else if (frame->state == ALERTS_HMI_EMPTY) {
		set_label(s_ui.focus_title_lbl, "SEM EVENTOS", true);
		set_label(s_ui.focus_time_lbl, "", false);
		set_label(s_ui.countdown_lbl, "", false);
	} else {
		set_label(s_ui.focus_title_lbl, "", false);
		set_label(s_ui.focus_time_lbl, "", false);
		set_label(s_ui.countdown_lbl, "", false);
	}

	switch (frame->state) {
	case ALERTS_HMI_ALERT:
		set_label(s_ui.state_lbl, "ALERTA", true);
		lv_obj_set_style_text_color(s_ui.state_lbl, COLOR_ALERT, 0);
		break;
	case ALERTS_HMI_NOW:
		set_label(s_ui.state_lbl, "AGORA", true);
		lv_obj_set_style_text_color(s_ui.state_lbl, COLOR_NOW, 0);
		break;
	default:
		set_label(s_ui.state_lbl, "", false);
		break;
	}

	const bool show_embedded_list = frame->state == ALERTS_HMI_AMBIENT && frame->ambient_list_count > 0;
	if (show_embedded_list) {
		lv_obj_remove_flag(s_ui.divider, LV_OBJ_FLAG_HIDDEN);
		render_list(s_ui.list_lbl, frame->ambient_list, frame->ambient_list_count);
	} else {
		lv_obj_add_flag(s_ui.divider, LV_OBJ_FLAG_HIDDEN);
		render_list(s_ui.list_lbl, NULL, 0);
	}

	if (frame->overlay_open) {
		lv_obj_remove_flag(s_ui.overlay, LV_OBJ_FLAG_HIDDEN);
		render_list(s_ui.overlay_list, frame->overlay_list, frame->overlay_list_count);
	} else {
		lv_obj_add_flag(s_ui.overlay, LV_OBJ_FLAG_HIDDEN);
	}

	(void)state_changed;
	return ESP_OK;
}
