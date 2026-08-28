#pragma once

#include "schedule.h"

#include "esp_err.h"

const alerts_schedule_t *alerts_poll_current(void);
esp_err_t alerts_poll_refresh(void);

#ifdef ALERTS_POLL_HOST_TEST
void alerts_poll_reset(void);
#endif
