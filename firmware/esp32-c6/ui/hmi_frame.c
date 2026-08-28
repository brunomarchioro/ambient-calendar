#include "hmi_frame.h"

#include <string.h>

void alerts_hmi_present_init(alerts_hmi_present_t *present)
{
	if (present == NULL) {
		return;
	}
	present->overlay_open = false;
	present->overlay_elapsed_ms = 0;
}

void alerts_hmi_present_tap(alerts_hmi_present_t *present)
{
	if (present == NULL) {
		return;
	}
	if (present->overlay_open) {
		present->overlay_open = false;
		present->overlay_elapsed_ms = 0;
	} else {
		present->overlay_open = true;
		present->overlay_elapsed_ms = 0;
	}
}

void alerts_hmi_present_tick(alerts_hmi_present_t *present, int elapsed_ms)
{
	if (present == NULL || !present->overlay_open || elapsed_ms <= 0) {
		return;
	}
	present->overlay_elapsed_ms += elapsed_ms;
	if (present->overlay_elapsed_ms >= ALERTS_HMI_OVERLAY_TIMEOUT_MS) {
		present->overlay_open = false;
		present->overlay_elapsed_ms = 0;
	}
}

static int cmp_event(const alerts_event_t *a, const alerts_event_t *b)
{
	if (a->start_unix != b->start_unix) {
		return (a->start_unix < b->start_unix) ? -1 : 1;
	}
	return strcmp(a->id, b->id);
}

static bool is_timed(const alerts_event_t *e)
{
	return e != NULL && !e->all_day;
}

static int64_t now_end(const alerts_event_t *e)
{
	if (!e->has_end) {
		return e->start_unix + 120;
	}
	int64_t cap = e->start_unix + 120;
	return (e->end_unix < cap) ? e->end_unix : cap;
}

static bool in_now(int64_t now, const alerts_event_t *e)
{
	if (!is_timed(e)) {
		return false;
	}
	return now >= e->start_unix && now < now_end(e);
}

static bool in_alert(int64_t now, int reminder_min, const alerts_event_t *e)
{
	int64_t lead;
	if (!is_timed(e)) {
		return false;
	}
	lead = (int64_t)reminder_min * 60;
	return now >= (e->start_unix - lead) && now < e->start_unix;
}

static const alerts_event_t *pick_focus(int64_t now, int reminder_min, const alerts_schedule_t *s, bool want_now)
{
	const alerts_event_t *best = NULL;
	size_t i;
	for (i = 0; i < s->event_count; i++) {
		const alerts_event_t *e = &s->events[i];
		bool hit = want_now ? in_now(now, e) : in_alert(now, reminder_min, e);
		if (!hit) {
			continue;
		}
		if (best == NULL || cmp_event(e, best) < 0) {
			best = e;
		}
	}
	return best;
}

static const alerts_event_t *pick_next_timed(int64_t now, const alerts_schedule_t *s)
{
	const alerts_event_t *best = NULL;
	size_t i;
	for (i = 0; i < s->event_count; i++) {
		const alerts_event_t *e = &s->events[i];
		if (!is_timed(e) || e->start_unix <= now) {
			continue;
		}
		if (best == NULL || cmp_event(e, best) < 0) {
			best = e;
		}
	}
	return best;
}

static size_t collect_upcoming(int64_t now, const alerts_schedule_t *s, const alerts_event_t *skip, alerts_event_t *out,
			       size_t max_out)
{
	alerts_event_t tmp[ALERTS_MAX_EVENTS];
	size_t tmp_count = 0;
	size_t i;
	size_t n;

	for (i = 0; i < s->event_count; i++) {
		const alerts_event_t *e = &s->events[i];
		if (skip != NULL && strcmp(e->id, skip->id) == 0) {
			continue;
		}
		if (e->start_unix <= now) {
			continue;
		}
		if (tmp_count < ALERTS_MAX_EVENTS) {
			tmp[tmp_count++] = *e;
		}
	}
	for (i = 0; i < tmp_count; i++) {
		size_t j;
		for (j = i + 1; j < tmp_count; j++) {
			if (cmp_event(&tmp[j], &tmp[i]) < 0) {
				alerts_event_t swap = tmp[i];
				tmp[i] = tmp[j];
				tmp[j] = swap;
			}
		}
	}
	n = 0;
	for (i = 0; i < tmp_count && n < max_out; i++) {
		out[n++] = tmp[i];
	}
	return n;
}

static void fill_ambient_list(int64_t now, const alerts_schedule_t *s, const alerts_event_t *skip,
			      alerts_hmi_frame_t *out)
{
	size_t limit = (size_t)s->show_next_events;
	if (limit > ALERTS_MAX_EVENTS) {
		limit = ALERTS_MAX_EVENTS;
	}
	out->ambient_list_count = collect_upcoming(now, s, skip, out->ambient_list, limit);
}

static void fill_overlay_list(int64_t now, const alerts_schedule_t *s, alerts_hmi_frame_t *out)
{
	size_t limit = (size_t)s->show_next_events;
	if (limit > ALERTS_MAX_EVENTS) {
		limit = ALERTS_MAX_EVENTS;
	}
	out->overlay_list_count = collect_upcoming(now, s, NULL, out->overlay_list, limit);
}

static void set_focus(alerts_hmi_frame_t *out, const alerts_event_t *e)
{
	out->has_focus = true;
	out->focus = *e;
}

static int eval_background(int64_t now_unix, const alerts_schedule_t *schedule, alerts_hmi_frame_t *out)
{
	const alerts_event_t *focus_now;
	const alerts_event_t *focus_alert;
	const alerts_event_t *next_timed;

	focus_now = pick_focus(now_unix, schedule->reminder_minutes, schedule, true);
	if (focus_now != NULL) {
		out->state = ALERTS_HMI_NOW;
		set_focus(out, focus_now);
		return 0;
	}

	focus_alert = pick_focus(now_unix, schedule->reminder_minutes, schedule, false);
	if (focus_alert != NULL) {
		out->state = ALERTS_HMI_ALERT;
		set_focus(out, focus_alert);
		return 0;
	}

	next_timed = pick_next_timed(now_unix, schedule);
	if (next_timed != NULL) {
		out->state = ALERTS_HMI_AMBIENT;
		set_focus(out, next_timed);
		fill_ambient_list(now_unix, schedule, next_timed, out);
		return 0;
	}

	out->state = ALERTS_HMI_EMPTY;
	return 0;
}

int alerts_hmi_build_frame(int64_t now_unix, const alerts_schedule_t *schedule, const alerts_hmi_present_t *present,
			   alerts_hmi_frame_t *out)
{
	bool overlay_open = present != NULL && present->overlay_open;

	if (out == NULL) {
		return -1;
	}
	memset(out, 0, sizeof(*out));
	out->now_unix = now_unix;
	out->overlay_open = overlay_open;

	if (schedule == NULL) {
		out->state = ALERTS_HMI_EMPTY;
		return 0;
	}

	strncpy(out->timezone, schedule->timezone, sizeof(out->timezone) - 1);
	out->timezone[sizeof(out->timezone) - 1] = '\0';

	if (eval_background(now_unix, schedule, out) != 0) {
		return -1;
	}

	if (overlay_open) {
		fill_overlay_list(now_unix, schedule, out);
	}
	return 0;
}

const char *alerts_hmi_state_name(alerts_hmi_state_t state)
{
	switch (state) {
	case ALERTS_HMI_NOW:
		return "Now";
	case ALERTS_HMI_ALERT:
		return "Alert";
	case ALERTS_HMI_AMBIENT:
		return "Ambient";
	case ALERTS_HMI_EMPTY:
	default:
		return "Empty";
	}
}
