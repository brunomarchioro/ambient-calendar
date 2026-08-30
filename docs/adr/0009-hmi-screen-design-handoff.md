# ADR 0009: Handoff de layout HMI em `docs/hmi-screen-design.md`

## Status

Aceito (2026-08-29)

## Contexto

A HMI do ESP32-C6 (172×320, LVGL) precisa evoluir com revisão humana de layout e implementação por agente ou dev. Comportamento (Empty, Ambient, Alert, Now, overlay, touch) já vive em [`index.md`](../index.md) §8 e em `hmi_frame.c`. Pixels, posicionamento e visibilidade por estado não cabem na spec de produto sem poluir o índice nem duplicar tabelas em ADR.

Precisávamos de uma **política estável**: onde editar design, em que formato, e o que fica fora (XML runtime, preview web, etc.).

## Decisão

- **Fonte de verdade visual:** [`docs/hmi-screen-design.md`](../hmi-screen-design.md) — wireframes ASCII de **tela inteira**, tokens, widgets, tabela de visibilidade, correlação linha ↔ pixel. Conteúdo visual **não** entra em ADR.
- **Formato de wireframe:** grade fixa **20 linhas × 16 px = 320 px**; linha `N` ↔ faixa `y = (N−1)×16 … N×16−1`; widget na linha `⌊Y÷16⌋ + 1`.
- **Separação de camadas:**
  - `index.md` §8 — predicados, prioridade de estados, touch (15 s), sem layout detalhado.
  - `hmi-screen-design.md` — layout e visibilidade por estado.
  - `hmi_frame.c` — monta `alerts_hmi_frame_t` (domínio).
  - `hmi_lvgl.c` — cria widgets e pinta a partir do frame (implementação LVGL).
- **Handoff humano → implementador:** alterações de layout começam no design doc; código segue o doc, validado na **board ESP32-C6** (172×320) e evidência PNG do `mvp-build-plan.md` quando o design doc muda (ADR 0010).
- **Uma tela LVGL** com show/hide por estado — não uma screen LVGL por estado (RAM 512 KB, sem PSRAM).

## Alternativas consideradas

| Alternativa | Por que não (como política padrão) |
| --- | --- |
| Wireframes só em `index.md` | Spec de produto fica pesada; layout itera mais que predicados |
| LVGL XML carregado em runtime | Motor comercial; complexidade desnecessária no MVP |
| LVGL Pro / SquareLine como **fonte** sem doc repo | Difícil diff e handoff para agentes; export C ainda exige glue em `hmi_lvgl.c` |
| Preview web no `app/` | Rejeitado no ADR 0005 / ADR 0010 — drift TS ↔ C |
| Mockups PNG sem spec estruturada | Agente infere spacing; wireframe + tabela reduzem ambiguidade |
| Quatro telas LVGL separadas | Custo de RAM; estados são mutuamente exclusivos por frame |

Ferramentas visuais (Figma, Editor LVGL) podem **informar** edits no design doc; o artefato versionado no repo continua sendo o Markdown.

## Consequências

- PRs que mudam layout devem atualizar `hmi-screen-design.md` no mesmo passo que `hmi_lvgl.c` (ou justificar divergência temporária).
- ADRs e `index.md` **linkam** o design doc; não copiam wireframes.
- Aceite visual na board física e nos lanes PNG quando `hmi-screen-design.md` muda; o design doc define o alvo.
- Termo operacional: editar layout = editar `hmi-screen-design.md`, não só comentários no C.
