#include <assert.h>
#include <stdio.h>
#include <string.h>

#include "schedule_parse.h"

static void expect_ok(const char *json, alerts_schedule_t *out)
{
	int err = alerts_schedule_parse(json, strlen(json), out);
	if (err != ALERTS_PARSE_OK) {
		fprintf(stderr, "parse failed: %s\n%s\n", alerts_schedule_parse_strerror(err), json);
	}
	assert(err == ALERTS_PARSE_OK);
}

int main(void)
{
	alerts_schedule_t s;
	int64_t unix_out;
	const char *ok =
		"{"
		"\"serverTime\":\"2026-08-27T14:00:00-03:00\","
		"\"timezone\":\"America/Sao_Paulo\","
		"\"reminderMinutes\":30,"
		"\"showNextEvents\":2,"
		"\"events\":[{"
		"\"id\":\"evt_1\","
		"\"title\":\"Reunião\","
		"\"startAt\":\"2026-08-27T14:00:00-03:00\","
		"\"endAt\":\"2026-08-27T15:00:00-03:00\","
		"\"allDay\":false"
		"}]"
		"}";
	const char *empty =
		"{"
		"\"serverTime\":\"2026-08-27T14:00:00-03:00\","
		"\"timezone\":\"America/Sao_Paulo\","
		"\"reminderMinutes\":30,"
		"\"showNextEvents\":2,"
		"\"events\":[]"
		"}";
	const char *null_end =
		"{"
		"\"serverTime\":\"2026-08-27T14:00:00-03:00\","
		"\"timezone\":\"America/Sao_Paulo\","
		"\"reminderMinutes\":30,"
		"\"showNextEvents\":2,"
		"\"events\":[{"
		"\"id\":\"future-point\","
		"\"title\":\"x\","
		"\"startAt\":\"2026-08-27T16:00:00-03:00\","
		"\"endAt\":null,"
		"\"allDay\":false"
		"}]"
		"}";
	const char *all_day =
		"{"
		"\"serverTime\":\"2026-08-27T14:00:00-03:00\","
		"\"timezone\":\"America/Sao_Paulo\","
		"\"reminderMinutes\":30,"
		"\"showNextEvents\":2,"
		"\"events\":[{"
		"\"id\":\"all-day\","
		"\"title\":\"Feriado\","
		"\"startAt\":\"2026-08-28T00:00:00-03:00\","
		"\"endAt\":\"2026-08-29T00:00:00-03:00\","
		"\"allDay\":true"
		"}]"
		"}";
	const char *missing =
		"{"
		"\"timezone\":\"America/Sao_Paulo\","
		"\"reminderMinutes\":30,"
		"\"showNextEvents\":2,"
		"\"events\":[]"
		"}";
	const char *garbage = "{not json";
	const char *utc_offset =
		"{"
		"\"serverTime\":\"2026-08-27T17:00:00+00:00\","
		"\"timezone\":\"UTC\","
		"\"reminderMinutes\":30,"
		"\"showNextEvents\":2,"
		"\"events\":[]"
		"}";

	expect_ok(ok, &s);
	assert(strcmp(s.server_time, "2026-08-27T14:00:00-03:00") == 0);
	assert(strcmp(s.timezone, "America/Sao_Paulo") == 0);
	assert(s.reminder_minutes == 30);
	assert(s.show_next_events == 2);
	assert(s.event_count == 1);
	assert(strcmp(s.events[0].id, "evt_1") == 0);
	assert(strcmp(s.events[0].title, "Reunião") == 0);
	assert(!s.events[0].all_day);
	assert(s.events[0].has_end);
	assert(s.server_unix == 1787850000);
	assert(s.events[0].start_unix == 1787850000);
	assert(s.events[0].end_unix == 1787853600);

	expect_ok(empty, &s);
	assert(s.event_count == 0);

	expect_ok(null_end, &s);
	assert(s.event_count == 1);
	assert(!s.events[0].has_end);
	assert(s.events[0].end_at[0] == '\0');

	expect_ok(all_day, &s);
	assert(s.events[0].all_day);
	assert(strcmp(s.events[0].start_at, "2026-08-28T00:00:00-03:00") == 0);

	assert(alerts_schedule_parse(missing, strlen(missing), &s) == ALERTS_PARSE_MISSING);
	assert(alerts_schedule_parse(garbage, strlen(garbage), &s) == ALERTS_PARSE_TYPE);
	assert(alerts_schedule_parse("{", 1, &s) != ALERTS_PARSE_OK);
	assert(alerts_schedule_parse("[]", 2, &s) == ALERTS_PARSE_SYNTAX);
	assert(alerts_schedule_parse(NULL, 0, &s) == ALERTS_PARSE_ARG);

	expect_ok(utc_offset, &s);
	assert(s.server_unix == 1787850000);

	assert(alerts_iso8601_to_unix("2026-08-27T14:00:00-03:00", &unix_out) == ALERTS_PARSE_OK);
	assert(unix_out == 1787850000);
	assert(alerts_iso8601_to_unix("2026-08-27T17:00:00+00:00", &unix_out) == ALERTS_PARSE_OK);
	assert(unix_out == 1787850000);
	assert(alerts_iso8601_to_unix("not-a-time", &unix_out) == ALERTS_PARSE_TIME);

	puts("ok");
	return 0;
}
