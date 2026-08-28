#define _POSIX_C_SOURCE 200809L

#include "alerts_devvars.h"

#include "dotenv.h"

#include <stdio.h>
#include <stdlib.h>
#include <string.h>

static bool env_nonempty(const char *name)
{
	const char *value = getenv(name);
	return value != NULL && value[0] != '\0';
}

static void copy_field(char *dst, size_t dst_len, const char *src)
{
	if (dst == NULL || dst_len == 0 || src == NULL || src[0] == '\0') {
		return;
	}
	strncpy(dst, src, dst_len - 1);
	dst[dst_len - 1] = '\0';
}

static bool line_is_comment(const char *line)
{
	while (*line == ' ' || *line == '\t') {
		line++;
	}
	return *line == '#' || *line == '\0' || *line == '\n';
}

static void apply_kv(char *api_url, size_t api_url_len, char *device_token, size_t device_token_len, const char *key,
		     const char *value)
{
	if (strcmp(key, ALERTS_DEVVARS_KEY_API_URL) == 0) {
		copy_field(api_url, api_url_len, value);
	} else if (strcmp(key, ALERTS_DEVVARS_KEY_DEVICE_TOKEN) == 0) {
		copy_field(device_token, device_token_len, value);
	}
}

static int read_file_into(const char *path, char *api_url, size_t api_url_len, char *device_token,
			  size_t device_token_len)
{
	FILE *file = fopen(path, "rb");
	char *line = NULL;
	size_t cap = 0;
	ssize_t nread;

	if (file == NULL) {
		return -1;
	}

	while ((nread = getline(&line, &cap, file)) != -1) {
		char *eq;
		char *key;
		char *value;

		if (line_is_comment(line)) {
			continue;
		}
		eq = strchr(line, '=');
		if (eq == NULL) {
			continue;
		}
		*eq = '\0';
		key = line;
		value = eq + 1;
		while (*value == ' ' || *value == '\t') {
			value++;
		}
		if (value[0] != '\0' && value[strlen(value) - 1] == '\n') {
			value[strlen(value) - 1] = '\0';
		}
		apply_kv(api_url, api_url_len, device_token, device_token_len, key, value);
	}

	free(line);
	fclose(file);
	return 0;
}

const char *alerts_devvars_get(const char *primary, const char *fallback)
{
	if (env_nonempty(primary)) {
		return getenv(primary);
	}
	if (fallback != NULL && env_nonempty(fallback)) {
		return getenv(fallback);
	}
	return NULL;
}

void alerts_devvars_apply_defaults(void)
{
	if (!env_nonempty(ALERTS_DEVVARS_KEY_API_URL)) {
		setenv(ALERTS_DEVVARS_KEY_API_URL, ALERTS_DEVVARS_DEFAULT_API_URL, 1);
	}
}

int alerts_devvars_read_into(char *api_url, size_t api_url_len, char *device_token, size_t device_token_len)
{
	static const char *search_paths[] = {
		ALERTS_DEVVARS_SEARCH_FW,
		ALERTS_DEVVARS_SEARCH_CHIP,
		ALERTS_DEVVARS_SEARCH_REPO,
		NULL,
	};

	if (getenv(ALERTS_DEVVARS_SKIP_ENV) != NULL) {
		return -1;
	}

	const char *explicit_path = getenv(ALERTS_DEVVARS_PATH_ENV);
	if (explicit_path != NULL && explicit_path[0] != '\0') {
		return read_file_into(explicit_path, api_url, api_url_len, device_token, device_token_len);
	}

	for (size_t i = 0; search_paths[i] != NULL; i++) {
		if (read_file_into(search_paths[i], api_url, api_url_len, device_token, device_token_len) == 0) {
			return 0;
		}
	}

	return -1;
}

int alerts_devvars_load_env(bool overwrite)
{
	static const char *search_paths[] = {
		ALERTS_DEVVARS_SEARCH_FW,
		ALERTS_DEVVARS_SEARCH_CHIP,
		ALERTS_DEVVARS_SEARCH_REPO,
		NULL,
	};

	if (getenv(ALERTS_DEVVARS_SKIP_ENV) != NULL) {
		return -1;
	}

	const char *explicit_path = getenv(ALERTS_DEVVARS_PATH_ENV);
	if (explicit_path != NULL && explicit_path[0] != '\0') {
		if (env_load(explicit_path, overwrite) == 0) {
			alerts_devvars_apply_defaults();
			return 0;
		}
		return -1;
	}

	for (size_t i = 0; search_paths[i] != NULL; i++) {
		if (env_load(search_paths[i], overwrite) == 0) {
			alerts_devvars_apply_defaults();
			return 0;
		}
	}

	return -1;
}
