#include "time_tz.h"

#include <stdlib.h>
#include <string.h>
#include <time.h>

#include "esp_log.h"

static const char *TAG = "time_tz";

/* ponytail: IANA names need a lookup table; newlib only parses POSIX TZ (ESP-IDF docs). */
static const struct {
	const char *iana;
	const char *posix;
} s_iana_map[] = {
	{ "America/Sao_Paulo", "<-03>3" },
	{ "America/Fortaleza", "<-03>3" },
	{ "America/Recife", "<-03>3" },
	{ "America/Bahia", "<-03>3" },
	{ "America/Belem", "<-03>3" },
	{ "America/Manaus", "<-04>4" },
	{ "America/Cuiaba", "<-04>4" },
	{ "America/Porto_Velho", "<-04>4" },
	{ "America/Rio_Branco", "<-05>5" },
	{ "America/Noronha", "<-02>2" },
	{ "UTC", "UTC0" },
};

static const char *posix_for(const char *tz)
{
	if (tz == NULL || tz[0] == '\0') {
		return NULL;
	}
	if (tz[0] == '<') {
		return tz;
	}
	if (strncmp(tz, "UTC", 3) == 0) {
		return tz;
	}
	for (size_t i = 0; i < sizeof(s_iana_map) / sizeof(s_iana_map[0]); i++) {
		if (strcmp(tz, s_iana_map[i].iana) == 0) {
			return s_iana_map[i].posix;
		}
	}
	return NULL;
}

esp_err_t alerts_time_set_tz(const char *timezone)
{
	const char *posix = posix_for(timezone);
	if (posix == NULL) {
		ESP_LOGW(TAG, "unknown TZ %s, using UTC0", timezone);
		posix = "UTC0";
	}
	if (setenv("TZ", posix, 1) != 0) {
		return ESP_FAIL;
	}
	tzset();
	ESP_LOGD(TAG, "TZ %s -> %s", timezone, posix);
	return ESP_OK;
}
