# Fontes HMI

Tipografia via **Montserrat built-in** do LVGL (`sdkconfig.defaults`):

| Símbolo LVGL            | Uso                         |
| ----------------------- | --------------------------- |
| `lv_font_montserrat_20` | toda a HMI (header, cards)  |

Todo texto na HMI é ASCII Basic Latin (`U+0020`–`U+007E`): labels fixas e Título no display.
O backend (`sanitizeDeviceTitle`) e o parse do cache (`sanitize_event_title`) fazem fold de acentos PT-BR.
