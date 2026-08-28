#pragma once

#include <stdbool.h>

#define SIM_CONFIG_URL_MAX 256
#define SIM_CONFIG_TOKEN_MAX 192

typedef struct {
	char api_base_url[SIM_CONFIG_URL_MAX];
	char device_token[SIM_CONFIG_TOKEN_MAX];
} sim_config_t;

extern sim_config_t g_sim_config;

/** Parse env (ALERTS_API_BASE_URL, ALERTS_DEVICE_API_TOKEN) and CLI (--url, --token). Returns 0 on ok. */
int sim_config_parse(int argc, char **argv, sim_config_t *out);

/** Apply parsed config to g_sim_config. */
void sim_config_use(const sim_config_t *cfg);
