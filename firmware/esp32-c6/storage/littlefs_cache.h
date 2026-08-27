#pragma once

#include <stddef.h>

#include "esp_err.h"

esp_err_t alerts_littlefs_init(void);
esp_err_t alerts_littlefs_write_schedule(const char *json, size_t len);
esp_err_t alerts_littlefs_load_schedule(char **json, size_t *len);
