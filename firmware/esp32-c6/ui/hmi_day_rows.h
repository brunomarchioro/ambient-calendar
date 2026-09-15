#pragma once

#include <stddef.h>

typedef enum {
	HMI_ROW_EVENT = 0,
	HMI_ROW_DAY_HEADER,
} hmi_row_kind_t;

typedef struct {
	hmi_row_kind_t kind;
	size_t event_index;
} hmi_row_t;

size_t hmi_day_rows_plan(int today_key, const int *day_keys, size_t count, size_t max_rows, hmi_row_t *out);
