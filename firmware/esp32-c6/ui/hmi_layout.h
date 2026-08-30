#pragma once

#include "waveshare/ws_pins.h"

/* Grade 16 px — ver docs/hmi-screen-design.md */

#define HMI_GRID_ROW 16
#define HMI_LIST_ROW 32 /* 2× grade; cabe lv_font_alerts_22 sem corte vertical */
#define HMI_PAD_X 8
#define HMI_CARD_W (WS_LCD_H_RES - HMI_PAD_X * 2)

#define HMI_HEADER_Y 0
#define HMI_CLOCK_Y 16
#define HMI_GAP_Y 48
#define HMI_CARD_Y 64
#define HMI_CARD_H 96
#define HMI_FOCUS_CAPTION_Y 72
#define HMI_FOCUS_TITLE_Y 96
#define HMI_FOCUS_TIME_Y 128
#define HMI_FOCUS_TITLE_H 32
#define HMI_LIST_Y 160
#define HMI_STATE_BAND_Y 160
#define HMI_STATE_BAND_H (WS_LCD_V_RES - HMI_STATE_BAND_Y)
#define HMI_OVERLAY_TITLE_Y 8
#define HMI_OVERLAY_LIST_Y 40

#define HMI_LIST_TIME_W 48
#define HMI_LIST_TITLE_X (HMI_PAD_X + HMI_LIST_TIME_W)
#define HMI_LIST_TITLE_W 108
#define HMI_CARD_INNER_W 140
#define HMI_LIVE_W 40

#define HMI_AMBIENT_LIST_SLOTS 4
#define HMI_AMBIENT_FETCH_SLOTS 16
#define HMI_OVERLAY_LIST_SLOTS ((WS_LCD_V_RES - HMI_OVERLAY_LIST_Y) / HMI_GRID_ROW)
