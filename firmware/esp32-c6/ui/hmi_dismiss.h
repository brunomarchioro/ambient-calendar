#pragma once

#include <stdbool.h>
#include <stdint.h>

#include "esp_err.h"
#include "schedule.h"

esp_err_t alerts_hmi_dismiss_init(void);
void alerts_hmi_dismiss_expire(int64_t now_unix);
bool alerts_hmi_dismiss_blocks_now(const alerts_event_t *e, int64_t now_unix);
esp_err_t alerts_hmi_dismiss_record(const alerts_event_t *e, int64_t dismissed_at_unix);

#ifdef ALERTS_HMI_DISMISS_HOST
void alerts_hmi_dismiss_host_reset(void);
#endif
