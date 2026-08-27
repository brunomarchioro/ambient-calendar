#include "scheduler_eval.h"

#include <string.h>

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

static void fill_list(int64_t now, const alerts_schedule_t *s, const alerts_event_t *skip, alerts_hmi_view_t *out)
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
	for (i = 0; i < tmp_count && n < (size_t)s->show_next_events; i++) {
		out->list[n++] = tmp[i];
	}
	out->list_count = n;
}

int alerts_scheduler_eval(int64_t now_unix, const alerts_schedule_t *schedule, alerts_hmi_view_t *out)
{
	const alerts_event_t *focus_now;
	const alerts_event_t *focus_alert;

	if (out == NULL || schedule == NULL) {
		return -1;
	}
	memset(out, 0, sizeof(*out));

	focus_now = pick_focus(now_unix, schedule->reminder_minutes, schedule, true);
	if (focus_now != NULL) {
		out->state = ALERTS_HMI_NOW;
		out->focus = focus_now;
		out->next_timed = focus_now;
		return 0;
	}

	focus_alert = pick_focus(now_unix, schedule->reminder_minutes, schedule, false);
	if (focus_alert != NULL) {
		out->state = ALERTS_HMI_ALERT;
		out->focus = focus_alert;
		out->next_timed = focus_alert;
		return 0;
	}

	out->next_timed = pick_next_timed(now_unix, schedule);
	if (out->next_timed != NULL) {
		out->state = ALERTS_HMI_AMBIENT;
		out->focus = out->next_timed;
		fill_list(now_unix, schedule, out->next_timed, out);
		return 0;
	}

	out->state = ALERTS_HMI_EMPTY;
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
