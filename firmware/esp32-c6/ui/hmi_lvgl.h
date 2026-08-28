#pragma once

#include "esp_err.h"
#include "hmi_frame.h"

esp_err_t alerts_hmi_lvgl_init(void);
esp_err_t alerts_hmi_lvgl_render(const alerts_hmi_frame_t *frame);
