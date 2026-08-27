#pragma once

#include <stdbool.h>

#include "esp_err.h"

esp_err_t alerts_touch_init(void);
bool alerts_touch_overlay_open(void);
void alerts_touch_on_short_tap(void);
void alerts_touch_tick_ms(int elapsed_ms);
