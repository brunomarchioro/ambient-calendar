#include "ws_lcd.h"

#include "jd9853_vendor_init.h"
#include "ws_pins.h"

#include "driver/gpio.h"
#include "driver/ledc.h"
#include "driver/spi_master.h"
#include "esp_check.h"
#include "esp_lcd_panel_io.h"
#include "esp_lcd_panel_ops.h"
#include "esp_lcd_panel_vendor.h"
#include "esp_lcd_st7789.h"
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

	const esp_lcd_panel_vendor_init_cmd_t *init_cmds = ws_jd9853_vendor_init_cmds();
	const esp_lcd_panel_vendor_config_t vendor_cfg = {
		.init_cmds = init_cmds,
		.init_cmds_size = ws_jd9853_vendor_init_cmd_count(),
	};
	const esp_lcd_panel_dev_config_t panel_cfg = {
		.reset_gpio_num = WS_LCD_PIN_RST,
		.rgb_endian = LCD_RGB_ENDIAN_RGB,
		.bits_per_pixel = 16,
		.vendor_config = (void *)&vendor_cfg,
	};
	esp_lcd_panel_handle_t panel = NULL;
	ESP_RETURN_ON_ERROR(esp_lcd_new_panel_st7789(io, &panel_cfg, &panel), TAG, "panel");

	ESP_RETURN_ON_ERROR(esp_lcd_panel_reset(panel), TAG, "reset");
	ESP_RETURN_ON_ERROR(esp_lcd_panel_init(panel), TAG, "init");
	ESP_RETURN_ON_ERROR(esp_lcd_panel_set_gap(panel, WS_LCD_COL_OFFSET, 0), TAG, "gap");
	ESP_RETURN_ON_ERROR(esp_lcd_panel_disp_on_off(panel, true), TAG, "on");

	*out_io = io;
	*out_panel = panel;
	ESP_LOGI(TAG, "JD9853 panel %dx%d", WS_LCD_H_RES, WS_LCD_V_RES);
	return ESP_OK;
}

esp_err_t ws_lcd_backlight_on(void)
{
	const ledc_timer_config_t timer_cfg = {
		.speed_mode = LEDC_LOW_SPEED_MODE,
		.timer_num = LEDC_TIMER_0,
		.duty_resolution = LEDC_TIMER_10_BIT,
		.freq_hz = 5000,
		.clk_cfg = LEDC_AUTO_CLK,
	};
	ESP_RETURN_ON_ERROR(ledc_timer_config(&timer_cfg), TAG, "ledc timer");

	const ledc_channel_config_t ch_cfg = {
		.gpio_num = WS_LCD_PIN_BL,
		.speed_mode = LEDC_LOW_SPEED_MODE,
		.channel = LEDC_CHANNEL_0,
		.timer_sel = LEDC_TIMER_0,
		.intr_type = LEDC_INTR_DISABLE,
		.duty = 0,
		.hpoint = 0,
	};
	ESP_RETURN_ON_ERROR(ledc_channel_config(&ch_cfg), TAG, "ledc ch");
	ESP_RETURN_ON_ERROR(ledc_set_duty(LEDC_LOW_SPEED_MODE, LEDC_CHANNEL_0, 1023), TAG, "duty");
	ESP_RETURN_ON_ERROR(ledc_update_duty(LEDC_LOW_SPEED_MODE, LEDC_CHANNEL_0), TAG, "duty upd");
	return ESP_OK;
}
