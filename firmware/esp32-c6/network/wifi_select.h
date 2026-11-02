#pragma once

#include <stddef.h>

typedef struct {
	const char *ssid;
	const char *password;
} alerts_wifi_network_t;

/**
 * Candidate Redes Wi-Fi for this scan: indices into nets of those whose SSID is in visible,
 * in priority (nets) order. out must hold n entries. Returns the candidate count.
 */
size_t alerts_wifi_select(const alerts_wifi_network_t *nets, size_t n, const char *const *visible, size_t n_visible,
	size_t *out);
