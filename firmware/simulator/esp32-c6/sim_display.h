#pragma once

#include "esp_err.h"

esp_err_t sim_display_init(void);
bool sim_display_wants_quit(void);
bool sim_display_consume_repoll(void);
void sim_display_pump(void);
uint32_t sim_display_timer_handler(void);
