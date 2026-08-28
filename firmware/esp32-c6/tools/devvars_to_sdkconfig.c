#include "alerts_devvars.h"

#include "dotenv.h"

#include <stdio.h>
#include <stdlib.h>
#include <string.h>

static void write_sdkconfig_string(FILE *out, const char *key, const char *value)
{
	fprintf(out, "CONFIG_%s=\"", key);
	for (const char *p = value; *p != '\0'; p++) {
		if (*p == '\\' || *p == '"') {
			fputc('\\', out);
		}
		fputc(*p, out);
	}
	fputc('"', out);
	fputc('\n', out);
}

static int write_key_if_set(FILE *out, const char *env_key, const char *kconfig_key)
{
	const char *value = getenv(env_key);
	if (value == NULL || value[0] == '\0') {
		return 0;
	}
	write_sdkconfig_string(out, kconfig_key, value);
	return 1;
}

int main(int argc, char **argv)
{
	const char *input = argc > 1 ? argv[1] : ALERTS_DEVVARS_DEFAULT_PATH;
	const char *output = argc > 2 ? argv[2] : "../" ALERTS_DEVVARS_SDKCONFIG_OUT;

	if (env_load(input, true) != 0) {
		fprintf(stderr, "devvars: cannot read %s\n", input);
		return 1;
	}
	alerts_devvars_apply_defaults();

	FILE *out = fopen(output, "w");
	if (out == NULL) {
		fprintf(stderr, "devvars: cannot write %s\n", output);
		return 1;
	}

	fprintf(out, "# Generated from %s — do not commit\n", input);

	const char *token = getenv(ALERTS_DEVVARS_KEY_DEVICE_TOKEN);
	if (token == NULL || token[0] == '\0') {
		fprintf(stderr, "devvars: %s missing in %s\n", ALERTS_DEVVARS_KEY_DEVICE_TOKEN, input);
		fclose(out);
		return 1;
	}

	write_sdkconfig_string(out, ALERTS_DEVVARS_KEY_DEVICE_TOKEN, token);

	const char *url = alerts_devvars_get(ALERTS_DEVVARS_KEY_API_URL, NULL);
	if (url == NULL) {
		url = ALERTS_DEVVARS_DEFAULT_API_URL;
	}
	write_sdkconfig_string(out, ALERTS_DEVVARS_KEY_API_URL, url);

	(void)write_key_if_set(out, ALERTS_DEVVARS_KEY_WIFI_SSID, ALERTS_DEVVARS_KEY_WIFI_SSID);
	(void)write_key_if_set(out, ALERTS_DEVVARS_KEY_WIFI_PASSWORD, ALERTS_DEVVARS_KEY_WIFI_PASSWORD);

	fclose(out);
	printf("devvars: wrote %s\n", output);
	return 0;
}
