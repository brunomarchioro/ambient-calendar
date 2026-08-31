#include "ws_touch.h"

#include "ws_pins.h"

#include "axs5106l_touch.h"

#include "driver/i2c_master.h"
#include "esp_check.h"
#include "esp_log.h"

static const char *TAG = "ws_touch";

static i2c_master_bus_handle_t s_bus;
static axs5106l_touch_handle_t s_touch;
static bool s_ready;

esp_err_t ws_touch_init(void)
{
	if (s_ready) {
		return ESP_OK;
	}

	const i2c_master_bus_config_t bus_cfg = {
		.i2c_port = I2C_NUM_0,
		.sda_io_num = WS_TOUCH_PIN_SDA,
		.scl_io_num = WS_TOUCH_PIN_SCL,
		.clk_source = I2C_CLK_SRC_DEFAULT,
		.glitch_ignore_cnt = 7,
		.flags.enable_internal_pullup = true,
	};
	ESP_RETURN_ON_ERROR(i2c_new_master_bus(&bus_cfg, &s_bus), TAG, "i2c bus");

	const axs5106l_touch_config_t touch_cfg = AXS5106L_TOUCH_DEFAULT_CONFIG(
		s_bus, WS_TOUCH_PIN_RST, WS_TOUCH_PIN_INT, WS_LCD_H_RES, WS_LCD_V_RES);
	axs5106l_touch_config_t cfg = touch_cfg;
	cfg.mirror_x = true;

	ESP_RETURN_ON_ERROR(axs5106l_touch_new(&cfg, &s_touch), TAG, "axs5106l new");
	s_ready = true;
	ESP_LOGI(TAG, "touch init ok (axs5106l component)");
	return ESP_OK;
}

esp_err_t ws_touch_attach_lvgl(void)
{
	if (!s_ready || s_touch == NULL) {
		return ESP_ERR_INVALID_STATE;
	}
	return axs5106l_touch_attach_lvgl(s_touch);
}

bool ws_touch_read_pressed(uint16_t *x, uint16_t *y)
{
	(void)x;
	(void)y;
	return false;
}
