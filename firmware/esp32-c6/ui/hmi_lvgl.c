#include "hmi_lvgl.h"

#include "fonts/lv_font_alerts.h"
#include "hmi_layout.h"
#include "time_seed.h"
#include "time_tz.h"
#include "waveshare/ws_pins.h"

#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <time.h>

#include "esp_log.h"
#include "lvgl.h"

static const char *TAG = "hmi_lvgl";

#define HMI_LIVE_FRESH_SEC 300
#define HMI_SCROLL_DURATION_MS 8000
#define HMI_SCROLL_PAUSE_MS 2500
#define HMI_SCROLL_STAGGER_MS 700
static const lv_color_t COLOR_BG = LV_COLOR_MAKE(0x00, 0x00, 0x00);
static const lv_color_t COLOR_CYAN = LV_COLOR_MAKE(0x00, 0xE5, 0xFF);
static const lv_color_t COLOR_DATE = LV_COLOR_MAKE(0xFF, 0x44, 0x44);
static const lv_color_t COLOR_MUTED = LV_COLOR_MAKE(0x80, 0x80, 0x80);
static const lv_color_t COLOR_ALERT = LV_COLOR_MAKE(0xFF, 0x8C, 0x00);
static const lv_color_t COLOR_NOW = LV_COLOR_MAKE(0x00, 0xFF, 0x41);
static const lv_color_t COLOR_LIVE = LV_COLOR_MAKE(0x00, 0xFF, 0x41);
static const lv_color_t COLOR_ON_BAND = LV_COLOR_MAKE(0x00, 0x00, 0x00);
static const lv_color_t COLOR_BORDER = LV_COLOR_MAKE(0x40, 0x40, 0x40);

typedef struct {
	lv_obj_t *root;
	lv_obj_t *date_lbl;
	lv_obj_t *live_lbl;
	lv_obj_t *clock_lbl;
	lv_obj_t *focus_card;
	lv_obj_t *focus_caption_lbl;
	lv_obj_t *focus_title_lbl;
	lv_obj_t *focus_time_lbl;
	lv_obj_t *list_time_lbl[HMI_AMBIENT_LIST_SLOTS];
	lv_obj_t *list_title_lbl[HMI_AMBIENT_LIST_SLOTS];
	lv_obj_t *alert_band;
	lv_obj_t *alert_word_lbl;
	lv_obj_t *now_band;
	lv_obj_t *now_word_lbl;
	lv_obj_t *empty_title_lbl;
	lv_obj_t *overlay;
	lv_obj_t *overlay_title;
	lv_obj_t *overlay_count_lbl;
	lv_obj_t *overlay_time_lbl[HMI_OVERLAY_LIST_SLOTS];
	lv_obj_t *overlay_list[HMI_OVERLAY_LIST_SLOTS];
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
	if (alerts_time_set_tz(timezone) != ESP_OK) {
		return;
	}
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
		snprintf(buf, buflen, "--- -- ---");
		return;
	}
	snprintf(buf, buflen, "%s %d %s", weekday_pt(tm_local.tm_wday), tm_local.tm_mday, month_pt(tm_local.tm_mon));
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

static void format_event_range(char *buf, size_t buflen, const alerts_event_t *e)
{
	if (e->has_end && e->end_unix > e->start_unix) {
		char start[8];
		char end[8];
		format_event_time(start, sizeof(start), e->start_unix);
		format_event_time(end, sizeof(end), e->end_unix);
		snprintf(buf, buflen, "%s - %s", start, end);
		return;
	}
	format_event_time(buf, buflen, e->start_unix);
}

static void format_now_until(char *buf, size_t buflen, const alerts_event_t *e)
{
	if (e->has_end && e->end_unix > e->start_unix) {
		char end[8];
		format_event_time(end, sizeof(end), e->end_unix);
		snprintf(buf, buflen, "Ate %s", end);
		return;
	}
	buf[0] = '\0';
}

static void format_countdown_pill(char *buf, size_t buflen, int64_t now_unix, int64_t start_unix)
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
		snprintf(buf, buflen, "%lldm", (long long)mins);
		return;
	}
	if (mins < 1440) {
		int64_t h = mins / 60;
		int64_t m = mins % 60;
		if (m == 0) {
			snprintf(buf, buflen, "%lldh", (long long)h);
		} else {
			snprintf(buf, buflen, "%lldh%lldm", (long long)h, (long long)m);
		}
		return;
	}
	int64_t d = mins / 1440;
	snprintf(buf, buflen, "%lldd", (long long)d);
}

static void format_day_header_short(char *buf, size_t buflen, int64_t day_unix)
{
	struct tm tm_local;
	time_t t = (time_t)day_unix;
	if (localtime_r(&t, &tm_local) == NULL) {
		snprintf(buf, buflen, "--- --");
		return;
	}
	snprintf(buf, buflen, "%s %d", weekday_pt(tm_local.tm_wday), tm_local.tm_mday);
}

static void format_alert_focus_time(char *buf, size_t buflen, int64_t now_unix, const alerts_event_t *e)
{
	char countdown[24];
	char time[8];

	format_countdown_pill(countdown, sizeof(countdown), now_unix, e->start_unix);
	format_event_time(time, sizeof(time), e->start_unix);
	snprintf(buf, buflen, "em %s - %s", countdown, time);
}

static int event_day_key(int64_t start_unix)
{
	struct tm tm_local;
	time_t t = (time_t)start_unix;
	if (localtime_r(&t, &tm_local) == NULL) {
		return -1;
	}
	return (tm_local.tm_year * 10000) + ((tm_local.tm_mon + 1) * 100) + tm_local.tm_mday;
}

static bool live_visible(const alerts_hmi_frame_t *frame)
{
	if (frame == NULL || frame->timezone[0] == '\0' || !alerts_time_is_synced()) {
		return false;
	}
	if (frame->now_unix <= 0 || frame->schedule_loaded_at_unix <= 0) {
		return false;
	}
	return (frame->now_unix - frame->schedule_loaded_at_unix) <= HMI_LIVE_FRESH_SEC;
}

static void set_label(lv_obj_t *lbl, const char *text, bool visible)
{
	if (lbl == NULL) {
		return;
	}
	if (text == NULL) {
		text = "";
	}
	const char *cur = lv_label_get_text(lbl);
	if (cur == NULL || strcmp(cur, text) != 0) {
		lv_label_set_text(lbl, text);
	}
	if (visible) {
		lv_obj_remove_flag(lbl, LV_OBJ_FLAG_HIDDEN);
	} else {
		lv_obj_add_flag(lbl, LV_OBJ_FLAG_HIDDEN);
	}
}

static void set_visible(lv_obj_t *obj, bool visible)
{
	if (obj == NULL) {
		return;
	}
	if (visible) {
		lv_obj_remove_flag(obj, LV_OBJ_FLAG_HIDDEN);
	} else {
		lv_obj_add_flag(obj, LV_OBJ_FLAG_HIDDEN);
	}
}

static lv_obj_t *create_text_clip(lv_obj_t *parent, int x, int y, int width, int height)
{
	lv_obj_t *clip = lv_obj_create(parent);
	lv_obj_remove_style_all(clip);
	lv_obj_set_pos(clip, x, y);
	lv_obj_set_size(clip, width, height);
	lv_obj_clear_flag(clip, LV_OBJ_FLAG_SCROLLABLE | LV_OBJ_FLAG_CLICKABLE);
	return clip;
}

static void style_flat_panel(lv_obj_t *obj, lv_color_t bg, lv_color_t border, int border_w)
{
	lv_obj_set_style_bg_color(obj, bg, 0);
	lv_obj_set_style_bg_opa(obj, LV_OPA_COVER, 0);
	lv_obj_set_style_border_color(obj, border, 0);
	lv_obj_set_style_border_width(obj, border_w, 0);
	lv_obj_set_style_radius(obj, 0, 0);
	lv_obj_set_style_pad_all(obj, 0, 0);
}

static lv_obj_t *create_bordered_panel(lv_obj_t *parent, int x, int y, int w, int h, lv_color_t border)
{
	lv_obj_t *panel = lv_obj_create(parent);
	lv_obj_remove_style_all(panel);
	lv_obj_set_pos(panel, x, y);
	lv_obj_set_size(panel, w, h);
	style_flat_panel(panel, COLOR_BG, border, 1);
	lv_obj_clear_flag(panel, LV_OBJ_FLAG_CLICKABLE | LV_OBJ_FLAG_SCROLLABLE);
	return panel;
}

static void hmi_scroll_x_exec(void *obj, int32_t v)
{
	lv_obj_set_x((lv_obj_t *)obj, v);
}

static int32_t hmi_scroll_end_x(lv_obj_t *lbl, int32_t clip_w)
{
	const char *text = lv_label_get_text(lbl);
	const lv_font_t *font = lv_obj_get_style_text_font(lbl, LV_PART_MAIN);
	if (text == NULL || font == NULL || text[0] == '\0') {
		return 0;
	}

	lv_point_t size;
	lv_text_get_size(&size, text, font, lv_obj_get_style_text_letter_space(lbl, LV_PART_MAIN),
			 lv_obj_get_style_text_line_space(lbl, LV_PART_MAIN), LV_COORD_MAX, LV_TEXT_FLAG_EXPAND);
	if (size.x <= clip_w) {
		return 0;
	}
	return clip_w - size.x;
}

static void hmi_start_horizontal_scroll(lv_obj_t *lbl, int stagger_index, int32_t clip_w)
{
	lv_anim_delete(lbl, hmi_scroll_x_exec);
	lv_obj_set_pos(lbl, 0, 0);

	const int32_t end = hmi_scroll_end_x(lbl, clip_w);
	if (end == 0) {
		return;
	}

	lv_anim_t anim;
	lv_anim_init(&anim);
	lv_anim_set_var(&anim, lbl);
	lv_anim_set_exec_cb(&anim, hmi_scroll_x_exec);
	lv_anim_set_values(&anim, 0, end);
	lv_anim_set_duration(&anim, HMI_SCROLL_DURATION_MS);
	lv_anim_set_repeat_count(&anim, LV_ANIM_REPEAT_INFINITE);
	lv_anim_set_repeat_delay(&anim, HMI_SCROLL_PAUSE_MS + (uint32_t)stagger_index * HMI_SCROLL_STAGGER_MS);
	lv_anim_start(&anim);
}

static void style_label_raw(lv_obj_t *lbl, const lv_font_t *font, lv_color_t color, lv_text_align_t align)
{
	lv_obj_set_style_text_font(lbl, font, 0);
	lv_obj_set_style_text_color(lbl, color, 0);
	lv_obj_set_style_text_align(lbl, align, 0);
	lv_obj_set_style_text_line_space(lbl, 0, 0);
}

static void style_clip_text_label(lv_obj_t *lbl, const lv_font_t *font, lv_color_t color, lv_text_align_t align)
{
	style_label_raw(lbl, font, color, align);
	lv_label_set_long_mode(lbl, LV_LABEL_LONG_CLIP);
}

static void style_overlay_row(lv_obj_t *lbl, const lv_font_t *font, lv_color_t color, lv_text_align_t align, bool scroll,
			      int width)
{
	style_label_raw(lbl, font, color, align);
	lv_obj_set_width(lbl, width);
	lv_obj_set_height(lbl, HMI_GRID_ROW);
	if (scroll) {
		lv_label_set_long_mode(lbl, LV_LABEL_LONG_CLIP);
	} else {
		lv_label_set_long_mode(lbl, LV_LABEL_LONG_DOT);
	}
}

static void layout_overlay_clip(lv_obj_t *lbl, int y, int x, int width)
{
	lv_obj_t *clip = lv_obj_get_parent(lbl);
	lv_anim_delete(lbl, hmi_scroll_x_exec);
	lv_obj_set_pos(clip, x, y);
	lv_obj_set_size(clip, width, HMI_GRID_ROW);
	lv_obj_set_pos(lbl, 0, 0);
	set_visible(clip, true);
}

static void render_overlay_blank(int slot, lv_obj_t *lbl)
{
	const int y = HMI_OVERLAY_LIST_Y + slot * HMI_GRID_ROW;
	set_label(s_ui.overlay_time_lbl[slot], "", false);
	layout_overlay_clip(lbl, y, HMI_PAD_X, WS_LCD_H_RES - HMI_PAD_X * 2);
	style_overlay_row(lbl, &lv_font_alerts_22, COLOR_MUTED, LV_TEXT_ALIGN_LEFT, false, WS_LCD_H_RES - 16);
	set_label(lbl, "", true);
}

static void render_overlay_date(int slot, lv_obj_t *lbl, int64_t day_unix)
{
	char buf[96];
	const int y = HMI_OVERLAY_LIST_Y + slot * HMI_GRID_ROW;
	set_label(s_ui.overlay_time_lbl[slot], "", false);
	layout_overlay_clip(lbl, y, HMI_PAD_X, WS_LCD_H_RES - HMI_PAD_X * 2);
	format_day_header_short(buf, sizeof(buf), day_unix);
	style_overlay_row(lbl, &lv_font_alerts_22, COLOR_CYAN, LV_TEXT_ALIGN_LEFT, false, WS_LCD_H_RES - 16);
	set_label(lbl, buf, true);
}

static void render_overlay_event(int slot, lv_obj_t *title_lbl, const alerts_event_t *e)
{
	char timebuf[8];
	const int y = HMI_OVERLAY_LIST_Y + slot * HMI_GRID_ROW;
	format_event_time(timebuf, sizeof(timebuf), e->start_unix);
	lv_obj_set_pos(s_ui.overlay_time_lbl[slot], HMI_PAD_X, y);
	style_overlay_row(s_ui.overlay_time_lbl[slot], &lv_font_alerts_22, COLOR_CYAN, LV_TEXT_ALIGN_LEFT, false,
			  HMI_LIST_TIME_W);
	set_label(s_ui.overlay_time_lbl[slot], timebuf, true);
	layout_overlay_clip(title_lbl, y, HMI_LIST_TITLE_X, HMI_LIST_TITLE_W);
	style_overlay_row(title_lbl, &lv_font_alerts_22, COLOR_MUTED, LV_TEXT_ALIGN_LEFT, true, HMI_LIST_TITLE_W);
	set_label(title_lbl, e->title, true);
	hmi_start_horizontal_scroll(title_lbl, slot, HMI_LIST_TITLE_W);
}

static size_t render_overlay_list(lv_obj_t **labels, int slot_count, const alerts_event_t *events, size_t count)
{
	int slot = 0;
	int last_day = -1;
	size_t event_rows = 0;

	for (size_t i = 0; i < count && slot < slot_count; i++) {
		const alerts_event_t *e = &events[i];
		const int day = event_day_key(e->start_unix);

		if (day != last_day) {
			if (slot < slot_count) {
				render_overlay_date(slot, labels[slot], e->start_unix);
				slot++;
			}
			last_day = day;
		}

		if (slot < slot_count) {
			render_overlay_event(slot, labels[slot], e);
			slot++;
			event_rows++;
		}
	}

	for (; slot < slot_count; slot++) {
		set_label(s_ui.overlay_time_lbl[slot], "", false);
		set_label(labels[slot], "", false);
		lv_anim_delete(labels[slot], hmi_scroll_x_exec);
		set_visible(lv_obj_get_parent(labels[slot]), false);
	}

	return event_rows;
}

static void root_click_cb(lv_event_t *e)
{
	if (lv_event_get_code(e) == LV_EVENT_CLICKED && s_tap_cb != NULL) {
		s_tap_cb();
	}
}

static lv_obj_t *create_state_band(lv_obj_t *parent, int y, int h, lv_color_t color)
{
	lv_obj_t *band = lv_obj_create(parent);
	lv_obj_remove_style_all(band);
	lv_obj_set_pos(band, 0, y);
	lv_obj_set_size(band, WS_LCD_H_RES, h);
	lv_obj_set_style_bg_color(band, color, 0);
	lv_obj_set_style_bg_opa(band, LV_OPA_COVER, 0);
	lv_obj_set_style_border_width(band, 0, 0);
	lv_obj_set_style_radius(band, 0, 0);
	lv_obj_clear_flag(band, LV_OBJ_FLAG_CLICKABLE);
	lv_obj_add_flag(band, LV_OBJ_FLAG_HIDDEN);
	return band;
}

static void band_opa_cb(void *obj, int32_t v)
{
	lv_obj_set_style_bg_opa((lv_obj_t *)obj, (lv_opa_t)v, 0);
}

static void alert_blink_start(void)
{
	lv_anim_del(s_ui.alert_band, band_opa_cb);
	lv_anim_t anim;
	lv_anim_init(&anim);
	lv_anim_set_var(&anim, s_ui.alert_band);
	lv_anim_set_exec_cb(&anim, band_opa_cb);
	lv_anim_set_values(&anim, LV_OPA_40, LV_OPA_COVER);
	lv_anim_set_duration(&anim, 500);
	lv_anim_set_playback_duration(&anim, 500);
	lv_anim_set_repeat_count(&anim, LV_ANIM_REPEAT_INFINITE);
	lv_anim_start(&anim);
}

static void alert_blink_stop(void)
{
	lv_anim_del(s_ui.alert_band, band_opa_cb);
	if (s_ui.alert_band != NULL) {
		lv_obj_set_style_bg_opa(s_ui.alert_band, LV_OPA_COVER, 0);
	}
}

static void set_focus_card_style(lv_color_t fill, lv_color_t border, lv_color_t text)
{
	lv_obj_set_style_bg_color(s_ui.focus_card, fill, 0);
	lv_obj_set_style_border_color(s_ui.focus_card, border, 0);
	lv_obj_set_style_text_color(s_ui.focus_caption_lbl, text, 0);
	lv_obj_set_style_text_color(s_ui.focus_title_lbl, text, 0);
	lv_obj_set_style_text_color(s_ui.focus_time_lbl, text, 0);
}

static void build_list_row_labels(lv_obj_t **time_labels, lv_obj_t **title_labels, lv_obj_t *parent, int y_start,
				  int count, int row_h)
{
	for (int i = 0; i < count; i++) {
		const int y = y_start + i * row_h;

		time_labels[i] = lv_label_create(parent);
		lv_obj_set_pos(time_labels[i], HMI_PAD_X, y);
		lv_obj_set_size(time_labels[i], HMI_LIST_TIME_W, row_h);
		style_label_raw(time_labels[i], &lv_font_alerts_22, COLOR_CYAN, LV_TEXT_ALIGN_LEFT);
		lv_label_set_long_mode(time_labels[i], LV_LABEL_LONG_DOT);
		lv_obj_add_flag(time_labels[i], LV_OBJ_FLAG_HIDDEN);

		lv_obj_t *clip = create_text_clip(parent, HMI_LIST_TITLE_X, y, HMI_LIST_TITLE_W, row_h);
		title_labels[i] = lv_label_create(clip);
		style_clip_text_label(title_labels[i], &lv_font_alerts_22, COLOR_MUTED, LV_TEXT_ALIGN_LEFT);
		lv_obj_add_flag(clip, LV_OBJ_FLAG_HIDDEN);
	}
}

static void build_overlay_row_labels(lv_obj_t **time_labels, lv_obj_t **title_labels, lv_obj_t *parent, int y_start,
				     int count)
{
	for (int i = 0; i < count; i++) {
		const int y = y_start + i * HMI_GRID_ROW;

		time_labels[i] = lv_label_create(parent);
		lv_obj_set_pos(time_labels[i], HMI_PAD_X, y);
		lv_obj_set_size(time_labels[i], HMI_LIST_TIME_W, HMI_GRID_ROW);
		style_label_raw(time_labels[i], &lv_font_alerts_22, COLOR_CYAN, LV_TEXT_ALIGN_LEFT);
		lv_label_set_long_mode(time_labels[i], LV_LABEL_LONG_DOT);
		lv_obj_add_flag(time_labels[i], LV_OBJ_FLAG_HIDDEN);

		lv_obj_t *clip = create_text_clip(parent, HMI_LIST_TITLE_X, y, HMI_LIST_TITLE_W, HMI_GRID_ROW);
		title_labels[i] = lv_label_create(clip);
		style_clip_text_label(title_labels[i], &lv_font_alerts_22, COLOR_MUTED, LV_TEXT_ALIGN_LEFT);
		lv_obj_add_flag(clip, LV_OBJ_FLAG_HIDDEN);
	}
}

static void set_title_row_visible(lv_obj_t *title_lbl, bool visible)
{
	if (title_lbl == NULL) {
		return;
	}
	lv_obj_t *clip = lv_obj_get_parent(title_lbl);
	set_visible(clip, visible);
}

esp_err_t alerts_hmi_lvgl_init(void)
{
	memset(&s_ui, 0, sizeof(s_ui));

	s_ui.root = lv_obj_create(lv_screen_active());
	lv_obj_remove_style_all(s_ui.root);
	lv_obj_set_size(s_ui.root, WS_LCD_H_RES, WS_LCD_V_RES);
	lv_obj_set_style_bg_color(lv_screen_active(), COLOR_BG, 0);
	lv_obj_set_style_bg_opa(lv_screen_active(), LV_OPA_COVER, 0);
	lv_obj_set_style_bg_color(s_ui.root, COLOR_BG, 0);
	lv_obj_set_style_bg_opa(s_ui.root, LV_OPA_COVER, 0);
	lv_obj_add_flag(s_ui.root, LV_OBJ_FLAG_CLICKABLE);
	lv_obj_add_event_cb(s_ui.root, root_click_cb, LV_EVENT_CLICKED, NULL);

	s_ui.date_lbl = lv_label_create(s_ui.root);
	lv_obj_set_pos(s_ui.date_lbl, HMI_PAD_X, HMI_HEADER_Y);
	lv_obj_set_size(s_ui.date_lbl, HMI_CARD_W - HMI_LIVE_W, HMI_GRID_ROW);
	style_label_raw(s_ui.date_lbl, &lv_font_alerts_22, COLOR_DATE, LV_TEXT_ALIGN_LEFT);
	lv_label_set_long_mode(s_ui.date_lbl, LV_LABEL_LONG_DOT);

	s_ui.live_lbl = lv_label_create(s_ui.root);
	lv_label_set_text(s_ui.live_lbl, "LIVE");
	lv_obj_set_size(s_ui.live_lbl, HMI_LIVE_W, HMI_GRID_ROW);
	style_label_raw(s_ui.live_lbl, &lv_font_alerts_22, COLOR_LIVE, LV_TEXT_ALIGN_RIGHT);
	lv_obj_align(s_ui.live_lbl, LV_ALIGN_TOP_RIGHT, -HMI_PAD_X, HMI_HEADER_Y);
	lv_label_set_long_mode(s_ui.live_lbl, LV_LABEL_LONG_CLIP);
	lv_obj_add_flag(s_ui.live_lbl, LV_OBJ_FLAG_HIDDEN);

	s_ui.clock_lbl = lv_label_create(s_ui.root);
	lv_obj_set_pos(s_ui.clock_lbl, HMI_PAD_X, HMI_CLOCK_Y);
	lv_obj_set_size(s_ui.clock_lbl, HMI_CARD_W, HMI_GRID_ROW * 2);
	style_label_raw(s_ui.clock_lbl, &lv_font_alerts_28, COLOR_CYAN, LV_TEXT_ALIGN_LEFT);

	s_ui.focus_card = create_bordered_panel(s_ui.root, HMI_PAD_X, HMI_CARD_Y, HMI_CARD_W, HMI_CARD_H, COLOR_BORDER);
	lv_obj_add_flag(s_ui.focus_card, LV_OBJ_FLAG_HIDDEN);

	s_ui.focus_caption_lbl = lv_label_create(s_ui.focus_card);
	lv_obj_set_pos(s_ui.focus_caption_lbl, HMI_PAD_X, HMI_FOCUS_CAPTION_Y - HMI_CARD_Y);
	style_label_raw(s_ui.focus_caption_lbl, &lv_font_alerts_22, COLOR_MUTED, LV_TEXT_ALIGN_LEFT);

	lv_obj_t *focus_clip = create_text_clip(s_ui.focus_card, HMI_PAD_X, HMI_FOCUS_TITLE_Y - HMI_CARD_Y,
						HMI_CARD_INNER_W, HMI_FOCUS_TITLE_H);
	s_ui.focus_title_lbl = lv_label_create(focus_clip);
	style_clip_text_label(s_ui.focus_title_lbl, &lv_font_alerts_22, COLOR_CYAN, LV_TEXT_ALIGN_LEFT);

	s_ui.focus_time_lbl = lv_label_create(s_ui.focus_card);
	lv_obj_set_pos(s_ui.focus_time_lbl, HMI_PAD_X, HMI_FOCUS_TIME_Y - HMI_CARD_Y);
	lv_obj_set_width(s_ui.focus_time_lbl, HMI_CARD_INNER_W);
	style_label_raw(s_ui.focus_time_lbl, &lv_font_alerts_22, COLOR_MUTED, LV_TEXT_ALIGN_LEFT);

	s_ui.alert_band = create_state_band(s_ui.root, HMI_STATE_BAND_Y, HMI_STATE_BAND_H, COLOR_ALERT);
	s_ui.now_band = create_state_band(s_ui.root, HMI_STATE_BAND_Y, HMI_STATE_BAND_H, COLOR_CYAN);

	build_list_row_labels(s_ui.list_time_lbl, s_ui.list_title_lbl, s_ui.root, HMI_LIST_Y,
			      HMI_AMBIENT_LIST_SLOTS, HMI_LIST_ROW);

	s_ui.alert_word_lbl = lv_label_create(s_ui.alert_band);
	lv_label_set_text(s_ui.alert_word_lbl, "A L E R T A");
	lv_obj_set_width(s_ui.alert_word_lbl, WS_LCD_H_RES);
	style_label_raw(s_ui.alert_word_lbl, &lv_font_alerts_28, COLOR_ON_BAND, LV_TEXT_ALIGN_CENTER);
	lv_obj_center(s_ui.alert_word_lbl);
	lv_obj_add_flag(s_ui.alert_band, LV_OBJ_FLAG_HIDDEN);

	s_ui.now_word_lbl = lv_label_create(s_ui.now_band);
	lv_label_set_text(s_ui.now_word_lbl, "A G O R A");
	lv_obj_set_width(s_ui.now_word_lbl, WS_LCD_H_RES);
	style_label_raw(s_ui.now_word_lbl, &lv_font_alerts_28, COLOR_ON_BAND, LV_TEXT_ALIGN_CENTER);
	lv_obj_center(s_ui.now_word_lbl);
	lv_obj_add_flag(s_ui.now_band, LV_OBJ_FLAG_HIDDEN);

	s_ui.empty_title_lbl = lv_label_create(s_ui.root);
	lv_obj_set_width(s_ui.empty_title_lbl, WS_LCD_H_RES);
	style_label_raw(s_ui.empty_title_lbl, &lv_font_alerts_22, COLOR_CYAN, LV_TEXT_ALIGN_CENTER);
	lv_obj_align(s_ui.empty_title_lbl, LV_ALIGN_CENTER, 0, 0);
	lv_obj_add_flag(s_ui.empty_title_lbl, LV_OBJ_FLAG_HIDDEN);

	s_ui.overlay = lv_obj_create(s_ui.root);
	lv_obj_remove_style_all(s_ui.overlay);
	lv_obj_set_size(s_ui.overlay, WS_LCD_H_RES, WS_LCD_V_RES);
	lv_obj_align(s_ui.overlay, LV_ALIGN_CENTER, 0, 0);
	style_flat_panel(s_ui.overlay, COLOR_BG, COLOR_CYAN, 1);
	lv_obj_clear_flag(s_ui.overlay, LV_OBJ_FLAG_CLICKABLE);
	lv_obj_add_flag(s_ui.overlay, LV_OBJ_FLAG_HIDDEN);

	s_ui.overlay_title = lv_label_create(s_ui.overlay);
	lv_label_set_text(s_ui.overlay_title, "PRÓXIMOS");
	lv_obj_set_pos(s_ui.overlay_title, HMI_PAD_X, HMI_OVERLAY_TITLE_Y);
	style_label_raw(s_ui.overlay_title, &lv_font_alerts_22, COLOR_CYAN, LV_TEXT_ALIGN_LEFT);

	s_ui.overlay_count_lbl = lv_label_create(s_ui.overlay);
	lv_obj_align(s_ui.overlay_count_lbl, LV_ALIGN_TOP_RIGHT, -HMI_PAD_X, HMI_OVERLAY_TITLE_Y);
	style_label_raw(s_ui.overlay_count_lbl, &lv_font_alerts_22, COLOR_MUTED, LV_TEXT_ALIGN_RIGHT);

	build_overlay_row_labels(s_ui.overlay_time_lbl, s_ui.overlay_list, s_ui.overlay, HMI_OVERLAY_LIST_Y,
				 HMI_OVERLAY_LIST_SLOTS);

	lv_obj_move_foreground(s_ui.focus_card);
	lv_obj_move_foreground(s_ui.alert_band);
	lv_obj_move_foreground(s_ui.now_band);
	lv_obj_move_foreground(s_ui.overlay);

	s_ui.last_state = ALERTS_HMI_EMPTY;
	ESP_LOGI(TAG, "lvgl widgets ready");
	return ESP_OK;
}

static void render_ambient_day_header(int slot, int64_t day_unix)
{
	char buf[32];
	const int y = HMI_LIST_Y + slot * HMI_LIST_ROW;
	lv_obj_t *clip = lv_obj_get_parent(s_ui.list_title_lbl[slot]);

	set_label(s_ui.list_time_lbl[slot], "", false);
	lv_anim_delete(s_ui.list_title_lbl[slot], hmi_scroll_x_exec);
	lv_obj_set_pos(clip, HMI_PAD_X, y);
	lv_obj_set_size(clip, HMI_CARD_W, HMI_LIST_ROW);
	lv_obj_set_pos(s_ui.list_title_lbl[slot], 0, 0);
	style_label_raw(s_ui.list_title_lbl[slot], &lv_font_alerts_22, COLOR_CYAN, LV_TEXT_ALIGN_LEFT);
	lv_label_set_long_mode(s_ui.list_title_lbl[slot], LV_LABEL_LONG_DOT);
	format_day_header_short(buf, sizeof(buf), day_unix);
	set_label(s_ui.list_title_lbl[slot], buf, true);
	set_visible(clip, true);
}

static void render_ambient_event(int slot, const alerts_event_t *e)
{
	char timebuf[8];
	const int y = HMI_LIST_Y + slot * HMI_LIST_ROW;
	lv_obj_t *clip = lv_obj_get_parent(s_ui.list_title_lbl[slot]);

	format_event_time(timebuf, sizeof(timebuf), e->start_unix);
	lv_obj_set_pos(s_ui.list_time_lbl[slot], HMI_PAD_X, y);
	set_label(s_ui.list_time_lbl[slot], timebuf, true);
	lv_anim_delete(s_ui.list_title_lbl[slot], hmi_scroll_x_exec);
	lv_obj_set_pos(clip, HMI_LIST_TITLE_X, y);
	lv_obj_set_size(clip, HMI_LIST_TITLE_W, HMI_LIST_ROW);
	lv_obj_set_pos(s_ui.list_title_lbl[slot], 0, 0);
	style_clip_text_label(s_ui.list_title_lbl[slot], &lv_font_alerts_22, COLOR_MUTED, LV_TEXT_ALIGN_LEFT);
	set_label(s_ui.list_title_lbl[slot], e->title, true);
	set_visible(clip, true);
	hmi_start_horizontal_scroll(s_ui.list_title_lbl[slot], slot, HMI_LIST_TITLE_W);
}

static void render_ambient_list(const alerts_event_t *events, size_t count, int64_t focus_day)
{
	int slot = 0;
	int last_day = focus_day;

	for (size_t i = 0; i < count && slot < HMI_AMBIENT_LIST_SLOTS; i++) {
		const alerts_event_t *e = &events[i];
		const int day = event_day_key(e->start_unix);

		if (day != last_day && slot < HMI_AMBIENT_LIST_SLOTS) {
			render_ambient_day_header(slot, e->start_unix);
			slot++;
			last_day = day;
		}

		if (slot < HMI_AMBIENT_LIST_SLOTS) {
			render_ambient_event(slot, e);
			slot++;
		}
	}

	for (; slot < HMI_AMBIENT_LIST_SLOTS; slot++) {
		set_label(s_ui.list_time_lbl[slot], "", false);
		set_label(s_ui.list_title_lbl[slot], "", false);
		lv_anim_delete(s_ui.list_title_lbl[slot], hmi_scroll_x_exec);
		set_title_row_visible(s_ui.list_title_lbl[slot], false);
	}
}

static void render_focus_card(const alerts_hmi_frame_t *frame, int64_t now)
{
	const bool is_ambient = frame->state == ALERTS_HMI_AMBIENT;
	const bool is_alert = frame->state == ALERTS_HMI_ALERT;
	const bool is_now = frame->state == ALERTS_HMI_NOW;
	const bool show_card = frame->has_focus && (is_ambient || is_alert || is_now);

	set_visible(s_ui.focus_card, show_card);
	if (!show_card) {
		return;
	}

	if (is_ambient) {
		set_label(s_ui.focus_caption_lbl, "PROX. EVENTO", true);
		set_focus_card_style(COLOR_NOW, COLOR_NOW, COLOR_ON_BAND);
	} else if (is_alert) {
		set_label(s_ui.focus_caption_lbl, "EM SEGUIDA", true);
		set_focus_card_style(COLOR_ALERT, COLOR_ALERT, COLOR_ON_BAND);
	} else {
		set_label(s_ui.focus_caption_lbl, "OCUPADO AGORA", true);
		set_focus_card_style(COLOR_CYAN, COLOR_CYAN, COLOR_ON_BAND);
	}

	set_label(s_ui.focus_title_lbl, frame->focus.title, true);
	set_title_row_visible(s_ui.focus_title_lbl, true);
	hmi_start_horizontal_scroll(s_ui.focus_title_lbl, 0, HMI_CARD_INNER_W);

	char buf[96];
	if (is_now) {
		format_now_until(buf, sizeof(buf), &frame->focus);
		set_label(s_ui.focus_time_lbl, buf, buf[0] != '\0');
	} else {
		format_alert_focus_time(buf, sizeof(buf), now, &frame->focus);
		set_label(s_ui.focus_time_lbl, buf, true);
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

	const bool show_live = live_visible(frame);
	set_visible(s_ui.live_lbl, show_live);

	const bool state_changed = frame->state != s_ui.last_state;
	s_ui.last_state = frame->state;

	const bool is_alert = frame->state == ALERTS_HMI_ALERT;
	const bool is_now = frame->state == ALERTS_HMI_NOW;
	const bool is_empty = frame->state == ALERTS_HMI_EMPTY;

	render_focus_card(frame, now);

	set_visible(s_ui.empty_title_lbl, is_empty);
	if (is_empty) {
		set_label(s_ui.empty_title_lbl, "SEM EVENTOS", true);
	}

	set_visible(s_ui.alert_band, is_alert);
	if (is_alert) {
		lv_obj_move_foreground(s_ui.alert_band);
		if (state_changed) {
			alert_blink_start();
		}
	} else {
		alert_blink_stop();
	}

	set_visible(s_ui.now_band, is_now);
	if (is_now) {
		lv_obj_move_foreground(s_ui.now_band);
	}

	const bool show_embedded_list = frame->state == ALERTS_HMI_AMBIENT && frame->ambient_list_count > 0;
	if (show_embedded_list) {
		const int focus_day = frame->has_focus ? event_day_key(frame->focus.start_unix) : -1;
		render_ambient_list(frame->ambient_list, frame->ambient_list_count, focus_day);
	} else {
		render_ambient_list(NULL, 0, -1);
	}

	if (frame->overlay_open) {
		lv_obj_remove_flag(s_ui.overlay, LV_OBJ_FLAG_HIDDEN);
		const size_t event_count =
			render_overlay_list(s_ui.overlay_list, HMI_OVERLAY_LIST_SLOTS, frame->overlay_list,
					    frame->overlay_list_count);
		snprintf(buf, sizeof(buf), "(%u)", (unsigned)event_count);
		set_label(s_ui.overlay_count_lbl, buf, true);
	} else {
		lv_obj_add_flag(s_ui.overlay, LV_OBJ_FLAG_HIDDEN);
	}

	return ESP_OK;
}
