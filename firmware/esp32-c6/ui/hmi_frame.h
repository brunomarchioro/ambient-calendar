#pragma once

#include <stddef.h>
#include <stdint.h>

#include "schedule.h"

#define ALERTS_HMI_OVERLAY_TIMEOUT_MS 15000

typedef enum {
	ALERTS_HMI_EMPTY = 0,
	ALERTS_HMI_AMBIENT,
	ALERTS_HMI_ALERT,
	ALERTS_HMI_NOW,
} alerts_hmi_state_t;

typedef struct {
	bool overlay_open;
	int overlay_elapsed_ms;
} alerts_hmi_present_t;

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

void alerts_hmi_present_init(alerts_hmi_present_t *present);
void alerts_hmi_present_tap(alerts_hmi_present_t *present);
void alerts_hmi_present_tick(alerts_hmi_present_t *present, int elapsed_ms);

int alerts_hmi_build_frame(int64_t now_unix, const alerts_schedule_t *schedule, const alerts_hmi_present_t *present,
			   alerts_hmi_frame_t *out);
const char *alerts_hmi_state_name(alerts_hmi_state_t state);
