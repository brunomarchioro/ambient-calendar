#pragma once

#include <stdbool.h>
#include <stddef.h>
#include <stdint.h>

enum {
	ALERTS_MAX_EVENTS = 64,
	ALERTS_ID_LEN = 64,
	ALERTS_TITLE_LEN = 96,
	ALERTS_TZ_LEN = 64,
};

typedef struct {
	char id[ALERTS_ID_LEN];
	char title[ALERTS_TITLE_LEN];
	bool has_end;
	bool all_day;
	int64_t start_unix;
	int64_t end_unix;
} alerts_event_t;

typedef struct {
	char timezone[ALERTS_TZ_LEN];
	int reminder_minutes;
	int show_next_events;
	int64_t server_unix;
	alerts_event_t events[ALERTS_MAX_EVENTS];
	size_t event_count;
} alerts_schedule_t;
