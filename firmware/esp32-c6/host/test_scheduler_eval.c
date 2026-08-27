#include <assert.h>
#include <stdio.h>
#include <string.h>

#include "../scheduler/scheduler_eval.h"
#include "../storage/schedule.h"

static alerts_event_t ev(const char *id, const char *title, int64_t start, int64_t end, bool all_day, bool has_end)
{
	alerts_event_t e = {0};
	strncpy(e.id, id, sizeof(e.id) - 1);
	strncpy(e.title, title, sizeof(e.title) - 1);
	e.start_unix = start;
	e.end_unix = end;
	e.has_end = has_end;
	e.all_day = all_day;
	return e;
}

static alerts_schedule_t sched(int reminder, int show, alerts_event_t *events, size_t n)
{
	alerts_schedule_t s = {0};
	s.reminder_minutes = reminder;
	s.show_next_events = show;
	s.event_count = n;
	for (size_t i = 0; i < n; i++) {
		s.events[i] = events[i];
	}
	return s;
}

int main(void)
{
	alerts_hmi_view_t view;
	alerts_event_t events[4];
	alerts_schedule_t s;

	/* Empty — no future timed */
	s = sched(30, 2, events, 0);
	assert(alerts_scheduler_eval(1787850000, &s, &view) == 0);
	assert(view.state == ALERTS_HMI_EMPTY);

	/* Ambient — future timed at 15:00, now 14:00 */
	events[0] = ev("a", "Reunião", 1787853600, 1787857200, false, true);
	s = sched(30, 2, events, 1);
	assert(alerts_scheduler_eval(1787850000, &s, &view) == 0);
	assert(view.state == ALERTS_HMI_AMBIENT);
	assert(view.focus != NULL && strcmp(view.focus->id, "a") == 0);

	/* Alert — 14:45 with 30 min reminder, event 15:00 */
	assert(alerts_scheduler_eval(1787852700, &s, &view) == 0);
	assert(view.state == ALERTS_HMI_ALERT);
	assert(strcmp(view.focus->title, "Reunião") == 0);

	/* Now — 15:00 */
	assert(alerts_scheduler_eval(1787853600, &s, &view) == 0);
	assert(view.state == ALERTS_HMI_NOW);

	/* All-day never Alert/Now */
	events[0] = ev("all", "Feriado", 1787936400, 1788022800, true, true);
	s = sched(30, 2, events, 1);
	assert(alerts_scheduler_eval(1787850000, &s, &view) == 0);
	assert(view.state == ALERTS_HMI_EMPTY);

	/* Focus tie — two alert candidates, earlier start wins */
	events[0] = ev("b", "Later", 1787857200, 1787860800, false, true);
	events[1] = ev("a", "Earlier", 1787853600, 1787857200, false, true);
	s = sched(30, 2, events, 2);
	assert(alerts_scheduler_eval(1787852700, &s, &view) == 0);
	assert(view.state == ALERTS_HMI_ALERT);
	assert(strcmp(view.focus->id, "a") == 0);

	/* Focus tie — same start, lexicographic id */
	events[0] = ev("b", "B", 1787853600, 1787857200, false, true);
	events[1] = ev("a", "A", 1787853600, 1787857200, false, true);
	s = sched(30, 2, events, 2);
	assert(alerts_scheduler_eval(1787853600, &s, &view) == 0);
	assert(view.state == ALERTS_HMI_NOW);
	assert(strcmp(view.focus->id, "a") == 0);

	puts("ok");
	return 0;
}
