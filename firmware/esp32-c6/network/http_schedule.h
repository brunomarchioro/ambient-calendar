#pragma once

#include <stddef.h>

#include "esp_err.h"

#define ALERTS_HTTP_MAX_BODY 49152

typedef struct {
	int status;
	char *body;
	size_t len;
} alerts_http_body_t;

esp_err_t alerts_http_get_schedule(alerts_http_body_t *out);
void alerts_http_body_free(alerts_http_body_t *body);
