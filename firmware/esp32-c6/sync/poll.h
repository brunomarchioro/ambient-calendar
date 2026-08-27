#pragma once

#include <stdbool.h>

#include "esp_err.h"
#include "schedule.h"

esp_err_t alerts_poll_schedule_once(void);
esp_err_t alerts_poll_load_cache(void);
bool alerts_poll_has_schedule(void);
const alerts_schedule_t *alerts_poll_schedule(void);
