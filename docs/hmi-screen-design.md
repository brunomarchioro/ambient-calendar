# HMI — design de telas (ASCII + tabela de estados)

Handoff humano → agente para layout LVGL no ESP32-C6 (172×320). Comportamento de scheduler, touch e overlay: [`index.md`](index.md) §8. Implementação: `firmware/esp32-c6/ui/hmi_lvgl.c`.

## Canvas

| Propriedade | Valor                           |
| ----------- | ------------------------------- |
| Resolução   | 172 × 320 px                    |
| Orientação  | portrait (como Waveshare 1.47") |
| Fundo       | `#000000`                       |
| Fonte       | Montserrat (LVGL built-in)      |

## Tokens visuais

| Token         | Hex       | Uso                                          |
| ------------- | --------- | -------------------------------------------- |
| `COLOR_BG`    | `#000000` | fundo da tela                                |
| `COLOR_TEXT`  | `#F2F2F2` | relógio, título foco, countdown, overlay     |
| `COLOR_MUTED` | `#A8A8B0` | data, hora do foco, linhas da lista, divisor |
| `COLOR_ALERT` | `#FF8C42` | faixa Alert (piscante)                       |
| `COLOR_NOW`   | `#4CD98F` | faixa Now                                    |

## Widgets (IDs lógicos)

Uma única tela LVGL; estados alternam visibilidade e texto. Nomes alinhados a `hmi_lvgl.c`.

| ID                    | Tipo                 | Fonte | Alinhamento | Y (top)                | Conteúdo                                       |
| --------------------- | -------------------- | ----- | ----------- | ---------------------- | ---------------------------------------------- |
| `date_lbl`            | label                | 14    | center      | 12                     | `SEG · 24 AGO` (dia semana · dia · mês abrev.) |
| `clock_lbl`           | label                | 28    | center      | 28                     | `HH:MM` (hora local, TZ do schedule)           |
| `focus_title_lbl`     | label                | 20    | center      | 76                     | título do evento em foco ou `SEM EVENTOS`      |
| `focus_time_lbl`      | label                | 16    | center      | 98                     | `HH:MM` do evento em foco                      |
| `countdown_lbl`       | label                | 16    | center      | 118                    | countdown até o foco (`em N min`, …)           |
| `alert_band`          | painel full-width    | —     | top         | 160                    | faixa laranja (#11–20), opacidade piscante     |
| `alert_letter_lbl[*]` | label ×6             | 20    | center      | 192 + i×16             | letras `A L E R T A` (linhas 13–18)            |
| `now_band`            | painel full-width    | —     | top         | 144                    | faixa verde (#10–20)                           |
| `now_letter_lbl[*]`   | label ×5             | 20    | center      | 192 + i×16             | letras `A G O R A` (linhas 13–17)              |
| `list_lbl[*]`         | label ×10            | 14    | left        | 160 + i×16             | `HH:MM título` (lista Ambient)                 |
| `overlay`             | container fullscreen | —     | —           | 0                      | sem fundo; só agrupa título + lista            |
| `overlay_title`       | label                | 16    | center      | 0 (no overlay)           | `PRÓXIMOS`                                     |
| `overlay_list[*]`     | label ×17            | 14    | left/center | 48 + i×16 (no overlay)   | cabeçalho de dia ou `HH:MM título`             |

Largura útil dos labels: resolução − 16 px. Título do foco e linhas de lista: **scroll circular** (`LV_LABEL_LONG_SCROLL_CIRCULAR`) quando o texto não cabe; altura da linha = **16 px** (lista) ou **24 px** (foco).

## Correlação ASCII ↔ pixels

Cada wireframe mostra a **tela inteira** (320 px de altura). Faixas de **18 colunas** (`│ … │`); bordas (`┌`, `└`, `─`) são moldura — **não contam**.

### Grade fixa (tela completa)

| Regra                          | Valor                                                                  |
| ------------------------------ | ---------------------------------------------------------------------- |
| Linhas internas por wireframe  | **20** (sempre)                                                        |
| Pixels por linha               | **16** (`320 ÷ 20`)                                                    |
| Linha `N` (1-based)            | cobre **y = (N−1)×16 … N×16−1**                                        |
| Colunas internas por wireframe | **18** (sempre)                                                        |
| Pixels por coluna              | **9 ou 10 px** (`172 mod 18 = 10`; ver tabela)                         |
| Coluna `C` (1-based)           | **x = ⌊(C−1)×172÷18⌋ … ⌊C×172÷18⌋ − 1**                                |
| Colocar widget na linha        | `N = ⌊Y ÷ 16⌋ + 1` (Y = topo do widget)                                |
| Colocar glyph no wireframe     | conteúdo centrado: `C = ⌊(18 − len)÷2⌋ + 1 …`; lista: **c2** em diante |

Linha em branco = faixa de 16 px sem texto. Coluna em branco = faixa de ~9–10 px sem glyph.

### Coluna ↔ pixel (x)

| C   | x (px) | C   | x (px)  |
| --- | ------ | --- | ------- |
| 1   | 0–8    | 10  | 86–94   |
| 2   | 9–18   | 11  | 95–104  |
| 3   | 19–27  | 12  | 105–113 |
| 4   | 28–37  | 13  | 114–123 |
| 5   | 38–46  | 14  | 124–132 |
| 6   | 47–56  | 15  | 133–142 |
| 7   | 57–65  | 16  | 143–151 |
| 8   | 66–75  | 17  | 152–161 |
| 9   | 76–85  | 18  | 162–171 |

Bloco útil dos labels (`WS_LCD_H_RES − 16`): **c2–17** ≈ **x 8–163** (objeto centrado; texto lista alinhado à esquerda dentro dele).

### Convenções

| Regra           | Significado                                                                 |
| --------------- | --------------------------------------------------------------------------- |
| Linha com texto | Widget ou divisor ancorado nessa faixa (topo em `Y`)                        |
| Linha em branco | **16 px** de gap ou margem inferior                                         |
| `Y`             | Coordenada **superior** do objeto (`TOP_MID`), origem no topo da tela       |
| `state_lbl`     | _(removido)_ — substituído por `alert_band` / `now_band` + letras verticais |

### Altura de faixa por fonte (Montserrat LVGL, ~px)

Widgets podem **vazar** para a linha seguinte (ex.: relógio fonte 28, h~32 px, ocupa linhas 1–2).

| Fonte | Altura ~px | Onde                                               |
| ----- | ---------- | -------------------------------------------------- |
| 28    | 32         | `clock_lbl` (linha 2–3)                            |
| 14    | 16         | `date_lbl` (linha 1), `list_lbl`, `overlay_list`   |
| 20    | 24         | `focus_title_lbl`, letras Alert/Now                |
| 16    | 19         | `focus_time_lbl`, `countdown_lbl`, `overlay_title` |

### Constantes verticais → linha ASCII

| Widget                | Y top (px) | Linha     | Nota                      |
| --------------------- | ---------- | --------- | ------------------------- |
| `date_lbl`            | 12         | **1**     | todos os estados base     |
| `clock_lbl`           | 28         | **2**     | vaza até ~y60 (linha 3)   |
| `focus_title_lbl`     | 76         | **5**     |                           |
| `focus_time_lbl`      | 98         | **7**     |                           |
| `countdown_lbl`       | 118        | **8**     | Ambient / Alert           |
| `now_band`            | 144        | **10**    | Now                       |
| `list_lbl[0]`         | 160        | **11**    | Ambient                   |
| `list_lbl[1]`         | 176        | **12**    | Ambient                   |
| `list_lbl[9]`         | 304        | **20**    | Ambient (último slot)     |
| `alert_band`          | 160        | **11**    | Alert                     |
| `alert_letter_lbl[0]` | 192        | **13**    | Alert                     |
| `now_letter_lbl[0]`   | 192        | **13**    | Now                       |
| _(margem inferior)_   | 240–319    | **16–20** | Empty / Ambient em branco |
| `overlay_title`       | 0          | **1**     | no overlay                |
| `overlay_list[0]`     | 48         | **4**     | 1ª linha de conteúdo      |
| `overlay_list[16]`    | 304        | **20**    | overlay (último slot)     |

### Linhas em branco ↔ pixels

Cada linha vazia no wireframe = **16 px**. Várias linhas vazias consecutivas somam (ex.: linhas 16–20 = **80 px** de rodapé vazio).

| Wireframe | Linhas vazias       | Pixels            | Entre                                      |
| --------- | ------------------- | ----------------- | ------------------------------------------ |
| Ambient   | 3–4, 6, 9–10        | 32, 16, 32        | relógio↔foco; foco↔countdown; lista #11–20 |
| Alert     | 2–4, 6, 9–12, 14–20 | 48–64, 16, 64, 32 | sem data; foco↔estado; rodapé              |
| Now       | 2–4, 6–12, 14–20    | 48–64, 112, 32    | sem data; foco↔`AGORA`; rodapé             |
| Empty     | 3–4, 6–20           | 32, 240           | relógio↔mensagem; rodapé                   |
| Overlay   | 20                  | 16                | rodapé; fundo = estado atual visível       |

### Como usar no handoff

1. **Wireframe = 20 linhas × 18 colunas** — tela inteira (320×172 px); linhas 16–20 = rodapé vazio.
2. **Mover widget** → conte a linha/coluna pela régua e consulte as tabelas de correlação (`Y`, `c`, `x`).
3. **Régua** `123456789012345678` acima de cada caixa alinha colunas 1–18 ao conteúdo entre `│ … │`.
4. **Validar** → simulador 172×320; aceite PNG em `mvp-build-plan.md`.

## Wireframes ASCII

Cada bloco: **20 linhas × 16 px** (altura) e **18 colunas** (largura). **`#N`** = linha (faixa **y**); régua = colunas. Detalhes em **Correlação ASCII ↔ pixels**.

### Ambient

```text
 123456789012345678
┌──────────────────┐
│   SEG · 24 AGO   │  #1
│      14:32       │  #2
│                  │  #3
│                  │  #4
│     REUNIÃO      │  #5
│                  │  #6
│      15:00       │  #7
│    em 28 min     │  #8
│                  │  #9
│                  │  #10
│ 18:30 Academia   │  #11
│ 20:00 Jantar     │  #12
│ 21:00 Comprompro │  #13
│ 22:00 Comprompro │  #14
│ 23:00 Comprompro │  #15
│ 00:00 Comprompro │  #16
│ 01:00 Reunião    │  #17
│ 02:00 Comprompro │  #18
│ 03:00 Cinema     │  #19
│ 04:00 Comprompro │  #20
└──────────────────┘
```

### Alert

`▒` = faixa amarela piscante

```text
 123456789012345678
┌──────────────────┐
│   SEG · 24 AGO   │  #1
│      14:45       │  #2
│                  │  #3
│                  │  #4
│     REUNIÃO      │  #5
│                  │  #6
│      15:00       │  #7
│    em 15 min     │  #8
│                  │  #9
│                  │  #10
│▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒│  #11
│▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒│  #12
│▒▒▒▒▒▒▒ A ▒▒▒▒▒▒▒▒│  #13
│▒▒▒▒▒▒▒ L ▒▒▒▒▒▒▒▒│  #14
│▒▒▒▒▒▒▒ E ▒▒▒▒▒▒▒▒│  #15
│▒▒▒▒▒▒▒ R ▒▒▒▒▒▒▒▒│  #16
│▒▒▒▒▒▒▒ T ▒▒▒▒▒▒▒▒│  #17
│▒▒▒▒▒▒▒ A ▒▒▒▒▒▒▒▒│  #18
│▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒│  #19
│▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒│  #20
└──────────────────┘
```

### Now

`▒` = faixa verde

```text
 123456789012345678
┌──────────────────┐
│   SEG · 24 AGO   │  #1
│      14:45       │  #2
│                  │  #3
│                  │  #4
│     REUNIÃO      │  #5
│                  │  #6
│      15:00       │  #7
│                  │  #8
│                  │  #9
│▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒│  #10
│▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒│  #11
│▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒│  #12
│▒▒▒▒▒▒▒ A ▒▒▒▒▒▒▒▒│  #13
│▒▒▒▒▒▒▒ G ▒▒▒▒▒▒▒▒│  #14
│▒▒▒▒▒▒▒ O ▒▒▒▒▒▒▒▒│  #15
│▒▒▒▒▒▒▒ R ▒▒▒▒▒▒▒▒│  #16
│▒▒▒▒▒▒▒ A ▒▒▒▒▒▒▒▒│  #17
│▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒│  #18
│▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒│  #19
│▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒│  #20
└──────────────────┘
```

### Empty

```text
 123456789012345678
┌──────────────────┐
│   SEG · 24 AGO   │  #1
│      14:45       │  #2
│                  │  #3
│                  │  #4
│   SEM EVENTOS    │  #5
│                  │  #6
│                  │  #7
│                  │  #8
│                  │  #9
│                  │  #10
│                  │  #11
│                  │  #12
│                  │  #13
│                  │  #14
│                  │  #15
│                  │  #16
│                  │  #17
│                  │  #18
│                  │  #19
│                  │  #20
└──────────────────┘
```

### Overlay (toque curto, qualquer estado de fundo)

Camada sobre o estado de fundo (sem dim). Timeout 15 s. Agrupa eventos por dia local (`SEG · 24 AGO`); linha em branco antes de cada novo dia (exceto o primeiro), entre cabeçalho e eventos, e entre dias.

```text
 123456789012345678
┌──────────────────┐
│    PRÓXIMOS      │  #1
│                  │  #2
│                  │  #3
│   QUI · 24 AGO   │  #4
│                  │  #5
│ 18:00 Jantar     │  #6
│ 19:30 Cinema     │  #7
│ 20:00 Comprom... │  #8
│ 21:00 Comprom... │  #9
│ 22:00 Comprom... │  #10
│ 23:00 Comprom... │  #11
│ 00:00 Comprom... │  #12
│ 01:00 Reunião    │  #13
│                  │  #14
│   SEX · 25 AGO   │  #15
│                  │  #16
│ 05:00 Comprom... │  #17
│ 06:00 Comprom... │  #18
│ 07:00 Comprom... │  #19
│ 08:00 Comprom... │  #20
└──────────────────┘
```

Quantidade visível = **quantos couberem na tela** (`HMI_AMBIENT_LIST_SLOTS` = 10 eventos; `HMI_OVERLAY_LIST_SLOTS` = 17 linhas incluindo cabeçalhos de dia e espaços). Constantes em `hmi_layout.h`.

## Tabela de estados (visibilidade)

Legenda: **●** visível com conteúdo · **○** oculto · **—** visível, texto fixo ou derivado do frame.

| Widget                | Empty         | Ambient      | Alert      | Now    | Overlay aberto       |
| --------------------- | ------------- | ------------ | ---------- | ------ | -------------------- |
| `clock_lbl`           | ●             | ●            | ●          | ●      | ● (atrás do overlay) |
| `date_lbl`            | ●             | ●            | ●          | ●      | como estado de fundo |
| `focus_title_lbl`     | `SEM EVENTOS` | ● foco       | ● foco     | ● foco | como estado de fundo |
| `focus_time_lbl`      | ○             | ●            | ●          | ●      | como estado de fundo |
| `countdown_lbl`       | ○             | ●            | ●          | ○      | como estado de fundo |
| `alert_band`          | ○             | ○            | ● piscante | ○      | como estado de fundo |
| `alert_letter_lbl[*]` | ○             | ○            | ●          | ○      | como estado de fundo |
| `now_band`            | ○             | ○            | ○          | ●      | como estado de fundo |
| `now_letter_lbl[*]`   | ○             | ○            | ○          | ●      | como estado de fundo |
| `list_lbl[*]`         | ○             | ● até couber | ○          | ○      | ○                    |
| `overlay`             | ○             | ○            | ○          | ○      | ● (transparente)     |
| `overlay_title`       | ○             | ○            | ○          | ○      | `PRÓXIMOS`           |
| `overlay_list[*]`     | ○             | ○            | ○          | ○      | ● até couber         |

### Regras de conteúdo dinâmico

| Campo         | Regra                                                            |
| ------------- | ---------------------------------------------------------------- |
| Foco          | Próximo timed relevante; ver predicados em `index.md` §8         |
| Countdown     | `em N min` / `em N h` / `em N dias …`; mínimo 1 min se futuro    |
| Lista Ambient | Próximos timed **depois** do foco; até **10** linhas (y 160–319) |
| Lista Overlay | Próximos timed a partir de `now`; agrupados por dia; até **17** linhas (y 48–319) |
| Cabeçalho dia | `SEG · 24 AGO` centrado; repete ao mudar o dia civil (TZ do schedule)               |
| Texto longo   | Scroll circular no título foco e nas linhas de lista             |
| Data          | Formato PT: `DOM`…`SAB`, mês `JAN`…`DEZ`                         |

## Interação

| Gesto                   | Efeito                               |
| ----------------------- | ------------------------------------ |
| Toque curto na tela     | Abre overlay (`overlay_open = true`) |
| 15 s com overlay aberto | Fecha overlay; recalcula estado      |
| Swipe                   | **não suportado**                    |

## Handoff para implementação

1. Alterar layout/cores/fontes **neste arquivo** (wireframes + tabela).
2. Agent implementa em `firmware/esp32-c6/ui/hmi_lvgl.c` — não mover lógica de scheduler para o LVGL.
3. Validar pixels na board ESP32-C6 (flash + inspeção visual); evidência PNG da tela física quando **este arquivo** muda no PR (lanes `hmi-*.png` em `docs/mvp-build-plan.md`).
4. Comportamento (`alerts_hmi_build_frame`) permanece em `hmi_frame.c` salvo mudança explícita de produto.

## Referências

- Política de handoff (formato, camadas, o que não usar): [`adr/0009-hmi-screen-design-handoff.md`](adr/0009-hmi-screen-design-handoff.md)
- Predicados Empty / Ambient / Alert / Now: [`index.md` §8](index.md#8-scheduler--hmi--touch)
- Validação HMI no hardware: [`adr/0010-hmi-validation-on-hardware.md`](adr/0010-hmi-validation-on-hardware.md)
- Aceite visual (lanes): [`mvp-build-plan.md`](mvp-build-plan.md) — seção _Ship HMI states and touch_
