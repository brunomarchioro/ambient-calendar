#include <assert.h>
#include <stdio.h>
#include <string.h>

#include "schedule_parse.h"

/* 2026-08-27T14:00:00-03:00 */
#define UNIX_NOW 1787850000LL
/* +1h */
#define UNIX_END 1787853600LL
/* +2h — used in null_end fixture */
#define UNIX_FUTURE 1787857200LL
/* 2026-08-28T00:00:00-03:00 */
#define UNIX_ALLDAY_START 1787886000LL
/* 2026-08-29T00:00:00-03:00 */
#define UNIX_ALLDAY_END 1787972400LL

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
	const char *ok =
		"{"
		"\"serverUnix\":1787850000,"
		"\"timezone\":\"America/Sao_Paulo\","
		"\"reminderMinutes\":30,"
		"\"showNextEvents\":2,"
		"\"events\":[{"
		"\"id\":\"evt_1\","
		"\"title\":\"Reunião\","
		"\"startUnix\":1787850000,"
		"\"endUnix\":1787853600,"
		"\"allDay\":false"
		"}]"
		"}";
	const char *empty =
		"{"
		"\"serverUnix\":1787850000,"
		"\"timezone\":\"America/Sao_Paulo\","
		"\"reminderMinutes\":30,"
		"\"showNextEvents\":2,"
		"\"events\":[]"
		"}";
	const char *null_end =
		"{"
		"\"serverUnix\":1787850000,"
		"\"timezone\":\"America/Sao_Paulo\","
		"\"reminderMinutes\":30,"
		"\"showNextEvents\":2,"
		"\"events\":[{"
		"\"id\":\"future-point\","
		"\"title\":\"x\","
		"\"startUnix\":1787857200,"
		"\"endUnix\":null,"
		"\"allDay\":false"
		"}]"
		"}";
	const char *all_day =
		"{"
		"\"serverUnix\":1787850000,"
		"\"timezone\":\"America/Sao_Paulo\","
		"\"reminderMinutes\":30,"
		"\"showNextEvents\":2,"
		"\"events\":[{"
		"\"id\":\"all-day\","
		"\"title\":\"Feriado\","
		"\"startUnix\":1787886000,"
		"\"endUnix\":1787972400,"
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
	const char *legacy_iso =
		"{"
		"\"serverTime\":\"2026-08-27T14:00:00-03:00\","
		"\"timezone\":\"America/Sao_Paulo\","
		"\"reminderMinutes\":30,"
		"\"showNextEvents\":2,"
		"\"events\":[]"
		"}";
	const char *bad_end =
		"{"
		"\"serverUnix\":1787850000,"
		"\"timezone\":\"America/Sao_Paulo\","
		"\"reminderMinutes\":30,"
		"\"showNextEvents\":2,"
		"\"events\":[{"
		"\"id\":\"bad\","
		"\"title\":\"x\","
		"\"startUnix\":1787853600,"
		"\"endUnix\":1787850000,"
		"\"allDay\":false"
		"}]"
		"}";
	const char *bad_server =
		"{"
		"\"serverUnix\":0,"
		"\"timezone\":\"America/Sao_Paulo\","
		"\"reminderMinutes\":30,"
		"\"showNextEvents\":2,"
		"\"events\":[]"
		"}";
	const char *bad_start =
		"{"
		"\"serverUnix\":1787850000,"
		"\"timezone\":\"America/Sao_Paulo\","
		"\"reminderMinutes\":30,"
		"\"showNextEvents\":2,"
		"\"events\":[{"
		"\"id\":\"bad\","
		"\"title\":\"x\","
		"\"startUnix\":0,"
		"\"endUnix\":null,"
		"\"allDay\":false"
		"}]"
		"}";
	const char *garbage = "{not json";
	const char *utc =
		"{"
		"\"serverUnix\":1787850000,"
		"\"timezone\":\"UTC\","
		"\"reminderMinutes\":30,"
		"\"showNextEvents\":2,"
		"\"events\":[]"
		"}";

	expect_ok(ok, &s);
	assert(strcmp(s.timezone, "America/Sao_Paulo") == 0);
	assert(s.reminder_minutes == 30);
	assert(s.show_next_events == 2);
	assert(s.event_count == 1);
	assert(strcmp(s.events[0].id, "evt_1") == 0);
	assert(strcmp(s.events[0].title, "Reunião") == 0);
	assert(!s.events[0].all_day);
	assert(s.events[0].has_end);
	assert(s.server_unix == UNIX_NOW);
	assert(s.events[0].start_unix == UNIX_NOW);
	assert(s.events[0].end_unix == UNIX_END);

	expect_ok(empty, &s);
	assert(s.event_count == 0);

	expect_ok(null_end, &s);
	assert(s.event_count == 1);
	assert(!s.events[0].has_end);
	assert(s.events[0].end_unix == 0);

	expect_ok(all_day, &s);
	assert(s.events[0].all_day);
	assert(s.events[0].start_unix == UNIX_ALLDAY_START);
	assert(s.events[0].end_unix == UNIX_ALLDAY_END);

	assert(alerts_schedule_parse(missing, strlen(missing), &s) == ALERTS_PARSE_MISSING);
	assert(alerts_schedule_parse(legacy_iso, strlen(legacy_iso), &s) == ALERTS_PARSE_MISSING);
	assert(alerts_schedule_parse(bad_end, strlen(bad_end), &s) == ALERTS_PARSE_MISSING);
	assert(alerts_schedule_parse(bad_server, strlen(bad_server), &s) == ALERTS_PARSE_MISSING);
	assert(alerts_schedule_parse(bad_start, strlen(bad_start), &s) == ALERTS_PARSE_MISSING);
	assert(alerts_schedule_parse(garbage, strlen(garbage), &s) == ALERTS_PARSE_TYPE);
	assert(alerts_schedule_parse("{", 1, &s) != ALERTS_PARSE_OK);
	assert(alerts_schedule_parse("[]", 2, &s) == ALERTS_PARSE_SYNTAX);
	assert(alerts_schedule_parse(NULL, 0, &s) == ALERTS_PARSE_ARG);

	expect_ok(utc, &s);
	assert(s.server_unix == UNIX_NOW);

	{
		char many[8192];
		size_t n = 0;
		int i;
		n += (size_t)snprintf(many + n, sizeof(many) - n,
			"{\"serverUnix\":1787850000,\"timezone\":\"UTC\","
			"\"reminderMinutes\":30,\"showNextEvents\":2,\"events\":[");
		for (i = 0; i < 65; i++) {
			n += (size_t)snprintf(many + n, sizeof(many) - n,
				"%s{\"id\":\"e%d\",\"title\":\"t\",\"startUnix\":%lld,"
				"\"endUnix\":null,\"allDay\":false}",
				i ? "," : "", i, (long long)(UNIX_FUTURE + i));
		}
		n += (size_t)snprintf(many + n, sizeof(many) - n, "]}");
		expect_ok(many, &s);
		assert(s.event_count == ALERTS_MAX_EVENTS);
	}

	puts("ok");
	return 0;
}
