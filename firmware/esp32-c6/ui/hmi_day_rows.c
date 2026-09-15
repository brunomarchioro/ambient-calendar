#include "hmi_day_rows.h"

size_t hmi_day_rows_plan(int today_key, const int *day_keys, size_t count, size_t max_rows, hmi_day_row_t *out)
{
	size_t n = 0;
	int previous_day = today_key;

	for (size_t i = 0; i < count; i++) {
		const int day = day_keys[i];
		const int needs_header = (day != previous_day);
		const size_t slots_needed = needs_header ? 2u : 1u;

		if (n + slots_needed > max_rows) {
			break;
		}

		if (needs_header) {
			out[n].kind = HMI_DAY_ROW_HEADER;
			out[n].event_index = i;
			n++;
			previous_day = day;
		}

		out[n].kind = HMI_DAY_ROW_EVENT;
		out[n].event_index = i;
		n++;
	}

	return n;
}
