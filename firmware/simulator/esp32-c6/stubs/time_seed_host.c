#include "time_seed.h"

#include <sys/time.h>
#include <time.h>

#include "esp_log.h"

static const char *TAG = "time";
static bool s_seeded;
static int64_t s_unix_offset;

esp_err_t alerts_time_init(void)
{
	ESP_LOGI(TAG, "time init (host, no SNTP)");
	return ESP_OK;
}

bool alerts_time_is_synced(void)
{
	if (s_seeded) {
		return true;
	}
	time_t now = 0;
	time(&now);
	return now > 1704067200;
}

esp_err_t alerts_time_seed_from_unix(int64_t unix_sec)
{
	time_t wall = 0;
	time(&wall);
	s_unix_offset = unix_sec - (int64_t)wall;
	s_seeded = true;
	ESP_LOGI(TAG, "seed unix=%lld offset=%lld", (long long)unix_sec, (long long)s_unix_offset);
	return ESP_OK;
}

int64_t alerts_time_now_unix(void)
{
	time_t now = 0;
	time(&now);
	return (int64_t)now + s_unix_offset;
}

void sim_time_scrub_minutes(int delta_min)
{
	s_unix_offset += (int64_t)delta_min * 60;
	ESP_LOGI(TAG, "scrub %+d min → now=%lld", delta_min, (long long)alerts_time_now_unix());
}
