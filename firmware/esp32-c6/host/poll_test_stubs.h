#pragma once

#include <stdbool.h>

void poll_test_reset(void);
void poll_test_seed_cache(const char *json);
void poll_test_set_http(int status, const char *body);
void poll_test_set_http_transport_fail(void);
bool poll_test_time_seed_was_called(void);
void poll_test_set_time_synced(bool synced);
