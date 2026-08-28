#include <assert.h>
#include <stdio.h>
#include <string.h>

#include "poll.h"
#include "poll_test_stubs.h"

static const char *SCHEDULE_V1 =
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

static const char *SCHEDULE_V2 =
	"{"
	"\"serverUnix\":1787850000,"
	"\"timezone\":\"America/Sao_Paulo\","
	"\"reminderMinutes\":30,"
	"\"showNextEvents\":2,"
	"\"events\":[{"
	"\"id\":\"evt_2\","
	"\"title\":\"Outro\","
	"\"startUnix\":1787857200,"
	"\"endUnix\":null,"
	"\"allDay\":false"
	"}]"
	"}";

static void reset_all(void)
{
	alerts_poll_reset();
	poll_test_reset();
}

static void expect_id(const alerts_schedule_t *schedule, const char *id)
{
	assert(schedule != NULL);
	assert(schedule->event_count == 1);
	assert(strcmp(schedule->events[0].id, id) == 0);
}

int main(void)
{
	const alerts_schedule_t *schedule;

	reset_all();
	assert(alerts_poll_current() == NULL);

	reset_all();
	poll_test_seed_cache(SCHEDULE_V1);
	schedule = alerts_poll_current();
	expect_id(schedule, "evt_1");

	reset_all();
	poll_test_seed_cache(SCHEDULE_V1);
	assert(alerts_poll_current() != NULL);
	poll_test_set_http(401, "{}");
	assert(alerts_poll_refresh() == ESP_ERR_INVALID_STATE);
	expect_id(alerts_poll_current(), "evt_1");

	reset_all();
	poll_test_set_http(200, SCHEDULE_V2);
	assert(alerts_poll_refresh() == ESP_OK);
	expect_id(alerts_poll_current(), "evt_2");

	reset_all();
	poll_test_seed_cache(SCHEDULE_V1);
	assert(alerts_poll_current() != NULL);
	poll_test_set_http(200, "{not-json");
	assert(alerts_poll_refresh() == ESP_FAIL);
	expect_id(alerts_poll_current(), "evt_1");

	reset_all();
	poll_test_set_time_synced(false);
	poll_test_set_http(200, SCHEDULE_V1);
	assert(alerts_poll_refresh() == ESP_OK);
	assert(poll_test_time_seed_was_called());

	puts("test_poll ok");
	return 0;
}
