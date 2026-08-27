#pragma once

#include <stddef.h>
#include <stdint.h>

#include "esp_err.h"

esp_err_t alerts_nvs_meta_init(void);
esp_err_t alerts_nvs_meta_set_http(int status);
esp_err_t alerts_nvs_meta_set_ok(int status, size_t bytes, int64_t unix_ok);
esp_err_t alerts_nvs_meta_get(int *status, size_t *bytes, int64_t *unix_ok);
