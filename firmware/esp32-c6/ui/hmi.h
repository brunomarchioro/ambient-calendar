#pragma once

#include "esp_err.h"
#include "scheduler_eval.h"

esp_err_t alerts_hmi_init(void);
esp_err_t alerts_hmi_render(const alerts_hmi_view_t *view, bool overlay_open);
esp_err_t alerts_hmi_loop_once(void);
