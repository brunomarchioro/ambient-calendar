#include "wifi_select.h"

#include <string.h>

size_t alerts_wifi_select(const alerts_wifi_network_t *nets, size_t n, const char *const *visible, size_t n_visible,
	size_t *out)
{
	size_t count = 0;
	for (size_t i = 0; i < n; i++) {
		for (size_t j = 0; j < n_visible; j++) {
			if (strcmp(nets[i].ssid, visible[j]) == 0) {
				out[count++] = i;
				break;
			}
		}
	}
	return count;
}
