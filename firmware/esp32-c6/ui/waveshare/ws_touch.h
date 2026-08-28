#pragma once

#include <stdbool.h>
#include <stdint.h>

#include "esp_err.h"

esp_err_t ws_touch_init(void);
bool ws_touch_read_pressed(uint16_t *x, uint16_t *y);
