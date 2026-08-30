# HMI — design 8-bit retro (ASCII + tabela de estados)

Handoff humano → agente para layout LVGL no ESP32-C6 (172×320). Comportamento de scheduler, touch e overlay: [`index.md`](index.md) §8. Implementação alvo: `firmware/esp32-c6/ui/hmi_lvgl.c`.

**Origem:** mockup Figma (dashboard cyber/terminal) adaptado para **estética 8-bit retro** — paleta limitada, bordas retas 1 px, grade 16 px, sem cantos arredondados, sem sombras, sem gradientes.

## Canvas

| Propriedade | Valor                                                                                        |
| ----------- | -------------------------------------------------------------------------------------------- |
| Resolução   | 172 × 320 px                                                                                 |
| Orientação  | portrait (Waveshare 1.47")                                                                   |
| Fundo       | `#000000`                                                                                    |
| Grade       | 16 px (vertical e horizontal)                                                                |
| Fonte       | **VT323** Regular (OFL) — `lv_font_alerts_22` (corpo) + `lv_font_alerts_28` (relógio/faixas) |
| Regeneração | `firmware/esp32-c6/ui/fonts/README.md`                                                       |

## Estilo 8-bit (regras)

| Regra                    | Valor                                                                     |
| ------------------------ | ------------------------------------------------------------------------- |
| Bordas                   | 1 px, retas (`radius = 0`)                                                |
| Sombras / blur           | **proibido**                                                              |
| Gradientes               | **proibido**                                                              |
| Anti-aliasing em ícones  | mínimo; sprites 1-bit ou paleta fixa                                      |
| Alinhamento              | coordenadas múltiplas de **8 px** (ideal) ou **16 px** (obrigatório em Y) |
| Texto em faixa de estado | preto `#000000` sobre laranja/verde sólido                                |
| Texto longo              | scroll horizontal dentro de clip — ver **Rotação de texto**               |
| Ícones                   | sprites 8×8 ou 16×16 em flash (`img_*`), não SVG                          |

## Tokens visuais

Paleta inspirada em terminal CRT + NES (6 cores + preto).

| Token           | Hex       | Uso                                                            |
| --------------- | --------- | -------------------------------------------------------------- |
| `COLOR_BG`      | `#000000` | fundo                                                          |
| `COLOR_CYAN`    | `#00E5FF` | relógio, horários de lista/overlay, título foco, borda overlay |
| `COLOR_DATE`    | `#FF4444` | data no header (esquerda)                                      |
| `COLOR_MUTED`   | `#808080` | subtítulos, títulos de lista                                   |
| `COLOR_ALERT`   | `#FF8C00` | card Alert, faixa `ALERTA` (piscante)                          |
| `COLOR_NOW`     | `#00FF41` | card Now, faixa `AGORA`                                        |
| `COLOR_LIVE`    | `#00FF41` | texto `LIVE`                                                   |
| `COLOR_ON_BAND` | `#000000` | palavra `ALERTA` / `AGORA` sobre faixa                         |
| `COLOR_BORDER`  | `#404040` | borda de card                                                  |
| `COLOR_PILL_BG` | `#000000` | fundo pill countdown (borda laranja/verde)                     |
| `COLOR_PILL_FG` | `#FF8C00` | texto pill (Ambient/Alert) ou `#00FF41` (Now)                  |

## Layout por zonas (Y)

| Zona                              | Y   | H (px) | Linhas 16 px |
| --------------------------------- | --- | ------ | ------------ |
| Header                            | 0   | 16     | #1           |
| Relógio                           | 16  | 32     | #2–#3        |
| Gap                               | 48  | 16     | #4           |
| Card foco                         | 64  | 96     | #5–#10       |
| Lista Ambient / faixa estado      | 160 | 160    | #11–#20      |
| Faixa Alert/Now (substitui lista) | 160 | 160    | #11–#20      |

Margens horizontais: **8 px** (`HMI_PAD_X`). Largura útil: **156 px** (`172 − 16`).

## Widgets (IDs lógicos)

Uma única tela LVGL; estados alternam visibilidade, cores de card e rótulos. Nomes alinhados ao alvo em `hmi_lvgl.c` (implementação pode divergir até migração).

| ID                  | Tipo      | Fonte | X / align        | Y        | Conteúdo                                |
| ------------------- | --------- | ----- | ---------------- | -------- | --------------------------------------- |
| `date_lbl`          | label     | 22    | left, x=8        | 0        | `SEG 30 AGO` (sem ponto médio)          |
| `live_lbl`          | label     | 22    | right            | 0        | `LIVE` (cor `COLOR_LIVE`)               |
| `clock_lbl`         | label     | 28    | left, x=8        | 16       | `HH:MM`                                 |
| `focus_card`        | panel     | —     | x=8, w=156, h=96 | 64       | borda 1 px; cor da borda = estado       |
| `focus_caption_lbl` | label     | 22    | left, pad 8      | 72       | ver tabela de rótulos                   |
| `focus_title_lbl`   | label     | 22    | left, pad 8      | 96       | título (`COLOR_CYAN`); clip **32 px**   |
| `focus_time_lbl`    | label     | 22    | left, pad 8      | 128      | ver regras por estado                   |
| `list_time_lbl[i]`  | label     | 22    | x=8              | 160+i×32 | hora (`COLOR_CYAN`)                     |
| `list_title_lbl[i]` | label     | 22    | x=56             | 160+i×32 | título (`COLOR_MUTED`); linha **32 px** |
| `alert_band`        | panel     | —     | full width       | 160      | h=160, fill laranja, opacidade piscante |
| `alert_word_lbl`    | label     | 20    | center           | 224      | `A L E R T A` (`COLOR_ON_BAND`)         |
| `now_band`          | panel     | —     | full width       | 160      | h=160, fill verde                       |
| `now_word_lbl`      | label     | 20    | center           | 224      | `A G O R A`                             |
| `empty_title_lbl`   | label     | 16    | center           | 144      | `SEM EVENTOS`                           |
| `empty_sub_lbl`     | label     | 14    | center           | 160      | `agenda livre hoje`                     |
| `overlay`           | container | —     | fullscreen       | 0        | borda 1 px ciano; fundo `#000000` opaco |
| `overlay_title`     | label     | 16    | left, x=8        | 8        | `PRÓXIMOS`                              |
| `overlay_count_lbl` | label     | 14    | right            | 8        | `(N)` — N = eventos na lista            |
| `overlay_list[i]`   | label ×17 | 14    | ver regras       | 40+i×16  | cabeçalho dia ou evento                 |

Slots de lista: `HMI_AMBIENT_LIST_SLOTS` = **4** (linhas de **32 px**, y 160–287; linhas #19–#20 livres); `HMI_OVERLAY_LIST_SLOTS` = **17** (y 40–311). Constantes em `hmi_layout.h`.

### Rótulos do card (`focus_caption_lbl`)

| Estado  | Texto           | Cor borda card |
| ------- | --------------- | -------------- |
| Ambient | `PROX. EVENTO`  | `#404040`      |
| Alert   | `EM SEGUIDA`    | `#FF8C00`      |
| Now     | `OCUPADO AGORA` | `#00FF41`      |
| Empty   | _(card oculto)_ | —              |

### Predicado `LIVE`

| Condição                                                      | Exibição       |
| ------------------------------------------------------------- | -------------- |
| Relógio válido **e** schedule carregado nos últimos **5 min** | `LIVE` visível |
| Caso contrário                                                | ocultos        |

_(5 min = `ponytail:` heurística; upgrade path: usar timestamp real do último sync em `schedule`.)_

## Rotação de texto

Nos wireframes, **“rotaciona horizontalmente para direita”** significa **scroll horizontal em loop** dentro de um retângulo de clip — **não** rotação geométrica (`lv_obj_set_style_transform_angle` permanece **0°** em todos os labels).

### Comportamento

| Regra               | Valor                                                                    |
| ------------------- | ------------------------------------------------------------------------ |
| Gatilho             | largura do texto > largura útil do clip                                  |
| Direção             | deslocamento **→ direita** (texto entra pela esquerda, sai pela direita) |
| Loop                | infinito com pausa entre ciclos                                          |
| Alinhamento inicial | texto ancorado à **esquerda** do clip (`LV_TEXT_ALIGN_LEFT`)             |
| Modo LVGL           | `LV_LABEL_LONG_CLIP` no label; animação em `x` do label dentro do clip   |

### Widgets com rotação

| ID                         | Estado / contexto               | Largura do clip (px)       | Stagger                 |
| -------------------------- | ------------------------------- | -------------------------- | ----------------------- |
| `focus_title_lbl`          | Ambient, Alert, Now (card foco) | `140` (`HMI_CARD_INNER_W`) | `0`                     |
| `list_title_lbl[i]`        | Ambient (lista)                 | `108` (`HMI_LIST_TITLE_W`) | índice da linha (`0…3`) |
| `overlay_list[i]` (título) | Overlay (eventos)               | `108` (`HMI_LIST_TITLE_W`) | índice do slot          |

### Widgets sem rotação

Texto estático ou truncado com reticências (`LV_LABEL_LONG_DOT`): `date_lbl`, `clock_lbl`, `live_lbl`, `focus_caption_lbl`, `focus_time_lbl`, horários de lista/overlay (`list_time_lbl`, `overlay_time_lbl`), cabeçalhos de dia no overlay, `alert_word_lbl`, `now_word_lbl`, Empty, título/contador do overlay.

### Temporização (implementação)

Constantes em `hmi_lvgl.c`:

| Constante                | Valor  | Efeito                                                                |
| ------------------------ | ------ | --------------------------------------------------------------------- |
| `HMI_SCROLL_DURATION_MS` | `8000` | duração de um ciclo completo                                          |
| `HMI_SCROLL_PAUSE_MS`    | `2500` | pausa após cada ciclo                                                 |
| `HMI_SCROLL_STAGGER_MS`  | `700`  | atraso extra por índice de linha (evita scroll sincronizado na lista) |

Fórmula do atraso por linha: `HMI_SCROLL_PAUSE_MS + índice × HMI_SCROLL_STAGGER_MS`.

### Notas de handoff

- Ao mudar fonte ou copy, revalidar se o título ainda cabe; scroll só aparece quando o texto **ultrapassa** o clip.
- Não usar `LV_LABEL_LONG_SCROLL_CIRCULAR` — o clip explícito + animação manual mantém alinhamento 8-bit (sem easing).
- Título do foco no card (`Reuniao>` no wireframe) é o caso principal documentado; lista e overlay seguem a mesma mecânica.

## Correlação ASCII ↔ pixels

Wireframes usam **18 colunas** × **20 linhas** (largura útil 156 px; ~9 px/coluna; 1 linha = 16 px de altura). Linhas vazias marcam gaps. Moldura (`┌`, `└`) fora das 18 colunas.

| Wireframe        | Tela real                |
| ---------------- | ------------------------ |
| 1 coluna ASCII   | ~8,7 px (156 px ÷ 18)    |
| 1 linha ASCII    | 16 px de altura (grade)  |
| `#N` nos coments | linha da grade 16 px (y) |

### Legenda ASCII

| Símbolo | Significado                     |
| ------- | ------------------------------- |
| `┌─┐│└` | borda de card ou overlay (1 px) |
| `▒`     | faixa sólida Alert/Now          |
| `>`     | texto com scroll horizontal     |
| `#N`    | linha / faixa y (grade 16 px)   |

### Constantes verticais → linha (grade 16 px)

| Widget                            | Y   | Linha     |
| --------------------------------- | --- | --------- |
| `date_lbl`, `live_lbl`            | 0   | **1**     |
| `clock_lbl`                       | 16  | **2–3**   |
| `focus_card`                      | 64  | **5–10**  |
| `list_*[0]`                       | 160 | **11–12** |
| `list_*[3]`                       | 256 | **17–18** |
| `alert_band` / `now_band`         | 160 | **11–20** |
| `alert_word_lbl` / `now_word_lbl` | 224 | **15–16** |
| `empty_title_lbl`                 | 144 | **10**    |
| `empty_sub_lbl`                   | 160 | **11**    |
| `overlay_title`                   | 8   | **1**     |
| `overlay_list[0]`                 | 40  | **3**     |

## Wireframes ASCII

### Ambient

```text
┌──────────────────┐
│SEG 30 AGO    LIVE│ data a esquerda e live a direita
│14:37             │ hora a esquerda, fonte grande
│                  │ gap
│┌────────────────┐│ card com borda e fundo verde
││PROX. EVENTO    ││ texto a esquerda
││Reuniao design  ││ título do evento a esquerda com scroll horizontal
││em 15m - 16:30  ││ tempo até início do evento e hora de início do evento a esquerda
│└────────────────┘│
│                  │ gap
│16:30 Daily Stand │
│TER 09            │ cabeçalho dia a esquerda, fonte pequena e cor azul
│17:00 Code Review │ evento a esquerda, fonte pequena, scroll horizontal apenas do título, hora fica estática
│18:00 Sync Cliente│ evento a esquerda, fonte pequena, scroll horizontal apenas do título, hora fica estática
│19:00 Academia    │ evento a esquerda, fonte pequena, scroll horizontal apenas do título, hora fica estática
│                  │ gap
└──────────────────┘
```

### Alert

`▒` = faixa laranja piscante.

```text
┌──────────────────┐
│SEG 30 AGO    LIVE│ data a esquerda e live a direita
│14:37             │ hora a esquerda, fonte grande
│                  │ gap
│┌────────────────┐│ card com borda e fundo laranja
││EM SEGUIDA      ││ texto a esquerda
││Reuniao design  ││ título do evento a esquerda com scroll horizontal
││em 15m - 15:00  ││ tempo até início do evento e hora de início do evento a esquerda
│└────────────────┘│
│                  │ gap
│▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒│ fundo laranja até final da tela
│▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒│
│▒▒ A L E R T A ▒▒▒│ texto centralizado horizontalmente e verticalmente dentro do fundo laranja
│▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒│ fonte grande, caixa alta e espaço entre as letras
│▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒│
└──────────────────┘
```

### Now

```text
┌──────────────────┐
│SEG 30 AGO    LIVE│ data a esquerda e live a direita
│14:37             │ hora a esquerda, fonte grande
│                  │ gap
│┌────────────────┐│ card com borda e fundo azul
││OCUPADO AGORA   ││ texto a esquerda
││Reuniao design  ││ título do evento a esquerda com scroll horizontal
││Ate 16:30       ││ tempo até final do evento a esquerda
│└────────────────┘│
│                  │ gap
│▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒│ fundo azul até final da tela
│▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒│
│▒▒▒ A G O R A  ▒▒▒│ texto centralizado horizontalmente e verticalmente dentro do fundo azul
│▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒│ fonte grande, caixa alta e espaço entre as letras
│▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒│
└──────────────────┘
```

### Empty

```text
┌──────────────────┐
│SEG 30 AGO    LIVE│ data a esquerda e live a direita
│14:37             │ hora a esquerda, fonte grande
│                  │
│   SEM EVENTOS    │ texto centralizado horizontalmente e verticalmente na tela
│                  │
│                  │
└──────────────────┘
```

### Overlay (toque curto, qualquer estado de fundo)

Fundo opaco preto + moldura ciano. Timeout 15 s. Agrupa eventos por dia.

```text
┌──────────────────┐
│PRÓXIMOS      (11)│  texto a esquerda e count a direita
│                  │  gap
│TER 09            │  cabeçalho dia a esquerda, fonte pequena e cor azul
│18:00 Jantar      │  evento a esquerda, fonte pequena, scroll horizontal apenas do título, hora fica estática
│19:30 Cinema      │  evento a esquerda, fonte pequena, scroll horizontal apenas do título, hora fica estática
│20:00 Comprom     │  evento a esquerda, fonte pequena, scroll horizontal apenas do título, hora fica estática
│QUA 10            │  cabeçalho dia a esquerda, fonte pequena e cor azul
│18:00 Jantar      │  evento a esquerda, fonte pequena, scroll horizontal apenas do título, hora fica estática
│19:30 Cinema      │  evento a esquerda, fonte pequena, scroll horizontal apenas do título, hora fica estática
│                  │  gap
└──────────────────┘
(moldura 1 px COLOR_CYAN)
```

## Tabela de estados (visibilidade)

Legenda: **●** visível · **○** oculto · **—** texto fixo ou derivado do frame.

| Widget                               | Empty     | Ambient   | Alert      | Now | Overlay |
| ------------------------------------ | --------- | --------- | ---------- | --- | ------- |
| `date_lbl`                           | ●         | ●         | ●          | ●   | ●       |
| `live_lbl`                           | ● se LIVE | ● se LIVE | ●          | ●   | ●       |
| `clock_lbl`                          | ●         | ●         | ●          | ●   | ●       |
| `focus_card`                         | ○         | ●         | ●          | ●   | ○       |
| `focus_caption_lbl`                  | ○         | ●         | ●          | ●   | ○       |
| `focus_title_lbl`                    | ○         | ●         | ●          | ●   | ○       |
| `focus_time_lbl`                     | ○         | ●         | ●          | ●   | ○       |
| `list_*`                             | ○         | ●         | ○          | ○   | ○       |
| `alert_band`, `alert_word_lbl`       | ○         | ○         | ● piscante | ○   | ○       |
| `now_band`, `now_word_lbl`           | ○         | ○         | ○          | ●   | ○       |
| `empty_title_lbl`, `empty_sub_lbl`   | ●         | ○         | ○          | ○   | ○       |
| `overlay`                            | ○         | ○         | ○          | ○   | ●       |
| `overlay_title`, `overlay_count_lbl` | ○         | ○         | ○          | ○   | ●       |
| `overlay_list[*]`                    | ○         | ○         | ○          | ○   | ●       |

## Regras de conteúdo dinâmico

| Campo           | Regra                                                                                       |
| --------------- | ------------------------------------------------------------------------------------------- |
| Foco            | Próximo timed relevante; predicados em `index.md` §8                                        |
| Horário foco    | Ambient: `HH:MM - HH:MM` se `has_end`; senão `HH:MM`                                        |
| Alert — horário | `em Nm - HH:MM` (countdown compacto + início) na linha #8                                   |
| Now — fim       | `Ate HH:MM` se `has_end`; senão omitir linha                                                |
| Lista Ambient   | Timed **depois** do foco; até **4** linhas (32 px cada)                                     |
| Lista Overlay   | Timed a partir de `now`; agrupado por dia; até **17** linhas                                |
| Cabeçalho dia   | `SEG 30 AGO` centrado na linha; cor `COLOR_CYAN`                                            |
| Evento overlay  | hora `COLOR_CYAN`, título `COLOR_MUTED`                                                     |
| `overlay_count` | `(N)` onde N = eventos timed na lista (exclui cabeçalhos/espaços)                           |
| Texto longo     | scroll horizontal — ver **Rotação de texto** (`focus_title_lbl`, `list_title_lbl`, overlay) |
| Data header     | `DOM`…`SAB` + dia + mês `JAN`…`DEZ`; cor `COLOR_DATE`                                       |
| Alert blink     | opacidade faixa alterna ~500 ms (como hoje)                                                 |

## Interação

| Gesto            | Efeito                               |
| ---------------- | ------------------------------------ |
| Toque curto      | Abre overlay (`overlay_open = true`) |
| 15 s com overlay | Fecha overlay; recalcula estado      |
| Swipe            | **não suportado**                    |

## Migração desde layout anterior

| Removido                               | Substituído por                     |
| -------------------------------------- | ----------------------------------- |
| `alert_letter_lbl[*]` vertical         | `alert_word_lbl` horizontal         |
| `now_letter_lbl[*]` vertical           | `now_word_lbl` horizontal           |
| labels foco soltas (centradas)         | `focus_card` + caption + pill       |
| overlay transparente                   | overlay opaco + borda ciano         |
| data centrada muted                    | data esquerda vermelha              |
| relógio branco                         | relógio ciano                       |
| `HMI_LIST_Y = 160`                     | `HMI_LIST_Y = 160`                  |
| `HMI_AMBIENT_LIST_SLOTS = 4`           | **4** (32 px/linha, #19–#20 livres) |
| divisores entre linhas (lista Ambient) | _(removido)_                        |

Implementado em `hmi_lvgl.c` + `hmi_layout.h`.

## Handoff para implementação

1. Layout/cores/fontes **neste arquivo** primeiro.
2. Atualizar `hmi_layout.h` (`HMI_LIST_Y`, slots) e `hmi_lvgl.c` — sem mover scheduler para LVGL.
3. Fontes: `lv_font_alerts_22` + `lv_font_alerts_28` (VT323, ver `ui/fonts/README.md`).
4. Validar na board ESP32-C6; PNG quando este arquivo mudar (ADR 0010, lanes `hmi-*.png`).

### Fases sugeridas

| Fase  | Escopo                                                                           |
| ----- | -------------------------------------------------------------------------------- |
| **A** | Tokens, relógio ciano, data vermelha, `ALERTA`/`AGORA` horizontal, faixa horária |
| **B** | Cards, pill countdown, overlay com borda + count                                 |
| **C** | blink refinado (fonte pixel ✓)                                                   |

## Referências

- Política de handoff: [`adr/0009-hmi-screen-design-handoff.md`](adr/0009-hmi-screen-design-handoff.md)
- Predicados de estado: [`index.md` §8](index.md#8-scheduler--hmi--touch)
- Validação hardware: [`adr/0010-hmi-validation-on-hardware.md`](adr/0010-hmi-validation-on-hardware.md)
- Aceite visual: [`mvp-build-plan.md`](mvp-build-plan.md) — _Ship HMI states and touch_
