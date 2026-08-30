#pragma once

#include "esp_err.h"

/** Apply schedule timezone for localtime(). Accepts IANA (mapped) or POSIX TZ strings. */
esp_err_t alerts_time_set_tz(const char *timezone);
