#include "ws_touch.h"

#include "ws_pins.h"

#include "driver/gpio.h"
#include "driver/i2c_master.h"
#include "esp_check.h"
#include "esp_log.h"
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"
#include "lvgl.h"

static const char *TAG = "ws_touch";

#define AXS5106L_REG_TOUCH_DATA 0x01
#define AXS5106L_TOUCH_FRAME_SIZE 14
#define AXS5106L_MAX_TOUCH_POINTS 2

static i2c_master_bus_handle_t s_bus;
static i2c_master_dev_handle_t s_device;
static lv_indev_t *s_indev;
static bool s_ready;
static bool s_pressed;
static uint16_t s_last_x;
static uint16_t s_last_y;

static uint16_t ws_touch_clamp(uint16_t value, uint16_t maximum)
{
	return value < maximum ? value : (uint16_t)(maximum - 1U);
}

static bool ws_touch_read_point(uint16_t *x, uint16_t *y)
{
	if (!s_ready || x == NULL || y == NULL) {
		return false;
	}

	uint8_t reg = AXS5106L_REG_TOUCH_DATA;
	uint8_t data[AXS5106L_TOUCH_FRAME_SIZE] = {0};
	/* Match Waveshare's reference driver: select register, then read after STOP. */
	esp_err_t err = i2c_master_transmit(s_device, &reg, sizeof(reg), 100);
	if (err == ESP_OK) {
		err = i2c_master_receive(s_device, data, sizeof(data), 100);
	}
	if (err != ESP_OK) {
		ESP_LOGW(TAG, "touch read failed: %s", esp_err_to_name(err));
		return false;
	}

	uint8_t point_count = data[1] & 0x0FU;
	if (point_count == 0 || point_count > AXS5106L_MAX_TOUCH_POINTS) {
		return false;
	}

	uint16_t raw_x = (uint16_t)(((uint16_t)(data[2] & 0x0FU) << 8) | data[3]);
	uint16_t raw_y = (uint16_t)(((uint16_t)(data[4] & 0x0FU) << 8) | data[5]);

	/* Waveshare's 0-degree portrait mapping: 172x320, no swap, mirror X. */
	uint16_t logical_x = ws_touch_clamp(raw_x, WS_LCD_H_RES);
	uint16_t logical_y = ws_touch_clamp(raw_y, WS_LCD_V_RES);
	*x = (uint16_t)(WS_LCD_H_RES - 1U - logical_x);
	*y = logical_y;
	return true;
}

static void ws_touch_lvgl_read(lv_indev_t *indev, lv_indev_data_t *data)
{
	(void)indev;

	uint16_t x;
	uint16_t y;
	if (ws_touch_read_point(&x, &y)) {
		s_pressed = true;
		s_last_x = x;
		s_last_y = y;
		data->point.x = x;
		data->point.y = y;
		data->state = LV_INDEV_STATE_PRESSED;
		return;
	}

	s_pressed = false;
	data->point.x = s_last_x;
	data->point.y = s_last_y;
	data->state = LV_INDEV_STATE_RELEASED;
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
	ESP_RETURN_ON_ERROR(i2c_new_master_bus(&bus_cfg, &s_bus), TAG, "i2c bus");

	const i2c_device_config_t device_cfg = {
		.dev_addr_length = I2C_ADDR_BIT_LEN_7,
		.device_address = WS_TOUCH_I2C_ADDR,
		.scl_speed_hz = WS_TOUCH_I2C_FREQ_HZ,
	};
	ESP_RETURN_ON_ERROR(i2c_master_bus_add_device(s_bus, &device_cfg, &s_device), TAG, "i2c device");

	const gpio_config_t reset_cfg = {
		.pin_bit_mask = 1ULL << WS_TOUCH_PIN_RST,
		.mode = GPIO_MODE_OUTPUT,
		.pull_up_en = GPIO_PULLUP_DISABLE,
		.pull_down_en = GPIO_PULLDOWN_DISABLE,
		.intr_type = GPIO_INTR_DISABLE,
	};
	ESP_RETURN_ON_ERROR(gpio_config(&reset_cfg), TAG, "reset gpio");
	ESP_RETURN_ON_ERROR(gpio_set_level(WS_TOUCH_PIN_RST, 0), TAG, "reset low");
	vTaskDelay(pdMS_TO_TICKS(10));
	ESP_RETURN_ON_ERROR(gpio_set_level(WS_TOUCH_PIN_RST, 1), TAG, "reset high");
	vTaskDelay(pdMS_TO_TICKS(10));

	const gpio_config_t interrupt_cfg = {
		.pin_bit_mask = 1ULL << WS_TOUCH_PIN_INT,
		.mode = GPIO_MODE_INPUT,
		.pull_up_en = GPIO_PULLUP_ENABLE,
		.pull_down_en = GPIO_PULLDOWN_DISABLE,
		.intr_type = GPIO_INTR_DISABLE,
	};
	ESP_RETURN_ON_ERROR(gpio_config(&interrupt_cfg), TAG, "interrupt gpio");

	s_ready = true;
	ESP_LOGI(TAG, "AXS5106L ready: %dx%d, mirror_x", WS_LCD_H_RES, WS_LCD_V_RES);
	return ESP_OK;
}

esp_err_t ws_touch_attach_lvgl(void)
{
	ESP_RETURN_ON_FALSE(s_ready, ESP_ERR_INVALID_STATE, TAG, "touch not initialized");
	if (s_indev != NULL) {
		return ESP_OK;
	}

	s_indev = lv_indev_create();
	ESP_RETURN_ON_FALSE(s_indev != NULL, ESP_ERR_NO_MEM, TAG, "LVGL input device");
	lv_indev_set_type(s_indev, LV_INDEV_TYPE_POINTER);
	lv_indev_set_read_cb(s_indev, ws_touch_lvgl_read);
	ESP_LOGI(TAG, "registered with LVGL");
	return ESP_OK;
}

bool ws_touch_read_pressed(uint16_t *x, uint16_t *y)
{
	if (!s_pressed) {
		return false;
	}
	if (x != NULL) {
		*x = s_last_x;
	}
	if (y != NULL) {
		*y = s_last_y;
	}
	return true;
}
