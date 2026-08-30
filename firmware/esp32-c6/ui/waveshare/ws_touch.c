#include "ws_touch.h"

#include "ws_pins.h"

#include "driver/gpio.h"
#include "driver/i2c_master.h"
#include "esp_check.h"
#include "esp_log.h"
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"

static const char *TAG = "ws_touch";

#define AXS5106L_TOUCH_DATA_REG 0x01

static i2c_master_dev_handle_t s_dev;
static bool s_ready;

static void map_coords(uint16_t raw_x, uint16_t raw_y, uint16_t *x, uint16_t *y)
{
	*x = (uint16_t)(WS_LCD_H_RES - 1U - raw_x);
	*y = raw_y;
}

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
	i2c_master_bus_handle_t bus = NULL;
	ESP_RETURN_ON_ERROR(i2c_new_master_bus(&bus_cfg, &bus), TAG, "i2c bus");

	const gpio_config_t rst_cfg = {
		.pin_bit_mask = 1ULL << WS_TOUCH_PIN_RST,
		.mode = GPIO_MODE_OUTPUT,
	};
	ESP_RETURN_ON_ERROR(gpio_config(&rst_cfg), TAG, "rst gpio");
	gpio_set_level(WS_TOUCH_PIN_RST, 0);
	vTaskDelay(pdMS_TO_TICKS(200));
	gpio_set_level(WS_TOUCH_PIN_RST, 1);
	vTaskDelay(pdMS_TO_TICKS(300));

	const i2c_device_config_t dev_cfg = {
		.dev_addr_length = I2C_ADDR_BIT_LEN_7,
		.device_address = WS_TOUCH_I2C_ADDR,
		.scl_speed_hz = WS_TOUCH_I2C_FREQ_HZ,
	};
	ESP_RETURN_ON_ERROR(i2c_master_bus_add_device(bus, &dev_cfg, &s_dev), TAG, "i2c dev");

	const gpio_config_t int_cfg = {
		.pin_bit_mask = 1ULL << WS_TOUCH_PIN_INT,
		.mode = GPIO_MODE_INPUT,
		.pull_up_en = GPIO_PULLUP_ENABLE,
	};
	ESP_RETURN_ON_ERROR(gpio_config(&int_cfg), TAG, "int gpio");

	s_ready = true;
	ESP_LOGI(TAG, "touch init ok (AXS5106L, no swipe handlers)");
	return ESP_OK;
}

bool ws_touch_read_pressed(uint16_t *x, uint16_t *y)
{
	if (!s_ready) {
		return false;
	}

	if (gpio_get_level(WS_TOUCH_PIN_INT) != 0) {
		return false;
	}

	uint8_t data[14] = {0};
	if (i2c_master_transmit_receive(s_dev, (uint8_t[]){AXS5106L_TOUCH_DATA_REG}, 1, data, sizeof(data),
					pdMS_TO_TICKS(20)) != ESP_OK) {
		return false;
	}
	if (data[1] == 0) {
		return false;
	}

	const uint8_t *p = &data[2];
	uint16_t raw_x = (uint16_t)(((p[0] & 0x0f) << 8) | p[1]);
	uint16_t raw_y = (uint16_t)(((p[2] & 0x0f) << 8) | p[3]);
	uint16_t mx = 0;
	uint16_t my = 0;
	map_coords(raw_x, raw_y, &mx, &my);
	if (x != NULL) {
		*x = mx;
	}
	if (y != NULL) {
		*y = my;
	}
	return true;
}
