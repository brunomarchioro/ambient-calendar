#pragma once

/* Waveshare ESP32-C6-Touch-LCD-1.47 — frozen in docs/research/esp32-c6-waveshare-constraints.md */

#define WS_LCD_H_RES 172
#define WS_LCD_V_RES 320
#define WS_LCD_COL_OFFSET 34

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
