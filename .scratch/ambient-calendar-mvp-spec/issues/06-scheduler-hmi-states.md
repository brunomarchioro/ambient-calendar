# Estados do scheduler e HMI

Type: grilling
Status: resolved
Blocked by: 04, 05

## Question

Quais estados de apresentação o MVP especifica (tela normal, sem eventos, alerta, AGORA, etc.), a prioridade visual (hora → próximo → countdown → lista), regras do scheduler local a partir de `reminderMinutes` + relógio, touch mínimo (toque/swipe/timeout), e o que fazer com all-day e com múltiplos Events na janela de alerta?

ASCII/estados na spec; pixels fora. Respeitar constraints de hardware da research do display.

## Answer

Quatro estados, um por frame, prioridade **`Now` > `Alert` > `Ambient` > `Empty`**. Só Events **timed** disparam `Alert`/`Now`; all-day nunca.

| Estado | Predicado |
| --- | --- |
| `Now` | timed com `now ∈ [startAt, min(startAt+2min, endAt))` (`endAt == null` → +2 min); foco = menor `startAt` |
| `Alert` | timed com `now ∈ [startAt - reminderMinutes, startAt)`; foco = menor `startAt` (empate → `id`) |
| `Ambient` | há timed com `startAt > now` e não está em Now/Alert |
| `Empty` | nenhum timed com `startAt > now` |

Pós-`Now`: recalcula; “próximo” = próximo `startAt` futuro.

**Ambient:** hora+data → próximo timed → countdown → até `showNextEvents` linhas; all-day do dia pode ir na lista, nunca no slot “próximo”.

**Touch:** toque curto abre overlay de lista (qualquer estado); timeout **15s** → estado recalculado; sem swipe; sem create/edit.

ASCII canônico na spec: Ambient / Alert (label ALERTA) / Now (label AGORA) / Empty (SEM EVENTOS, sem “amanhã …” fantasma).
