#include "sim_config.h"

#include <stdio.h>
#include <stdlib.h>
#include <string.h>

sim_config_t g_sim_config;

static int copy_required(char *dst, size_t dst_len, const char *src, const char *label)
{
	if (src == NULL || src[0] == '\0') {
		fprintf(stderr, "sim: missing %s (env or CLI)\n", label);
		return -1;
	}
	if (strlen(src) >= dst_len) {
		fprintf(stderr, "sim: %s too long\n", label);
		return -1;
	}
	strncpy(dst, src, dst_len - 1);
	dst[dst_len - 1] = '\0';
	return 0;
}

static void apply_defaults(sim_config_t *cfg)
{
	const char *url = getenv("ALERTS_API_BASE_URL");
	const char *token = getenv("ALERTS_DEVICE_API_TOKEN");
	if (url != NULL && url[0] != '\0') {
		strncpy(cfg->api_base_url, url, sizeof(cfg->api_base_url) - 1);
	}
	if (token != NULL && token[0] != '\0') {
		strncpy(cfg->device_token, token, sizeof(cfg->device_token) - 1);
	}
}

int sim_config_parse(int argc, char **argv, sim_config_t *out)
{
	if (out == NULL) {
		return -1;
	}
	memset(out, 0, sizeof(*out));
	apply_defaults(out);

	for (int i = 1; i < argc; i++) {
		if (strcmp(argv[i], "--url") == 0 && i + 1 < argc) {
			strncpy(out->api_base_url, argv[++i], sizeof(out->api_base_url) - 1);
		} else if (strcmp(argv[i], "--token") == 0 && i + 1 < argc) {
			strncpy(out->device_token, argv[++i], sizeof(out->device_token) - 1);
		} else if (strcmp(argv[i], "--help") == 0) {
			puts("usage: alerts_hmi_sim [--url BASE] [--token TOKEN]");
			return -1;
		}
	}

	if (copy_required(out->api_base_url, sizeof(out->api_base_url), out->api_base_url, "ALERTS_API_BASE_URL/--url") != 0) {
		return -1;
	}
	if (copy_required(out->device_token, sizeof(out->device_token), out->device_token,
			  "ALERTS_DEVICE_API_TOKEN/--token") != 0) {
		return -1;
	}
	return 0;
}

void sim_config_use(const sim_config_t *cfg)
{
	if (cfg != NULL) {
		g_sim_config = *cfg;
	}
}
