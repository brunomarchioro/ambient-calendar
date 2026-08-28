#pragma once

#include "esp_err.h"
#include "hmi_frame.h"

typedef void (*alerts_hmi_tap_cb_t)(void);

esp_err_t alerts_hmi_lvgl_init(void);
esp_err_t alerts_hmi_lvgl_render(const alerts_hmi_frame_t *frame);
void alerts_hmi_lvgl_set_tap_cb(alerts_hmi_tap_cb_t cb);
