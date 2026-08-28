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
	bool has_focus;
	alerts_event_t focus;
	alerts_event_t ambient_list[ALERTS_MAX_EVENTS];
	size_t ambient_list_count;
	bool overlay_open;
	alerts_event_t overlay_list[ALERTS_MAX_EVENTS];
	size_t overlay_list_count;
	int64_t now_unix;
	char timezone[ALERTS_TZ_LEN];
} alerts_hmi_frame_t;

int alerts_hmi_build_frame(int64_t now_unix, const alerts_schedule_t *schedule, bool overlay_open,
			   alerts_hmi_frame_t *out);
const char *alerts_hmi_state_name(alerts_hmi_state_t state);
