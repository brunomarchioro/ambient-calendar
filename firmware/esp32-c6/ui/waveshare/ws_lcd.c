#include "ws_lcd.h"

#include "jd9853_vendor_init.h"
#include "ws_pins.h"

#include "driver/gpio.h"
#include "driver/ledc.h"
#include "driver/spi_master.h"
#include "esp_check.h"
#include "esp_lcd_panel_io.h"
#include "esp_lcd_panel_ops.h"
#include "esp_lcd_panel_st7789.h"
#include "esp_log.h"

static const char *TAG = "ws_lcd";

esp_err_t ws_lcd_init(esp_lcd_panel_io_handle_t *out_io, esp_lcd_panel_handle_t *out_panel)
{
	ESP_RETURN_ON_FALSE(out_io != NULL && out_panel != NULL, ESP_ERR_INVALID_ARG, TAG, "null out");

	const spi_bus_config_t bus_cfg = {
		.mosi_io_num = WS_LCD_PIN_MOSI,
		.miso_io_num = -1,
		.sclk_io_num = WS_LCD_PIN_SCK,
		.quadwp_io_num = -1,
		.quadhd_io_num = -1,
		.max_transfer_sz = WS_LCD_H_RES * WS_LCD_V_RES * sizeof(uint16_t),
	};
	ESP_RETURN_ON_ERROR(spi_bus_initialize(SPI2_HOST, &bus_cfg, SPI_DMA_CH_AUTO), TAG, "spi bus");

	const esp_lcd_panel_io_spi_config_t io_cfg = {
		.cs_gpio_num = WS_LCD_PIN_CS,
		.dc_gpio_num = WS_LCD_PIN_DC,
		.spi_mode = 0,
		.pclk_hz = 40 * 1000 * 1000,
		.trans_queue_depth = 10,
		.lcd_cmd_bits = 8,
		.lcd_param_bits = 8,
	};
	esp_lcd_panel_io_handle_t io = NULL;
	ESP_RETURN_ON_ERROR(esp_lcd_new_panel_io_spi((esp_lcd_spi_bus_handle_t)SPI2_HOST, &io_cfg, &io), TAG, "panel io");

	const esp_lcd_panel_dev_config_t panel_cfg = {
		.reset_gpio_num = WS_LCD_PIN_RST,
		.rgb_ele_order = LCD_RGB_ELEMENT_ORDER_BGR,
		.bits_per_pixel = 16,
	};
	esp_lcd_panel_handle_t panel = NULL;
	ESP_RETURN_ON_ERROR(esp_lcd_new_panel_st7789(io, &panel_cfg, &panel), TAG, "panel");

	ESP_RETURN_ON_ERROR(esp_lcd_panel_reset(panel), TAG, "reset");
	ESP_RETURN_ON_ERROR(ws_jd9853_panel_init(io), TAG, "jd9853 init");
	ESP_RETURN_ON_ERROR(esp_lcd_panel_set_gap(panel, WS_LCD_COL_OFFSET, 0), TAG, "gap");
	ESP_RETURN_ON_ERROR(esp_lcd_panel_disp_on_off(panel, true), TAG, "on");

	*out_io = io;
	*out_panel = panel;
	ESP_LOGI(TAG, "JD9853 panel %dx%d", WS_LCD_H_RES, WS_LCD_V_RES);
	return ESP_OK;
}

static bool s_backlight_on;

static esp_err_t ws_lcd_backlight_gpio_on(void)
{
	const gpio_config_t io = {
		.pin_bit_mask = 1ULL << WS_LCD_PIN_BL,
		.mode = GPIO_MODE_OUTPUT,
		.pull_up_en = GPIO_PULLUP_DISABLE,
		.pull_down_en = GPIO_PULLDOWN_DISABLE,
		.intr_type = GPIO_INTR_DISABLE,
	};
	ESP_RETURN_ON_ERROR(gpio_config(&io), TAG, "backlight gpio cfg");
	ESP_RETURN_ON_ERROR(gpio_set_level(WS_LCD_PIN_BL, 1), TAG, "backlight gpio on");
	return ESP_OK;
}

esp_err_t ws_lcd_backlight_on(void)
{
	if (s_backlight_on) {
		return ESP_OK;
	}

	const ledc_timer_config_t timer_cfg = {
		.speed_mode = LEDC_LOW_SPEED_MODE,
		.timer_num = LEDC_TIMER_0,
		.duty_resolution = LEDC_TIMER_10_BIT,
		.freq_hz = 5000,
		.clk_cfg = LEDC_AUTO_CLK,
	};
	esp_err_t err = ledc_timer_config(&timer_cfg);
	if (err != ESP_OK) {
		ESP_LOGW(TAG, "ledc timer failed (%s), fallback gpio", esp_err_to_name(err));
		return ws_lcd_backlight_gpio_on();
	}

	const ledc_channel_config_t ch_cfg = {
		.gpio_num = WS_LCD_PIN_BL,
		.speed_mode = LEDC_LOW_SPEED_MODE,
		.channel = LEDC_CHANNEL_0,
		.timer_sel = LEDC_TIMER_0,
		.intr_type = LEDC_INTR_DISABLE,
		.duty = 1023,
		.hpoint = 0,
	};
	err = ledc_channel_config(&ch_cfg);
	if (err != ESP_OK) {
		ESP_LOGW(TAG, "ledc ch failed (%s), fallback gpio", esp_err_to_name(err));
		return ws_lcd_backlight_gpio_on();
	}

	s_backlight_on = true;
	return ESP_OK;
}
