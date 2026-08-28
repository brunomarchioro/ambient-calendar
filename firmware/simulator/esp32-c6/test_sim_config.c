#define _GNU_SOURCE
#include <assert.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#include "alerts_devvars.h"
#include "sim_config.h"

int main(void)
{
	sim_config_t cfg;
	char *argv[] = {"alerts_hmi_sim", "--url", "http://127.0.0.1:8787", "--token", "test-token", NULL};
	int argc = 5;

	setenv(ALERTS_DEVVARS_SKIP_ENV, "1", 1);
	unsetenv("ALERTS_API_BASE_URL");
	unsetenv("ALERTS_DEVICE_API_TOKEN");
	unsetenv("DEVICE_API_TOKEN");
	assert(sim_config_parse(argc, argv, &cfg) == 0);
	assert(strcmp(cfg.api_base_url, "http://127.0.0.1:8787") == 0);
	assert(strcmp(cfg.device_token, "test-token") == 0);

	setenv("ALERTS_API_BASE_URL", "http://env.local", 1);
	setenv("ALERTS_DEVICE_API_TOKEN", "env-token", 1);
	char *argv_env[] = {"alerts_hmi_sim", NULL};
	assert(sim_config_parse(1, argv_env, &cfg) == 0);
	assert(strcmp(cfg.api_base_url, "http://env.local") == 0);
	assert(strcmp(cfg.device_token, "env-token") == 0);

	char *argv_cli[] = {"alerts_hmi_sim", "--url", "http://cli.local", "--token", "cli-token", NULL};
	assert(sim_config_parse(5, argv_cli, &cfg) == 0);
	assert(strcmp(cfg.api_base_url, "http://cli.local") == 0);

	unsetenv("ALERTS_API_BASE_URL");
	unsetenv("ALERTS_DEVICE_API_TOKEN");
	char *argv_missing[] = {"alerts_hmi_sim", NULL};
	assert(sim_config_parse(1, argv_missing, &cfg) != 0);

	puts("ok");
	return 0;
}
