#include "hmi_lvgl.h"

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

#define HMI_SCROLL_START_DELAY_MS 4000
#define HMI_SCROLL_PAUSE_MS 2500
#define HMI_SCROLL_STAGGER_MS 700
#define HMI_SCROLL_STYLE_SLOTS HMI_OVERLAY_LIST_SLOTS
#define HMI_ROW_TEXT_DY ((HMI_LIST_ROW - HMI_FONT_BODY_LINE) / 2)

static lv_style_t s_scroll_styles[HMI_SCROLL_STYLE_SLOTS];
static lv_anim_t s_scroll_anims[HMI_SCROLL_STYLE_SLOTS];
static bool s_scroll_styles_ready;

static const lv_font_t *const FONT_BODY = &lv_font_montserrat_20;

static const lv_color_t COLOR_BG = LV_COLOR_MAKE(0x00, 0x00, 0x00);
static const lv_color_t COLOR_CYAN = LV_COLOR_MAKE(0x00, 0xE5, 0xFF);
static const lv_color_t COLOR_DATE = LV_COLOR_MAKE(0xFF, 0x44, 0x44);
static const lv_color_t COLOR_MUTED = LV_COLOR_MAKE(0x80, 0x80, 0x80);
static const lv_color_t COLOR_ALERT = LV_COLOR_MAKE(0xFF, 0x95, 0x00);
static const lv_color_t COLOR_NOW = LV_COLOR_MAKE(0x00, 0xCC, 0x66);
static const lv_color_t COLOR_SYNC = LV_COLOR_MAKE(0x00, 0xFF, 0x41);
static const lv_color_t COLOR_CARD_AMBIENT = LV_COLOR_MAKE(0x55, 0x55, 0x55);
static const lv_color_t COLOR_TEXT_ON_FILL = LV_COLOR_MAKE(0x00, 0x00, 0x00);

typedef struct {
	lv_obj_t *root;
	lv_obj_t *date_lbl;
	lv_obj_t *sync_lbl;
	lv_obj_t *clock_lbl;
	lv_obj_t *focus_card;
	lv_obj_t *focus_caption_lbl;
	lv_obj_t *focus_title_lbl;
	lv_obj_t *focus_time_lbl;
	lv_obj_t *secondary_card;
	lv_obj_t *secondary_caption_lbl;
	lv_obj_t *secondary_title_lbl;
	lv_obj_t *secondary_time_lbl;
	lv_obj_t *list_time_lbl[HMI_LIST_SLOTS];
	lv_obj_t *list_title_lbl[HMI_LIST_SLOTS];
	lv_obj_t *empty_title_lbl;
	lv_obj_t *overlay;
	alerts_hmi_state_t last_state;
	bool last_secondary;
	char last_tz[ALERTS_TZ_LEN];
} hmi_ui_t;

static hmi_ui_t s_ui;
static alerts_hmi_tap_cb_t s_background_tap_cb;
static alerts_hmi_tap_cb_t s_dismiss_tap_cb;
static bool s_focus_tap_dismiss;

void alerts_hmi_lvgl_set_background_tap_cb(alerts_hmi_tap_cb_t cb)
{
	s_background_tap_cb = cb;
}

void alerts_hmi_lvgl_set_dismiss_tap_cb(alerts_hmi_tap_cb_t cb)
{
	s_dismiss_tap_cb = cb;
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

static void format_focus_countdown(char *buf, size_t buflen, int64_t now_unix, int64_t start_unix)
{
	char countdown[24];
	format_countdown_pill(countdown, sizeof(countdown), now_unix, start_unix);
	snprintf(buf, buflen, "em %s", countdown);
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

static int event_day_key(int64_t start_unix)
{
	struct tm tm_local;
	time_t t = (time_t)start_unix;
	if (localtime_r(&t, &tm_local) == NULL) {
		return -1;
	}
	return (tm_local.tm_year * 10000) + ((tm_local.tm_mon + 1) * 100) + tm_local.tm_mday;
}

static bool sync_is_fresh(const alerts_hmi_frame_t *frame)
{
	if (frame == NULL || frame->timezone[0] == '\0' || !alerts_time_is_synced()) {
		return false;
	}
	if (frame->now_unix <= 0 || frame->schedule_loaded_at_unix <= 0) {
		return false;
	}
	const int64_t age = frame->now_unix - frame->schedule_loaded_at_unix;
	return age >= 0 && age < ALERTS_HMI_SYNC_FRESH_SEC;
}

static void format_sync_label(char *buf, size_t buflen, const alerts_hmi_frame_t *frame)
{
	if (frame == NULL || frame->timezone[0] == '\0' || !alerts_time_is_synced()) {
		buf[0] = '\0';
		return;
	}
	if (frame->now_unix <= 0 || frame->schedule_loaded_at_unix <= 0) {
		buf[0] = '\0';
		return;
	}
	const int64_t age = frame->now_unix - frame->schedule_loaded_at_unix;
	if (age < ALERTS_HMI_SYNC_FRESH_SEC) {
		snprintf(buf, buflen, "OK");
		return;
	}
	if (age < ALERTS_HMI_SYNC_STALE_SEC) {
		const int64_t mins = age / 60;
		snprintf(buf, buflen, "%lldm", (long long)mins);
		return;
	}
	buf[0] = '\0';
}

static bool set_label(lv_obj_t *lbl, const char *text, bool visible)
{
	if (lbl == NULL) {
		return false;
	}
	if (text == NULL) {
		text = "";
	}
	bool changed = false;
	const char *cur = lv_label_get_text(lbl);
	if (cur == NULL || strcmp(cur, text) != 0) {
		lv_label_set_text(lbl, text);
		changed = true;
	}
	if (visible) {
		lv_obj_remove_flag(lbl, LV_OBJ_FLAG_HIDDEN);
	} else {
		lv_obj_add_flag(lbl, LV_OBJ_FLAG_HIDDEN);
	}
	return changed;
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
	lv_obj_add_flag(clip, LV_OBJ_FLAG_EVENT_BUBBLE);
	lv_obj_set_style_bg_opa(clip, LV_OPA_TRANSP, 0);
	return clip;
}

static void hmi_pass_touch(lv_obj_t *obj)
{
	lv_obj_clear_flag(obj, LV_OBJ_FLAG_CLICKABLE);
	lv_obj_add_flag(obj, LV_OBJ_FLAG_EVENT_BUBBLE);
}

static void style_filled_panel(lv_obj_t *obj, lv_color_t bg)
{
	lv_obj_set_style_bg_color(obj, bg, 0);
	lv_obj_set_style_bg_opa(obj, LV_OPA_COVER, 0);
	lv_obj_set_style_border_width(obj, 0, 0);
	lv_obj_set_style_radius(obj, 0, 0);
	lv_obj_set_style_pad_all(obj, 0, 0);
}

static void set_title_row_visible(lv_obj_t *title_lbl, bool visible)
{
	if (title_lbl == NULL) {
		return;
	}
	lv_obj_t *clip = lv_obj_get_parent(title_lbl);
	set_visible(clip, visible);
}

static lv_obj_t *create_card_panel(lv_obj_t *parent, int x, int y, int w, int h, lv_color_t fill)
{
	lv_obj_t *panel = lv_obj_create(parent);
	lv_obj_remove_style_all(panel);
	lv_obj_set_pos(panel, x, y);
	lv_obj_set_size(panel, w, h);
	style_filled_panel(panel, fill);
	lv_obj_clear_flag(panel, LV_OBJ_FLAG_SCROLLABLE);
	lv_obj_add_flag(panel, LV_OBJ_FLAG_EVENT_BUBBLE);
	return panel;
}

static void hmi_init_scroll_styles(void)
{
	if (s_scroll_styles_ready) {
		return;
	}
	for (int i = 0; i < HMI_SCROLL_STYLE_SLOTS; i++) {
		lv_style_init(&s_scroll_styles[i]);
		lv_anim_init(&s_scroll_anims[i]);
		lv_anim_set_delay(&s_scroll_anims[i],
				  HMI_SCROLL_START_DELAY_MS + (uint32_t)i * HMI_SCROLL_STAGGER_MS);
		lv_anim_set_repeat_delay(&s_scroll_anims[i], HMI_SCROLL_PAUSE_MS);
		lv_anim_set_repeat_count(&s_scroll_anims[i], LV_ANIM_REPEAT_INFINITE);
		lv_style_set_anim(&s_scroll_styles[i], &s_scroll_anims[i]);
	}
	s_scroll_styles_ready = true;
}

static void hmi_attach_scroll_style(lv_obj_t *lbl, int style_slot)
{
	if (lbl == NULL || style_slot < 0 || style_slot >= HMI_SCROLL_STYLE_SLOTS) {
		return;
	}
	hmi_init_scroll_styles();
	lv_obj_add_style(lbl, &s_scroll_styles[style_slot], 0);
}

static bool hmi_text_overflows(lv_obj_t *lbl, int32_t clip_w)
{
	const char *text = lv_label_get_text(lbl);
	const lv_font_t *font = lv_obj_get_style_text_font(lbl, LV_PART_MAIN);
	if (text == NULL || font == NULL || text[0] == '\0') {
		return false;
	}

	lv_point_t size;
	lv_text_get_size(&size, text, font, lv_obj_get_style_text_letter_space(lbl, LV_PART_MAIN),
			 lv_obj_get_style_text_line_space(lbl, LV_PART_MAIN), LV_COORD_MAX, LV_TEXT_FLAG_EXPAND);
	return size.x > clip_w;
}

static void hmi_apply_scroll(lv_obj_t *lbl, int style_slot, int32_t clip_w, bool text_changed)
{
	if (lbl == NULL || !text_changed) {
		return;
	}
	if (style_slot < 0 || style_slot >= HMI_SCROLL_STYLE_SLOTS) {
		style_slot = 0;
	}

	lv_obj_set_width(lbl, clip_w);
	if (!hmi_text_overflows(lbl, clip_w)) {
		lv_label_set_long_mode(lbl, LV_LABEL_LONG_CLIP);
		return;
	}
	lv_label_set_long_mode(lbl, LV_LABEL_LONG_SCROLL_CIRCULAR);
}

static void style_label_raw(lv_obj_t *lbl, const lv_font_t *font, lv_color_t color, lv_text_align_t align)
{
	lv_obj_set_style_text_font(lbl, font, 0);
	lv_obj_set_style_text_color(lbl, color, 0);
	lv_obj_set_style_text_align(lbl, align, 0);
	lv_obj_set_style_text_line_space(lbl, 0, 0);
	lv_obj_set_style_pad_all(lbl, 0, 0);
}

static void style_label_line(lv_obj_t *lbl, const lv_font_t *font, lv_color_t color, lv_text_align_t align)
{
	style_label_raw(lbl, font, color, align);
	lv_obj_set_height(lbl, lv_font_get_line_height(font));
}

static void style_clip_text_label(lv_obj_t *lbl, const lv_font_t *font, lv_color_t color, lv_text_align_t align)
{
	style_label_raw(lbl, font, color, align);
	lv_label_set_long_mode(lbl, LV_LABEL_LONG_CLIP);
}

static void layout_list_row(int slot, int y, lv_obj_t *time_lbl, lv_obj_t *title_lbl)
{
	lv_obj_t *clip = lv_obj_get_parent(title_lbl);

	lv_obj_set_pos(time_lbl, HMI_PAD_X, y + HMI_ROW_TEXT_DY);
	lv_obj_set_size(time_lbl, HMI_LIST_TIME_W, HMI_FONT_BODY_LINE);
	lv_obj_set_pos(clip, HMI_LIST_TITLE_X, y);
	lv_obj_set_size(clip, HMI_LIST_TITLE_W, HMI_LIST_ROW);
	lv_obj_set_pos(title_lbl, 0, HMI_ROW_TEXT_DY);
	lv_obj_set_height(title_lbl, HMI_FONT_BODY_LINE);
}

static void render_list_day_header(int slot, int y, lv_obj_t *time_lbl, lv_obj_t *title_lbl, int64_t day_unix)
{
	char buf[32];
	lv_obj_t *clip = lv_obj_get_parent(title_lbl);

	set_label(time_lbl, "", false);
	set_visible(time_lbl, false);
	lv_obj_set_pos(clip, HMI_PAD_X, y);
	lv_obj_set_size(clip, HMI_CARD_W, HMI_LIST_ROW);
	lv_obj_set_pos(title_lbl, 0, HMI_ROW_TEXT_DY);
	lv_obj_set_height(title_lbl, HMI_FONT_BODY_LINE);
	style_label_line(title_lbl, FONT_BODY, COLOR_CYAN, LV_TEXT_ALIGN_LEFT);
	lv_label_set_long_mode(title_lbl, LV_LABEL_LONG_DOT);
	format_day_header_short(buf, sizeof(buf), day_unix);
	set_label(title_lbl, buf, true);
	set_visible(clip, true);
}

static void render_list_event_row(int slot, int y, lv_obj_t *time_lbl, lv_obj_t *title_lbl, const alerts_event_t *e)
{
	char timebuf[8];

	format_event_time(timebuf, sizeof(timebuf), e->start_unix);
	layout_list_row(slot, y, time_lbl, title_lbl);
	style_label_line(time_lbl, FONT_BODY, COLOR_CYAN, LV_TEXT_ALIGN_LEFT);
	lv_label_set_long_mode(time_lbl, LV_LABEL_LONG_CLIP);
	set_label(time_lbl, timebuf, true);
	set_visible(time_lbl, true);
	const bool title_changed = set_label(title_lbl, e->title, true);
	if (title_changed) {
		style_clip_text_label(title_lbl, FONT_BODY, COLOR_MUTED, LV_TEXT_ALIGN_LEFT);
	}
	set_title_row_visible(title_lbl, true);
	hmi_apply_scroll(title_lbl, slot, HMI_LIST_TITLE_W, title_changed);
}

static void clear_list_slots(int from_slot, int slot_count)
{
	for (int slot = from_slot; slot < slot_count; slot++) {
		set_label(s_ui.list_time_lbl[slot], "", false);
		set_visible(s_ui.list_time_lbl[slot], false);
		set_label(s_ui.list_title_lbl[slot], "", false);
		set_title_row_visible(s_ui.list_title_lbl[slot], false);
	}
}

static void render_timed_list(int y_start, int max_slots, const alerts_event_t *events, size_t count, int focus_day)
{
	int slot = 0;
	int last_day = focus_day;

	for (size_t i = 0; i < count && slot < max_slots; i++) {
		const alerts_event_t *e = &events[i];
		const int day = event_day_key(e->start_unix);
		const int y = y_start + slot * HMI_LIST_ROW;

		if (day != last_day) {
			if (slot < max_slots) {
				render_list_day_header(slot, y, s_ui.list_time_lbl[slot], s_ui.list_title_lbl[slot],
						       e->start_unix);
				slot++;
				last_day = day;
			}
		}

		if (slot < max_slots) {
			const int row_y = y_start + slot * HMI_LIST_ROW;
			render_list_event_row(slot, row_y, s_ui.list_time_lbl[slot], s_ui.list_title_lbl[slot], e);
			slot++;
		}
	}

	clear_list_slots(slot, HMI_LIST_SLOTS);
}

static void background_click_cb(lv_event_t *e)
{
	const lv_event_code_t code = lv_event_get_code(e);
	if ((code == LV_EVENT_CLICKED || code == LV_EVENT_SHORT_CLICKED) && s_background_tap_cb != NULL) {
		s_background_tap_cb();
	}
}

static void overlay_click_cb(lv_event_t *e)
{
	const lv_event_code_t code = lv_event_get_code(e);
	if ((code == LV_EVENT_CLICKED || code == LV_EVENT_SHORT_CLICKED) && s_background_tap_cb != NULL) {
		lv_event_stop_bubbling(e);
		s_background_tap_cb();
	}
}

static void focus_card_click_cb(lv_event_t *e)
{
	const lv_event_code_t code = lv_event_get_code(e);
	if (code != LV_EVENT_CLICKED && code != LV_EVENT_SHORT_CLICKED) {
		return;
	}
	lv_event_stop_bubbling(e);
	if (s_focus_tap_dismiss) {
		if (s_dismiss_tap_cb != NULL) {
			s_dismiss_tap_cb();
		}
		return;
	}
	if (s_background_tap_cb != NULL) {
		s_background_tap_cb();
	}
}

static void bg_opa_cb(void *obj, int32_t v)
{
	lv_obj_set_style_bg_opa((lv_obj_t *)obj, (lv_opa_t)v, 0);
}

static void alert_blink_start(lv_obj_t *card)
{
	lv_anim_del(card, bg_opa_cb);
	lv_anim_t anim;
	lv_anim_init(&anim);
	lv_anim_set_var(&anim, card);
	lv_anim_set_exec_cb(&anim, bg_opa_cb);
	lv_anim_set_values(&anim, LV_OPA_40, LV_OPA_COVER);
	lv_anim_set_duration(&anim, 500);
	lv_anim_set_playback_duration(&anim, 500);
	lv_anim_set_repeat_count(&anim, LV_ANIM_REPEAT_INFINITE);
	lv_anim_start(&anim);
}

static void alert_blink_stop(lv_obj_t *card)
{
	if (card == NULL) {
		return;
	}
	lv_anim_del(card, bg_opa_cb);
	lv_obj_set_style_bg_opa(card, LV_OPA_COVER, 0);
}

static void set_card_style(lv_obj_t *card, lv_obj_t *caption, lv_obj_t *title, lv_obj_t *time_lbl, lv_color_t fill,
			   bool text_on_fill)
{
	style_filled_panel(card, fill);
	if (text_on_fill) {
		lv_obj_set_style_text_color(caption, COLOR_TEXT_ON_FILL, 0);
		lv_obj_set_style_text_color(title, COLOR_TEXT_ON_FILL, 0);
		lv_obj_set_style_text_color(time_lbl, COLOR_TEXT_ON_FILL, 0);
	} else {
		lv_obj_set_style_text_color(caption, COLOR_MUTED, 0);
		lv_obj_set_style_text_color(title, COLOR_CYAN, 0);
		lv_obj_set_style_text_color(time_lbl, COLOR_MUTED, 0);
	}
}

static void hmi_wire_overlay_tap(lv_obj_t *obj)
{
	lv_obj_add_flag(obj, LV_OBJ_FLAG_CLICKABLE);
	lv_obj_add_event_cb(obj, overlay_click_cb, LV_EVENT_CLICKED, NULL);
}

static void build_list_row_labels(lv_obj_t **time_labels, lv_obj_t **title_labels, lv_obj_t *parent, int y_start,
				  int count, int row_h)
{
	for (int i = 0; i < count; i++) {
		const int y = y_start + i * row_h;

		time_labels[i] = lv_label_create(parent);
		lv_obj_set_pos(time_labels[i], HMI_PAD_X, y + HMI_ROW_TEXT_DY);
		lv_obj_set_size(time_labels[i], HMI_LIST_TIME_W, HMI_FONT_BODY_LINE);
		style_label_line(time_labels[i], FONT_BODY, COLOR_CYAN, LV_TEXT_ALIGN_LEFT);
		lv_label_set_long_mode(time_labels[i], LV_LABEL_LONG_CLIP);
		hmi_wire_overlay_tap(time_labels[i]);
		lv_obj_add_flag(time_labels[i], LV_OBJ_FLAG_HIDDEN);

		lv_obj_t *clip = create_text_clip(parent, HMI_LIST_TITLE_X, y, HMI_LIST_TITLE_W, HMI_LIST_ROW);
		title_labels[i] = lv_label_create(clip);
		style_clip_text_label(title_labels[i], FONT_BODY, COLOR_MUTED, LV_TEXT_ALIGN_LEFT);
		lv_obj_set_width(title_labels[i], HMI_LIST_TITLE_W);
		hmi_attach_scroll_style(title_labels[i], i);
		lv_obj_set_pos(title_labels[i], 0, HMI_ROW_TEXT_DY);
		lv_obj_set_height(title_labels[i], HMI_FONT_BODY_LINE);
		hmi_wire_overlay_tap(clip);
		lv_obj_add_flag(clip, LV_OBJ_FLAG_HIDDEN);
	}
}

static void wire_card_labels(lv_obj_t *card, lv_obj_t **caption, lv_obj_t **title, lv_obj_t **time_lbl, int card_y,
			     int caption_y, int title_y, int time_y)
{
	*caption = lv_label_create(card);
	lv_obj_set_pos(*caption, HMI_CARD_PAD, caption_y - card_y);
	lv_obj_set_width(*caption, HMI_CARD_INNER_W);
	style_label_line(*caption, FONT_BODY, COLOR_MUTED, LV_TEXT_ALIGN_LEFT);
	hmi_pass_touch(*caption);

	lv_obj_t *clip = create_text_clip(card, HMI_CARD_PAD, title_y - card_y, HMI_CARD_INNER_W, HMI_FOCUS_TITLE_H);
	*title = lv_label_create(clip);
	style_clip_text_label(*title, FONT_BODY, COLOR_CYAN, LV_TEXT_ALIGN_LEFT);
	lv_obj_set_width(*title, HMI_CARD_INNER_W);
	hmi_attach_scroll_style(*title, 0);
	lv_obj_set_height(*title, HMI_FOCUS_TITLE_H);
	hmi_pass_touch(*title);

	*time_lbl = lv_label_create(card);
	lv_obj_set_pos(*time_lbl, HMI_CARD_PAD, time_y - card_y);
	lv_obj_set_width(*time_lbl, HMI_CARD_INNER_W);
	style_label_line(*time_lbl, FONT_BODY, COLOR_MUTED, LV_TEXT_ALIGN_LEFT);
	hmi_pass_touch(*time_lbl);
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
	lv_obj_add_event_cb(s_ui.root, background_click_cb, LV_EVENT_CLICKED, NULL);

	s_ui.date_lbl = lv_label_create(s_ui.root);
	lv_obj_set_pos(s_ui.date_lbl, HMI_PAD_X, HMI_HEADER_Y);
	lv_obj_set_width(s_ui.date_lbl, HMI_CARD_W - HMI_SYNC_W);
	style_label_line(s_ui.date_lbl, FONT_BODY, COLOR_DATE, LV_TEXT_ALIGN_LEFT);
	lv_label_set_long_mode(s_ui.date_lbl, LV_LABEL_LONG_DOT);
	hmi_pass_touch(s_ui.date_lbl);

	s_ui.sync_lbl = lv_label_create(s_ui.root);
	lv_obj_set_size(s_ui.sync_lbl, HMI_SYNC_W, HMI_HEADER_H);
	style_label_line(s_ui.sync_lbl, FONT_BODY, COLOR_SYNC, LV_TEXT_ALIGN_RIGHT);
	lv_obj_align(s_ui.sync_lbl, LV_ALIGN_TOP_RIGHT, -HMI_PAD_X, HMI_HEADER_Y);
	lv_label_set_long_mode(s_ui.sync_lbl, LV_LABEL_LONG_CLIP);
	hmi_pass_touch(s_ui.sync_lbl);
	lv_obj_add_flag(s_ui.sync_lbl, LV_OBJ_FLAG_HIDDEN);

	s_ui.clock_lbl = lv_label_create(s_ui.root);
	lv_obj_set_pos(s_ui.clock_lbl, HMI_PAD_X, HMI_CLOCK_Y);
	lv_obj_set_size(s_ui.clock_lbl, HMI_CARD_W, HMI_CLOCK_H);
	style_label_line(s_ui.clock_lbl, FONT_BODY, COLOR_CYAN, LV_TEXT_ALIGN_LEFT);
	hmi_pass_touch(s_ui.clock_lbl);

	s_ui.focus_card = create_card_panel(s_ui.root, HMI_PAD_X, HMI_CARD_Y, HMI_CARD_W, HMI_CARD_H, COLOR_CARD_AMBIENT);
	wire_card_labels(s_ui.focus_card, &s_ui.focus_caption_lbl, &s_ui.focus_title_lbl, &s_ui.focus_time_lbl, HMI_CARD_Y,
			 HMI_FOCUS_CAPTION_Y, HMI_FOCUS_TITLE_Y, HMI_FOCUS_TIME_Y);
	lv_obj_add_flag(s_ui.focus_card, LV_OBJ_FLAG_HIDDEN);
	lv_obj_add_event_cb(s_ui.focus_card, focus_card_click_cb, LV_EVENT_CLICKED, NULL);

	s_ui.secondary_card =
		create_card_panel(s_ui.root, HMI_PAD_X, HMI_SECONDARY_CARD_Y, HMI_CARD_W, HMI_CARD_H, COLOR_CARD_AMBIENT);
	wire_card_labels(s_ui.secondary_card, &s_ui.secondary_caption_lbl, &s_ui.secondary_title_lbl,
			 &s_ui.secondary_time_lbl, HMI_SECONDARY_CARD_Y, HMI_SECONDARY_CAPTION_Y, HMI_SECONDARY_TITLE_Y,
			 HMI_SECONDARY_TIME_Y);
	lv_obj_add_flag(s_ui.secondary_card, LV_OBJ_FLAG_HIDDEN);
	lv_obj_add_event_cb(s_ui.secondary_card, overlay_click_cb, LV_EVENT_CLICKED, NULL);

	build_list_row_labels(s_ui.list_time_lbl, s_ui.list_title_lbl, s_ui.root, HMI_LIST_Y, HMI_LIST_SLOTS,
			      HMI_LIST_ROW);

	s_ui.empty_title_lbl = lv_label_create(s_ui.root);
	lv_obj_set_pos(s_ui.empty_title_lbl, 0, HMI_EMPTY_TITLE_Y);
	lv_obj_set_width(s_ui.empty_title_lbl, WS_LCD_H_RES);
	style_label_raw(s_ui.empty_title_lbl, FONT_BODY, COLOR_CYAN, LV_TEXT_ALIGN_CENTER);
	hmi_pass_touch(s_ui.empty_title_lbl);
	lv_obj_add_flag(s_ui.empty_title_lbl, LV_OBJ_FLAG_HIDDEN);

	s_ui.overlay = lv_obj_create(s_ui.root);
	lv_obj_remove_style_all(s_ui.overlay);
	lv_obj_set_pos(s_ui.overlay, HMI_OVERLAY_INSET, HMI_OVERLAY_INSET);
	lv_obj_set_size(s_ui.overlay, HMI_OVERLAY_W, HMI_OVERLAY_H);
	lv_obj_clear_flag(s_ui.overlay, LV_OBJ_FLAG_SCROLLABLE);
	lv_obj_set_style_bg_opa(s_ui.overlay, LV_OPA_TRANSP, 0);
	lv_obj_add_flag(s_ui.overlay, LV_OBJ_FLAG_CLICKABLE);
	lv_obj_add_event_cb(s_ui.overlay, overlay_click_cb, LV_EVENT_CLICKED, NULL);
	lv_obj_add_flag(s_ui.overlay, LV_OBJ_FLAG_HIDDEN);

	lv_obj_move_foreground(s_ui.focus_card);
	lv_obj_move_foreground(s_ui.secondary_card);

	s_ui.last_state = ALERTS_HMI_EMPTY;
	ESP_LOGI(TAG, "lvgl widgets ready");
	return ESP_OK;
}

static void move_list_to_foreground(void)
{
	for (int i = 0; i < HMI_LIST_SLOTS; i++) {
		lv_obj_move_foreground(s_ui.list_time_lbl[i]);
		lv_obj_move_foreground(lv_obj_get_parent(s_ui.list_title_lbl[i]));
	}
}

static void render_overlay_layer(const alerts_hmi_frame_t *frame)
{
	char buf[32];

	set_visible(s_ui.clock_lbl, false);
	set_visible(s_ui.focus_card, false);
	set_visible(s_ui.secondary_card, false);
	set_visible(s_ui.empty_title_lbl, false);

	set_label(s_ui.date_lbl, "PROXIMOS", true);
	lv_obj_set_style_text_color(s_ui.date_lbl, COLOR_CYAN, 0);
	snprintf(buf, sizeof(buf), "(%u)", (unsigned)frame->overlay_upcoming_total);
	set_label(s_ui.sync_lbl, buf, true);
	set_visible(s_ui.sync_lbl, true);
	lv_obj_set_style_text_color(s_ui.sync_lbl, COLOR_MUTED, 0);

	const int focus_day = frame->has_focus ? event_day_key(frame->focus.start_unix) : -1;
	render_timed_list(HMI_OVERLAY_LIST_Y, HMI_LIST_SLOTS, frame->overlay_list, frame->overlay_list_count,
			  focus_day);

	lv_obj_move_foreground(s_ui.date_lbl);
	lv_obj_move_foreground(s_ui.sync_lbl);
	move_list_to_foreground();
}

static void render_card_content(lv_obj_t *card, lv_obj_t *caption, lv_obj_t *title, lv_obj_t *time_lbl,
				const alerts_event_t *event, int64_t now, bool is_now, const char *caption_text,
				lv_color_t fill, bool text_on_fill)
{
	set_visible(card, true);
	set_card_style(card, caption, title, time_lbl, fill, text_on_fill);
	set_label(caption, caption_text, true);
	const bool title_changed = set_label(title, event->title, true);
	set_title_row_visible(title, true);
	hmi_apply_scroll(title, 0, HMI_CARD_INNER_W, title_changed);

	char buf[96];
	if (is_now) {
		format_now_until(buf, sizeof(buf), event);
		set_label(time_lbl, buf, buf[0] != '\0');
	} else {
		format_focus_countdown(buf, sizeof(buf), now, event->start_unix);
		set_label(time_lbl, buf, true);
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
		lv_obj_clear_flag(s_ui.focus_card, LV_OBJ_FLAG_CLICKABLE);
		return;
	}

	const char *caption = "PROXIMO";
	lv_color_t fill = COLOR_CARD_AMBIENT;
	bool text_on_fill = false;
	if (is_alert) {
		caption = "ALERTA";
		fill = COLOR_ALERT;
		text_on_fill = true;
	} else if (is_now) {
		caption = "AGORA";
		fill = COLOR_NOW;
		text_on_fill = true;
	}
	s_focus_tap_dismiss = is_now;
	lv_obj_add_flag(s_ui.focus_card, LV_OBJ_FLAG_CLICKABLE);

	render_card_content(s_ui.focus_card, s_ui.focus_caption_lbl, s_ui.focus_title_lbl, s_ui.focus_time_lbl,
			    &frame->focus, now, is_now, caption, fill, text_on_fill);
}

static void render_secondary_card(const alerts_hmi_frame_t *frame, int64_t now)
{
	const bool show = frame->state == ALERTS_HMI_NOW && frame->has_secondary;
	set_visible(s_ui.secondary_card, show);
	if (!show) {
		lv_obj_clear_flag(s_ui.secondary_card, LV_OBJ_FLAG_CLICKABLE);
		return;
	}
	lv_obj_add_flag(s_ui.secondary_card, LV_OBJ_FLAG_CLICKABLE);
	render_card_content(s_ui.secondary_card, s_ui.secondary_caption_lbl, s_ui.secondary_title_lbl,
			    s_ui.secondary_time_lbl, &frame->secondary, now, false, "ALERTA", COLOR_ALERT, true);
}

esp_err_t alerts_hmi_lvgl_render(const alerts_hmi_frame_t *frame)
{
	if (frame == NULL) {
		return ESP_ERR_INVALID_ARG;
	}

	apply_frame_tz(frame->timezone);
	const int64_t now = frame->now_unix;
	char buf[96];

	s_ui.last_state = frame->state;
	s_ui.last_secondary = frame->has_secondary;

	if (frame->overlay_open) {
		alert_blink_stop(s_ui.focus_card);
		alert_blink_stop(s_ui.secondary_card);
		render_overlay_layer(frame);
		return ESP_OK;
	}

	lv_obj_add_flag(s_ui.overlay, LV_OBJ_FLAG_HIDDEN);

	lv_obj_set_style_text_color(s_ui.date_lbl, COLOR_DATE, 0);

	format_clock_line(buf, sizeof(buf), now);
	set_label(s_ui.clock_lbl, buf, true);
	set_visible(s_ui.clock_lbl, true);

	format_date_line(buf, sizeof(buf), now);
	set_label(s_ui.date_lbl, buf, true);

	format_sync_label(buf, sizeof(buf), frame);
	if (buf[0] != '\0') {
		const bool fresh = sync_is_fresh(frame);
		set_label(s_ui.sync_lbl, buf, true);
		lv_obj_set_style_text_color(s_ui.sync_lbl, fresh ? COLOR_SYNC : COLOR_MUTED, 0);
	} else {
		set_visible(s_ui.sync_lbl, false);
	}

	render_focus_card(frame, now);
	render_secondary_card(frame, now);

	alert_blink_stop(s_ui.focus_card);
	alert_blink_stop(s_ui.secondary_card);
	if (frame->state == ALERTS_HMI_ALERT) {
		alert_blink_start(s_ui.focus_card);
	} else if (frame->has_secondary) {
		alert_blink_start(s_ui.secondary_card);
	}

	const bool is_empty = frame->state == ALERTS_HMI_EMPTY;
	set_visible(s_ui.empty_title_lbl, is_empty);
	if (is_empty) {
		set_label(s_ui.empty_title_lbl, "SEM EVENTOS", true);
	}

	const bool show_list = !(frame->state == ALERTS_HMI_NOW && frame->has_secondary);
	if (show_list && frame->ambient_list_count > 0) {
		const int focus_day = frame->has_focus ? event_day_key(frame->focus.start_unix) : -1;
		render_timed_list(HMI_LIST_Y, HMI_AMBIENT_LIST_SLOTS, frame->ambient_list, frame->ambient_list_count,
				  focus_day);
	} else {
		render_timed_list(HMI_LIST_Y, HMI_LIST_SLOTS, NULL, 0, -1);
	}

	return ESP_OK;
}
