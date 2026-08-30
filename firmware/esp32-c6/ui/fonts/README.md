# Fontes HMI (VT323)

Fonte única: [VT323](https://fonts.google.com/specimen/VT323) (OFL) — terminal retro, legível em 172×320. Arquivo: `VT323-Regular.ttf`.

| Símbolo LVGL        | px | Uso                          |
| ------------------- | -- | ---------------------------- |
| `lv_font_alerts_22` | 22 | corpo, lista, header, card   |
| `lv_font_alerts_28` | 28 | relógio, faixas ALERTA/AGORA |

Regenerar (requer Node + `npx lv_font_conv`):

```bash
cd firmware/esp32-c6/ui/fonts
RANGE='0x20-0x7F,0xA0-0xFF,0x2022'
for SIZE in 22 28; do
  npx --yes lv_font_conv \
    --font VT323-Regular.ttf -r "$RANGE" \
    --size "$SIZE" --bpp 4 --no-compress \
    --format lvgl --lv-include lvgl.h \
    --force-fast-kern-format \
    --lv-font-name "lv_font_alerts_${SIZE}" \
    -o "lv_font_alerts_${SIZE}.c"
done
```

`bpp 4` prioriza legibilidade no painel físico.
