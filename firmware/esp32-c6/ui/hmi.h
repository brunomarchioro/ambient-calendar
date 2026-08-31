#pragma once

#include "esp_err.h"
#include "hmi_frame.h"

esp_err_t alerts_hmi_init(void);
esp_err_t alerts_hmi_loop_once(void);
void alerts_hmi_on_background_tap(void);
void alerts_hmi_on_dismiss_tap(void);
