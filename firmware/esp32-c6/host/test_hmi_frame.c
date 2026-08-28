#include <assert.h>
#include <stdio.h>
#include <string.h>

#include "../ui/hmi_frame.h"
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
	alerts_hmi_frame_t frame;
	alerts_event_t events[4];
	alerts_schedule_t s;

	/* Empty — no future timed */
	s = sched(30, 2, events, 0);
	assert(alerts_hmi_build_frame(1787850000, &s, false, &frame) == 0);
	assert(frame.state == ALERTS_HMI_EMPTY);
	assert(!frame.has_focus);

	/* schedule NULL */
	assert(alerts_hmi_build_frame(1787850000, NULL, false, &frame) == 0);
	assert(frame.state == ALERTS_HMI_EMPTY);
	assert(frame.now_unix == 1787850000);

	/* Ambient — future timed at 15:00, now 14:00 */
	events[0] = ev("a", "Reunião", 1787853600, 1787857200, false, true);
	s = sched(30, 2, events, 1);
	assert(alerts_hmi_build_frame(1787850000, &s, false, &frame) == 0);
	assert(frame.state == ALERTS_HMI_AMBIENT);
	assert(frame.has_focus && strcmp(frame.focus.id, "a") == 0);

	/* Alert — 14:45 with 30 min reminder, event 15:00 */
	assert(alerts_hmi_build_frame(1787852700, &s, false, &frame) == 0);
	assert(frame.state == ALERTS_HMI_ALERT);
	assert(strcmp(frame.focus.title, "Reunião") == 0);

	/* Now — 15:00 */
	assert(alerts_hmi_build_frame(1787853600, &s, false, &frame) == 0);
	assert(frame.state == ALERTS_HMI_NOW);

	/* All-day never Alert/Now */
	events[0] = ev("all", "Feriado", 1787936400, 1788022800, true, true);
	s = sched(30, 2, events, 1);
	assert(alerts_hmi_build_frame(1787850000, &s, false, &frame) == 0);
	assert(frame.state == ALERTS_HMI_EMPTY);

	/* Focus tie — two alert candidates, earlier start wins */
	events[0] = ev("b", "Later", 1787857200, 1787860800, false, true);
	events[1] = ev("a", "Earlier", 1787853600, 1787857200, false, true);
	s = sched(30, 2, events, 2);
	assert(alerts_hmi_build_frame(1787852700, &s, false, &frame) == 0);
	assert(frame.state == ALERTS_HMI_ALERT);
	assert(strcmp(frame.focus.id, "a") == 0);

	/* Focus tie — same start, lexicographic id */
	events[0] = ev("b", "B", 1787853600, 1787857200, false, true);
	events[1] = ev("a", "A", 1787853600, 1787857200, false, true);
	s = sched(30, 2, events, 2);
	assert(alerts_hmi_build_frame(1787853600, &s, false, &frame) == 0);
	assert(frame.state == ALERTS_HMI_NOW);
	assert(strcmp(frame.focus.id, "a") == 0);

	/* Overlay list — upcoming events regardless of Ambient state */
	events[0] = ev("a", "Reunião", 1787853600, 1787857200, false, true);
	events[1] = ev("b", "Jantar", 1787860800, 1787864400, false, true);
	s = sched(30, 2, events, 2);
	assert(alerts_hmi_build_frame(1787852700, &s, true, &frame) == 0);
	assert(frame.overlay_open);
	assert(frame.overlay_list_count == 2);
	assert(strcmp(frame.overlay_list[0].id, "a") == 0);
	assert(strcmp(frame.overlay_list[1].id, "b") == 0);

	puts("ok");
	return 0;
}
