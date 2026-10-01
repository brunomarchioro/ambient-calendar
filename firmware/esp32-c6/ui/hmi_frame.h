#pragma once

#include <stddef.h>
#include <stdint.h>

#include "hmi_layout.h"
#include "schedule.h"

#define ALERTS_HMI_OVERLAY_TIMEOUT_MS 15000
#define ALERTS_HMI_PIN_ERROR_MS 300
#define ALERTS_HMI_SYNC_FRESH_SEC 300
#define ALERTS_HMI_SYNC_STALE_SEC 3600

typedef enum {
	ALERTS_HMI_EMPTY = 0,
	ALERTS_HMI_AMBIENT,
	ALERTS_HMI_ALERT,
	ALERTS_HMI_NOW,
} alerts_hmi_state_t;

typedef struct {
	bool overlay_open;
	bool tasks_view;
	int overlay_elapsed_ms;
	bool locked;
	bool pin_error;
	char device_pin[ALERTS_DEVICE_PIN_LEN];
	char pin_entry[ALERTS_DEVICE_PIN_LEN];
	int pin_length;
} alerts_hmi_present_t;

typedef struct {
	alerts_hmi_state_t state;
	bool has_focus;
	alerts_event_t focus;
	bool has_secondary;
	alerts_event_t secondary;
	alerts_event_t ambient_list[HMI_AMBIENT_FETCH_SLOTS];
	size_t ambient_list_count;
	bool overlay_open;
	bool tasks_view;
	alerts_task_t tasks[ALERTS_MAX_TASKS];
	size_t task_count;
	alerts_event_t overlay_list[HMI_OVERLAY_LIST_SLOTS];
	size_t overlay_list_count;
	int64_t now_unix;
	int64_t schedule_loaded_at_unix;
	bool schedule_available;
	char timezone[ALERTS_TZ_LEN];
	bool locked;
	bool pin_error;
	int pin_length;
} alerts_hmi_frame_t;

void alerts_hmi_present_init(alerts_hmi_present_t *present);
bool alerts_hmi_present_overlay_allowed(const alerts_hmi_frame_t *frame);
void alerts_hmi_present_tap(alerts_hmi_present_t *present, const alerts_hmi_frame_t *frame);
void alerts_hmi_present_tick(alerts_hmi_present_t *present, int elapsed_ms);
void alerts_hmi_present_clear_pin_error(alerts_hmi_present_t *present);
bool alerts_hmi_present_set_pin(alerts_hmi_present_t *present, const char *pin);
bool alerts_hmi_present_lock(alerts_hmi_present_t *present);
bool alerts_hmi_present_toggle_tasks(alerts_hmi_present_t *present, size_t task_count);
bool alerts_hmi_present_pin_digit(alerts_hmi_present_t *present, int digit);

int alerts_hmi_build_frame(int64_t now_unix, const alerts_schedule_t *schedule, const alerts_hmi_present_t *present,
			   alerts_hmi_frame_t *out);
int alerts_hmi_dismiss_focus(int64_t now_unix, const alerts_hmi_frame_t *frame);
const char *alerts_hmi_state_name(alerts_hmi_state_t state);
