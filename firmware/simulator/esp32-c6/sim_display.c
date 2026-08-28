#include "sim_display.h"

#include "sim_time.h"
#include "waveshare/ws_pins.h"

#include <SDL2/SDL.h>
#include <stdbool.h>

#include "esp_log.h"
#include "lvgl.h"

static const char *TAG = "sdl";

static bool s_quit;
static bool s_repoll;

esp_err_t sim_display_init(void)
{
	s_quit = false;
	s_repoll = false;
	lv_init();
	lv_display_t *disp = lv_sdl_window_create(WS_LCD_H_RES, WS_LCD_V_RES);
	if (disp == NULL) {
		ESP_LOGE(TAG, "lv_sdl_window_create failed");
		return ESP_FAIL;
	}
	lv_sdl_window_set_zoom(disp, 2.0);
	lv_sdl_window_set_title(disp, "Ambient Calendar Display — simulator");
	ESP_LOGI(TAG, "display %dx%d (2x zoom)", WS_LCD_H_RES, WS_LCD_V_RES);
	return ESP_OK;
}

bool sim_display_wants_quit(void)
{
	return s_quit;
}

bool sim_display_consume_repoll(void)
{
	if (!s_repoll) {
		return false;
	}
	s_repoll = false;
	return true;
}

void sim_display_pump(void)
{
	SDL_Event event;
	while (SDL_PollEvent(&event)) {
		switch (event.type) {
		case SDL_QUIT:
			s_quit = true;
			break;
		case SDL_KEYDOWN:
			switch (event.key.keysym.sym) {
			case SDLK_q:
			case SDLK_ESCAPE:
				s_quit = true;
				break;
			case SDLK_LEFT:
				sim_time_scrub_minutes(-15);
				break;
			case SDLK_RIGHT:
				sim_time_scrub_minutes(15);
				break;
			case SDLK_r:
				s_repoll = true;
				break;
			default:
				break;
			}
			break;
		default:
			break;
		}
	}
}

uint32_t sim_display_timer_handler(void)
{
	uint32_t delay = lv_timer_handler();
	if (delay < 1) {
		delay = 1;
	}
	if (delay > 10) {
		delay = 10;
	}
	SDL_Delay(delay);
	return delay;
}
