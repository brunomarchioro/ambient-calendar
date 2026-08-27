#pragma once

#include <stdint.h>

#include "esp_err.h"

esp_err_t alerts_time_init(void);
bool alerts_time_is_synced(void);
esp_err_t alerts_time_seed_from_unix(int64_t unix_sec);
int64_t alerts_time_now_unix(void);
