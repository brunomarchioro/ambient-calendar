CC ?= gcc
LVGL_VERSION ?= v9.2.2
LVGL_DIR ?= third_party/lvgl
FW := ../../esp32-c6

BASE_CFLAGS ?= -std=c11 -Wall -Wextra -Werror
BASE_CFLAGS += -I. -Istubs \
	-I$(FW)/ui -I$(FW)/ui/waveshare \
	-I$(FW)/storage -I$(FW)/sync -I$(FW)/network \
	-DLV_CONF_INCLUDE_SIMPLE

SDL_CFLAGS := $(shell pkg-config --cflags sdl2 2>/dev/null)
SDL_LIBS := $(shell pkg-config --libs sdl2 2>/dev/null)
CURL_LIBS := -lcurl

SIM_SRCS := \
	main.c \
	sim_config.c \
	sim_display.c \
	stubs/waveshare/ws_lvgl_host.c \
	stubs/http_schedule_host.c \
	stubs/littlefs_cache_host.c \
	stubs/time_seed_host.c \
	stubs/nvs_meta_host.c \
	$(FW)/ui/hmi_frame.c \
	$(FW)/ui/hmi_lvgl.c \
	$(FW)/ui/hmi.c \
	$(FW)/sync/poll.c \
	$(FW)/storage/schedule_parse.c

LVGL_SRCS := $(shell find $(LVGL_DIR)/src -type f -name '*.c' 2>/dev/null)

.PHONY: all deps test clean

all: alerts_hmi_sim

deps:
	@test -d $(LVGL_DIR) || git clone --depth 1 --branch $(LVGL_VERSION) https://github.com/lvgl/lvgl.git $(LVGL_DIR)

alerts_hmi_sim: deps $(SIM_SRCS) $(LVGL_SRCS) lv_conf.h
	@test -n "$(SDL_LIBS)" || (echo "sim: install libsdl2-dev" && exit 1)
	$(CC) $(BASE_CFLAGS) -I$(LVGL_DIR) $(SDL_CFLAGS) -o $@ $(SIM_SRCS) $(LVGL_SRCS) $(SDL_LIBS) $(CURL_LIBS) -lm

test: test_sim_config
	./test_sim_config

test_sim_config: test_sim_config.c sim_config.c
	$(CC) $(BASE_CFLAGS) -o $@ test_sim_config.c sim_config.c

clean:
	rm -f alerts_hmi_sim test_sim_config
