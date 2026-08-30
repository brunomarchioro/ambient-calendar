#pragma once

#include <stdio.h>

#define ESP_LOGI(tag, fmt, ...) fprintf(stderr, "I (%s) " fmt "\n", tag, ##__VA_ARGS__)
#define ESP_LOGW(tag, fmt, ...) fprintf(stderr, "W (%s) " fmt "\n", tag, ##__VA_ARGS__)
#define ESP_LOGE(tag, fmt, ...) fprintf(stderr, "E (%s) " fmt "\n", tag, ##__VA_ARGS__)
#define ESP_LOGD(tag, fmt, ...) ((void)0)

#define ESP_ERROR_CHECK(x)                                                                                             \
	do {                                                                                                           \
		esp_err_t _err = (x);                                                                                  \
		if (_err != ESP_OK) {                                                                                  \
			fprintf(stderr, "ESP_ERROR_CHECK failed %s:%d err=%d\n", __FILE__, __LINE__, (int)_err);     \
			return _err;                                                                                   \
		}                                                                                                      \
	} while (0)

#define ESP_RETURN_ON_FALSE(cond, err, tag, msg)                                                                       \
	do {                                                                                                           \
		if (!(cond)) {                                                                                         \
			ESP_LOGE(tag, "%s", msg);                                                                      \
			return (err);                                                                                  \
		}                                                                                                      \
	} while (0)

#define ESP_RETURN_ON_ERROR(x, tag, msg)                                                                               \
	do {                                                                                                           \
		esp_err_t _err = (x);                                                                                  \
		if (_err != ESP_OK) {                                                                                  \
			ESP_LOGE(tag, "%s", msg);                                                                      \
			return _err;                                                                                   \
		}                                                                                                      \
	} while (0)
