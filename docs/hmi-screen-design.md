# HMI — design ambient (ASCII + tabela de estados)

Handoff humano → agente para layout LVGL no ESP32-C6 (172×320). Comportamento de scheduler, touch e overlay: `[index.md](index.md)` §8. Implementação alvo: `firmware/esp32-c6/ui/hmi_lvgl.c`.

**Origem:** mockup Figma adaptado para display ambient — paleta limitada, bordas retas 1 px, grade 16 px, tipografia Montserrat built-in.

## Canvas

| Propriedade | Valor                                                                                              |
| ----------- | -------------------------------------------------------------------------------------------------- |
| Resolução   | 172 × 320 px                                                                                       |
| Orientação  | portrait (Waveshare 1.47")                                                                         |
| Fundo       | `#000000`                                                                                          |
| Grade       | 16 px (vertical e horizontal)                                                                      |
| Fonte       | **Montserrat** built-in LVGL — `lv_font_montserrat_20` (corpo), `lv_font_montserrat_28` (relógio), `lv_font_montserrat_14` (ícone sync) |
| UI strings  | ASCII only (sem acentos em labels fixas)                                                           |

## Estilo (regras)

| Regra          | Valor                                                                     |
| -------------- | ------------------------------------------------------------------------- |
| Bordas         | 1 px, retas (`radius = 0`) — **só overlay**                               |
| Cards          | fundo sólido preenchido, **sem borda**                                    |
| Sombras / blur | **proibido**                                                              |
| Gradientes     | **proibido**                                                              |
| Alinhamento    | coordenadas múltiplas de **8 px** (ideal) ou **16 px** (obrigatório em Y) |
| Texto em card  | ver **Rótulos do card** (preto em Alerta/Agora; ciano/muted em Ambient)   |
| Texto longo    | scroll horizontal circular dentro de clip — ver **Scroll de texto**       |
| Alerta         | fill laranja **piscando** (`bg_opa`, sem faixa full-screen)               |

## Tokens visuais

| Token          | Hex       | Uso                                           |
| -------------- | --------- | --------------------------------------------- |
| `COLOR_BG`     | `#000000` | fundo                                         |
| `COLOR_CYAN`   | `#00E5FF` | relógio, títulos de foco/lista, borda overlay |
| `COLOR_DATE`   | `#FF4444` | data no header (esquerda)                     |
| `COLOR_MUTED`  | `#808080` | subtítulos, títulos de lista, SYNC stale      |
| `COLOR_ALERT`       | `#FF8C00` | fill card Alerta                            |
| `COLOR_NOW`         | `#00FF41` | fill card Agora                             |
| `COLOR_SYNC`        | `#00FF41` | ícone `LV_SYMBOL_REFRESH` (fresco)          |
| `COLOR_CARD_AMBIENT`| `#404040` | fill card Ambient (`PROXIMO`)               |
| `COLOR_TEXT_ON_FILL`| `#000000` | texto em fill Alerta / Agora                |

## Layout por zonas (Y)

| Zona                          | Y   | H (px) | Linhas 16 px |
| ----------------------------- | --- | ------ | ------------ |
| Margem topo                   | 0   | 8      | —            |
| Header                        | 8   | 24     | #1–#2        |
| Relógio                       | 32  | 32     | #2–#4        |
| Gap                           | 60  | 4      | —            |
| Card foco                     | 68  | 96     | #5–#10       |
| Card secundário (Agora+Alert) | 164 | 96     | #11–#16      |
| Lista (card único)            | 180 | 128    | #12–#20      |

| Margens: **12 px** horizontal (`HMI_PAD_X`), **8 px** topo (`HMI_PAD_Y`). Largura útil: **148 px** (`HMI_CARD_W`). Rodapé da lista: **12 px** (`HMI_LIST_BOTTOM_GAP`).

**Driver:** `WS_LCD_COL_OFFSET` (= CASET `0x22`, **34**) alinha o framebuffer ao RAM do painel; margem visual é `HMI_PAD_X` / `HMI_PAD_Y` no LVGL — não subir `COL_OFFSET` (estoura a janela e corta à direita).

### Dimensões horizontais

| Constante           | Valor (px) | Uso                          |
| ------------------- | ---------- | ---------------------------- |
| `HMI_SYNC_W`        | 24         | slot sync (direita do header)|
| `HMI_CARD_INNER_W`  | 124        | texto dentro do card (derivado)   |
| `HMI_LIST_TIME_W`   | 56         | coluna hora (`HH:MM` em fonte 20) |
| `HMI_LIST_TITLE_W`  | 92         | título na lista (derivado)        |
| `HMI_LIST_ROW`      | 32         | altura de cada linha         |
| `HMI_FONT_BODY_LINE`| 24         | altura reservada (fonte 20)  |
| `HMI_FONT_CLOCK_LINE`| 32        | altura reservada (fonte 28)  |

## Widgets (IDs lógicos)

| ID                  | Tipo  | Fonte | Conteúdo / notas                       |
| ------------------- | ----- | ----- | -------------------------------------- |
| `date_lbl`          | label | 20    | `SEG 30 AGO`                           |
| `sync_lbl`          | label | 14/20 | `LV_SYMBOL_REFRESH` (14) ou `12m` (20) |
| `clock_lbl`         | label | 28    | `HH:MM`                                |
| `focus_card`        | panel | —     | card principal; toque dismiss se Agora |
| `focus_caption_lbl` | label | 20    | `PROXIMO` / `ALERTA` / `AGORA`         |
| `focus_title_lbl`   | label | 20    | título do evento (scroll)              |
| `focus_time_lbl`    | label | 20    | `em Nm` ou `Ate HH:MM`                 |
| `secondary_card`    | panel | —     | segundo card em Agora+Alerta           |
| `secondary_*_lbl`   | label | 20    | mesmo layout, caption `ALERTA`         |
| `list_time_lbl[i]`  | label | 20    | hora (`COLOR_CYAN`)                    |
| `list_title_lbl[i]` | label | 20    | título (`COLOR_MUTED`)                 |
| `empty_title_lbl`   | label | 20    | `SEM EVENTOS`                          |
| `overlay`           | panel | —     | fullscreen, borda ciano                |
| `overlay_title`     | label | 20    | `PROXIMOS`                             |
| `overlay_count_lbl` | label | 20    | `(N)`                                  |
| `overlay_list[i]`   | label | 20    | cabeçalho dia ou evento                |

Slots: `HMI_AMBIENT_LIST_SLOTS` = **4**; overlay derivado de `HMI_OVERLAY_LIST_SLOTS`.

### Rótulos do card (`focus_caption_lbl`)

| Estado  | Texto      | Fill card   | Texto (caption / título / tempo)        |
| ------- | ---------- | ----------- | --------------------------------------- |
| Ambient | `PROXIMO`  | `#404040`   | muted / ciano / muted                   |
| Alert   | `ALERTA`   | `#FF8C00` pisca | preto / preto / preto             |
| Now     | `AGORA`    | `#00FF41`   | preto / preto / preto                   |
| Empty   | _(oculto)_ | —           | —                                       |

### Indicador SYNC

| Condição                              | Exibição                                      |
| ------------------------------------- | --------------------------------------------- |
| Relógio válido e cache &lt; **5 min** | `LV_SYMBOL_REFRESH` verde (`lv_font_montserrat_14`) |
| Cache entre **5** e **60 min**        | `Nm` cinza (`lv_font_montserrat_20`)          |
| &gt; **60 min** ou sem relógio        | oculto                                        |

Slot direito do header: **24 px** (`HMI_SYNC_W`). Data usa o restante (`HMI_CARD_W - HMI_SYNC_W`).

## Scroll de texto

Marquee horizontal contínuo (`LV_LABEL_LONG_SCROLL_CIRCULAR` + template `lv_style_set_anim`). Widgets: `focus_title_lbl`, `list_title_lbl[i]`, títulos no overlay. Texto curto (cabe no clip) permanece estático (`LV_LABEL_LONG_CLIP`).

| Constante                   | Valor  | Campo anim (`lv_style_set_anim`)     |
| --------------------------- | ------ | ------------------------------------ |
| `HMI_SCROLL_START_DELAY_MS` | `4000` | `lv_anim_set_delay` (base)           |
| `HMI_SCROLL_STAGGER_MS`     | `700`  | somado ao delay por slot (`× slot`)  |
| `HMI_SCROLL_PAUSE_MS`       | `2500` | `lv_anim_set_repeat_delay`           |

Velocidade do deslocamento: calculada pelo LVGL (ajustar na board se necessário). Reconfigurar scroll só quando o título muda (`strcmp` no render).

## Wireframes ASCII

### Ambient

```text
┌──────────────────┐
│SEG 30 AGO      ↻│
│14:37             │
│▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓│ fill cinza — PROXIMO
│▓ PROXIMO        ▓│
│▓ Reuniao design ▓│
│▓ em 30m         ▓│
│▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓│
│16:30 Daily Stand │
│TER 09            │
│17:00 Code Review │
└──────────────────┘
```

### Alert

```text
┌──────────────────┐
│SEG 30 AGO      ↻│
│14:37             │
│▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒│ fill laranja piscando
│▒ ALERTA         ▒│
│▒ Reuniao design ▒│
│▒ em 15m         ▒│
│▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒│
│16:30 Daily Stand │
└──────────────────┘
```

### Agora

Toque no card `AGORA` = **encerramento antecipado** (NVS até `endAt`).

```text
┌──────────────────┐
│SEG 30 AGO      ↻│
│14:37             │
│░░░░░░░░░░░░░░░░░░│ fill verde — toque dismiss
│░ AGORA          ░│
│░ Reuniao design ░│
│░ Ate 16:30      ░│
│░░░░░░░░░░░░░░░░░░│
│17:00 Code Review │
└──────────────────┘
```

### Agora + alerta (sem lista)

```text
┌──────────────────┐
│SEG 30 AGO      ↻│
│14:37             │
│░░░░░░░░░░░░░░░░░░│ AGORA 96px
│░ AGORA          ░│
│░ Reuniao design ░│
│░ Ate 16:30      ░│
│░░░░░░░░░░░░░░░░░░│
│▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒│ ALERTA 96px, fill piscando
│▒ ALERTA         ▒│
│▒ Daily Stand    ▒│
│▒ em 15m         ▒│
│▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒│
└──────────────────┘
```

### Empty

```text
┌──────────────────┐
│SEG 30 AGO      ↻│
│14:37             │
│   SEM EVENTOS    │
│                  │
│ (lista vazia)    │
└──────────────────┘
```

### Overlay

```text
┌──────────────────┐
│PROXIMOS      (11)│
│TER 09            │
│18:00 Jantar      │
└──────────────────┘
```

## Tabela de estados (visibilidade)

| Widget            | Empty | Ambient | Alert | Now | Now+2º | Overlay |
| ----------------- | ----- | ------- | ----- | --- | ------ | ------- |
| date, clock, sync | ●     | ●       | ●     | ●   | ●      | ●       |
| focus_card        | ○     | ●       | ●     | ●   | ●      | ○       |
| secondary_card    | ○     | ○       | ○     | ○   | ●      | ○       |
| empty_title       | ●     | ○       | ○     | ○   | ○      | ○       |
| list\_\*          | ○¹    | ●       | ●     | ●   | ○      | ○       |
| overlay           | ○     | ○       | ○     | ○   | ○      | ●       |

¹ layout parity; vazia se scheduler Empty

## Regras de conteúdo dinâmico

| Campo               | Regra                                             |
| ------------------- | ------------------------------------------------- |
| Foco                | Predicados em `index.md` §8                       |
| Ambient/Alert tempo | `em Nm`                                           |
| Agora fim           | `Ate HH:MM` se `has_end`                          |
| Lista               | Timed após foco; até 4 linhas; oculta em Now+2º   |
| Cabeçalho dia       | `TER 09`, cor ciano                               |
| Encerramento        | NVS `event_id` + `dismissed_at` até `endAt` cache |
| Foco secundário     | Outro Event em Alerta durante Agora               |

## Interação

| Gesto                        | Efeito                                     |
| ---------------------------- | ------------------------------------------ |
| Toque card `AGORA`           | Encerramento antecipado → recalcula estado |
| Toque card secundário `ALERTA` | Sem ação (não abre overlay)              |
| Toque fora dos cards         | Overlay (ver regras abaixo)                |
| Ambient com `list_count > 0` | Toque **não** abre overlay                 |
| Ambient com lista vazia      | Toque abre overlay                         |
| 15 s com overlay             | Fecha overlay                              |
| Swipe                        | **não suportado**                          |

## Handoff para implementação

1. Layout/cores/fontes **neste arquivo** primeiro.
2. `hmi_layout.h`, `hmi_frame.c`, `hmi_dismiss.c`, `hmi_lvgl.c`.
3. Fontes: Montserrat built-in — `14` (símbolo sync), `20` (corpo), `28` (relógio) em `sdkconfig.defaults`.
4. Validar na board ESP32-C6; PNG quando este arquivo mudar (ADR 0010).

## Referências

- Política de handoff: `[adr/0009-hmi-screen-design-handoff.md](adr/0009-hmi-screen-design-handoff.md)`
- Predicados de estado: `index.md` [§8](index.md#8-scheduler--hmi--touch)
- Validação hardware: `[adr/0010-hmi-validation-on-hardware.md](adr/0010-hmi-validation-on-hardware.md)`
