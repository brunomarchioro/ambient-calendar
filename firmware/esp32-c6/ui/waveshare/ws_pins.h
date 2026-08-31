#pragma once

/* Waveshare ESP32-C6-Touch-LCD-1.47 — frozen in docs/research/esp32-c6-waveshare-constraints.md */

#define WS_LCD_H_RES 172
#define WS_LCD_V_RES 320
/* JD9853 CASET starts at column 0x22 (34). esp_lcd_panel_set_gap shifts LVGL (0,0) on panel RAM.
 * Must match JD9853 CASET start (0x22 = 34); do not raise — window ends at column 205 (172 px).
 * Vertical inset: HMI_PAD_Y in LVGL only (ROW gap stays 0). Calibrated on ESP32-C6-Touch-LCD-1.47. */
#define WS_LCD_COL_OFFSET 34
#define WS_LCD_ROW_OFFSET 0

#define WS_LCD_PIN_SCK 1
#define WS_LCD_PIN_MOSI 2
#define WS_LCD_PIN_CS 14
#define WS_LCD_PIN_DC 15
#define WS_LCD_PIN_RST 22
#define WS_LCD_PIN_BL 23

#define WS_TOUCH_PIN_SDA 18
#define WS_TOUCH_PIN_SCL 19
#define WS_TOUCH_PIN_RST 20
#define WS_TOUCH_PIN_INT 21

#define WS_TOUCH_I2C_ADDR 0x63
#define WS_TOUCH_I2C_FREQ_HZ 400000
