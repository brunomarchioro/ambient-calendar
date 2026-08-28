#pragma once

#include <stddef.h>

#include "schedule.h"

enum {
	ALERTS_PARSE_OK = 0,
	ALERTS_PARSE_ARG = -1,
	ALERTS_PARSE_TRUNCATED = -2,
	ALERTS_PARSE_SYNTAX = -3,
	ALERTS_PARSE_MISSING = -4,
	ALERTS_PARSE_TYPE = -5,
};

int alerts_schedule_parse(const char *json, size_t len, alerts_schedule_t *out);
const char *alerts_schedule_parse_strerror(int err);
