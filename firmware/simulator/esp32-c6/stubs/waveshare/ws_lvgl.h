#pragma once

#include <stdbool.h>

bool alerts_lvgl_lock(int timeout_ms);
void alerts_lvgl_unlock(void);
