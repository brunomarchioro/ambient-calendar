#include <assert.h>
#include <stddef.h>

#include "wifi_select.h"

static const alerts_wifi_network_t NETS[] = {
	{"casa", "senha-casa"},
	{"trabalho", "senha-trabalho"},
	{"hotspot", "senha-hotspot"},
};

int main(void)
{
	size_t out[3];

	/* Prioridade vence a ordem do scan. */
	const char *both[] = {"hotspot", "vizinho", "casa"};
	assert(alerts_wifi_select(NETS, 3, both, 3, out) == 2);
	assert(out[0] == 0 && out[1] == 2);

	/* Só redes visíveis viram candidatas. */
	const char *work[] = {"trabalho"};
	assert(alerts_wifi_select(NETS, 3, work, 1, out) == 1);
	assert(out[0] == 1);

	/* Nenhuma configurada visível. */
	const char *none[] = {"vizinho"};
	assert(alerts_wifi_select(NETS, 3, none, 1, out) == 0);
	assert(alerts_wifi_select(NETS, 3, NULL, 0, out) == 0);

	/* SSID repetido no scan (vários APs) não duplica candidata; comparação exata. */
	const char *dup[] = {"casa", "casa", "Casa", "casa-5g"};
	assert(alerts_wifi_select(NETS, 3, dup, 4, out) == 1);
	assert(out[0] == 0);

	return 0;
}
