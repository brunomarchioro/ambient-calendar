#pragma once

#include <stddef.h>
#include <stdint.h>

#include "schedule.h"

typedef enum {
	ALERTS_HMI_EMPTY = 0,
	ALERTS_HMI_AMBIENT,
	ALERTS_HMI_ALERT,
	ALERTS_HMI_NOW,
} alerts_hmi_state_t;

typedef struct {
	alerts_hmi_state_t state;
	const alerts_event_t *focus;
	const alerts_event_t *next_timed;
	alerts_event_t list[ALERTS_MAX_EVENTS];
	size_t list_count;
} alerts_hmi_view_t;

int alerts_scheduler_eval(int64_t now_unix, const alerts_schedule_t *schedule, alerts_hmi_view_t *out);
const char *alerts_hmi_state_name(alerts_hmi_state_t state);
