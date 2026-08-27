#pragma once

#include "esp_err.h"
#include "scheduler_eval.h"

esp_err_t alerts_scheduler_init(void);
esp_err_t alerts_scheduler_tick(alerts_hmi_view_t *view);
