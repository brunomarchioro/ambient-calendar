# Ambient Calendar Display — Spec MVP

Spec buildável do MVP. Decisões: [mapa wayfinder](../.scratch/ambient-calendar-mvp-spec/map.md). Detalhe de research fica em `docs/research/` — aqui só o freeze.

## 1. Objetivo

Display ambient pessoal no **Waveshare ESP32-C6 Touch LCD 1.47"**: hora, próximo Event, countdown, lista curta e Alerta/Agora. Agenda vem do Google Calendar (read-only) mais Lembretes manuais na web. Offline no device a partir do cache local.

Regra:

> **O backend entende calendário. O ESP32 entende tempo e apresentação.**

## 2. Glossário

Termos canônicos em [`CONTEXT.md`](../CONTEXT.md): Ambient Calendar Display, Event, Lembrete, Alerta, Agora, Settings.

## 3. Arquitetura

```text
Google Calendar ──► Cloudflare Worker (TanStack Start)
                         │  fetch  → server routes + SPA
                         │  scheduled → sync Google→D1
                         ▼
                        D1
                         ▲
                    HTTPS + Bearer
                         │
                   ESP32-C6 + LVGL
```

| Peça | Freeze |
| --- | --- |
| Runtime | Um Worker: `fetch` → Start, `scheduled` → sync. Vite + `@cloudflare/vite-plugin` + `nodejs_compat`. Entry custom (não só o `server-entry` default). |
| API | Só **server routes** HTTP. Sem `createServerFn`, sem RSC. |
| Web | SPA / `ssr: false`; dados via `fetch` + TanStack Query. |
| DB | Cloudflare D1 (binding/`env`). Uma query por vez por DB — ok para uso pessoal. |
| Auth web | Cloudflare Access na borda. Sem sessão própria no app. |
| Plano | **Workers Paid** para Cron + sync Google. Não prometer Free. |
| Cron | Intervalo em Wrangler (UTC). Padrão MVP: **a cada 15 min**. Wall ≤ 15 min; CPU de Cron &lt;1h → teto 30 s no Paid. |

Não prometer: Node `fs`, D1 com writers concorrentes pesados, Cron &gt;15 min de wall.

Research: [tanstack-start-workers-d1.md](./research/tanstack-start-workers-d1.md).

### Stack web (MVP)

TanStack Start + Query + Form (+ Table se útil) + React + Zustand + Zod + Chakra UI.

### Firmware

ESP-IDF ≥ 5.5 + LVGL via BSP Waveshare. Ver §7.

## 4. Dados

### Event (D1)

```text
Event
├── id            — id interno
├── source        — google | manual
├── externalId    — id da instância Google (só source=google)
├── title
├── startAt       — ISO com semântica abaixo
├── endAt         — exclusivo; null se timed sem fim
├── allDay        — boolean
├── timezone      — IANA (Settings no sync)
├── createdAt
└── updatedAt
```

- Timed: instantes derivados de `dateTime` (offset ou UTC normalizado na app).
- All-day: `startAt` / `endAt` = meia-noite no `Settings.timezone`; `endAt` exclusivo (espelha Google); `allDay=true`.
- Lembrete na UI = Event com `source: manual`. Mesmo modelo.

### Settings (singleton)

| Campo | Default | Range | Quem usa |
| --- | --- | --- | --- |
| `timezone` | `America/Sao_Paulo` | IANA | sync, device, web |
| `reminderMinutes` | `30` | `1..180` | Alerta no ESP32; device + web; **não** no cron Google |
| `lookaheadDays` | `7` | `1..30` | só backend (horizonte sync + filtro do schedule); web |
| `showNextEvents` | `2` | `1..5` | HMI; device + web; backend **não** corta `events[]` do schedule |

Seed com defaults se a linha não existir. Quiet hours **não existem**.

## 5. Sync Google

Conta única via secrets OAuth (refresh token). Calendário `primary`.

A cada Cron:

1. Refresh do access token.
2. `events.list` com `singleEvents=true`, `orderBy=startTime`, `timeMin`/`timeMax` = horizonte `[now, now+lookaheadDays)`, `timeZone` = Settings, paginar até acabar.
3. Upsert D1 por `externalId = items[].id`.
4. Delete `source=google` ausentes do set ou fora do horizonte.
5. Linhas `manual` intocadas.

**Sem `syncToken`** — incompatível com filtro de tempo. Recorrentes só como instâncias expandidas; sem RRULE no D1.

Research: [google-calendar-sync-model.md](./research/google-calendar-sync-model.md).

## 6. API

Auth web: Access na borda (rotas `/api/events`, `/api/settings`, etc.).  
Auth device: `Authorization: Bearer <DEVICE_API_TOKEN>` só em `/api/device/*`.

### `GET /api/device/schedule`

**200** + JSON:

```json
{
  "serverTime": "2026-08-27T11:00:00-03:00",
  "timezone": "America/Sao_Paulo",
  "reminderMinutes": 30,
  "showNextEvents": 2,
  "events": [
    {
      "id": "evt_123",
      "title": "Reunião",
      "startAt": "2026-08-27T14:00:00-03:00",
      "endAt": "2026-08-27T15:00:00-03:00",
      "allDay": false
    }
  ]
}
```

- Sem `lookaheadDays`, `source`, `externalId`, timezone por Event, timestamps de auditoria.
- Tempos: ISO-8601 **com offset** no fuso de Settings; all-day = `00:00` + `allDay: true`; `endAt` exclusivo; timed sem fim → `endAt: null`.
- `events`: overlap em `[now, now+lookaheadDays]`, `startAt` asc; `[]` ok; `showNextEvents` não corta o array.
- Erros: `401` token; `503` se não monta a resposta. Body mínimo.

### Outras rotas (MVP)

```text
GET    /api/events
POST   /api/events          — só manual (Lembrete)
PUT    /api/events/:id      — só manual
DELETE /api/events/:id      — só manual

GET    /api/settings
PUT    /api/settings

GET    /api/health
```

Google na web: **read-only** (listar). Sem criar/editar Events Google pelo app.

## 7. Firmware constraints

| Tópico | Freeze |
| --- | --- |
| Board | Waveshare ESP32-C6-Touch-LCD-1.47 (C6FH8) |
| Display | JD9853, 172×320, SPI |
| Touch | AXS5106L, I2C |
| IDF | ≥ 5.5; BSP Waveshare + LVGL demos |
| RAM / flash | 512 KB HP SRAM, 8 MB flash, **sem PSRAM** — cache de agenda em flash |
| FS | NVS (meta) + LittleFS (agenda); **não** SPIFFS |
| Relógio | SNTP primário; `serverTime` seed/fallback |
| HTTPS | `esp_http_client` + certificate bundle |
| Bootstrap | Wi-Fi, URL da API e token em **compile-time / flash** — sem captive portal |

Research: [esp32-c6-waveshare-constraints.md](./research/esp32-c6-waveshare-constraints.md).

### Offline

Cache local dos Events do schedule. Sem rede: relógio (se válido), countdown, Alerta/Agora, lista. Re-poll quando voltar.

## 8. Scheduler / HMI / Touch

Um estado por frame. Prioridade: **`Now` > `Alert` > `Ambient` > `Empty`**. Só **timed** em Alerta/Agora. All-day nunca dispara esses dois; pode aparecer na lista do Ambient se couber slot (nunca no “próximo”).

| Estado | Predicado |
| --- | --- |
| `Now` (Agora) | timed com `now ∈ [startAt, min(startAt+2min, endAt))`; `endAt == null` → +2 min. Foco = menor `startAt`. |
| `Alert` (Alerta) | timed com `now ∈ [startAt - reminderMinutes, startAt)`. Foco = menor `startAt` (empate → `id`). |
| `Ambient` | há timed com `startAt > now` e não está em Now/Alert |
| `Empty` | nenhum timed com `startAt > now` |

Pós-Now: recalcula; próximo = próximo `startAt` futuro.

**Ambient:** hora+data → próximo timed → countdown → até `showNextEvents` linhas.

**Touch:** toque curto → overlay de lista (qualquer estado); timeout **15 s** → estado recalculado; **sem swipe**; sem create/edit no device.

Pixels fora desta spec — só estados/ASCII.

### Ambient

```text
┌──────────────────┐
│      14:32       │
│   SEG · 24 AGO   │
│                  │
│     REUNIÃO      │
│      15:00       │
│    em 28 min     │
│ ──────────────── │
│ 18:30 Academia   │
│ 20:00 Jantar     │
└──────────────────┘
```

### Alert

```text
┌──────────────────┐
│      14:45       │
│                  │
│     REUNIÃO      │
│      15:00       │
│    em 15 min     │
│     ALERTA       │
└──────────────────┘
```

### Now

```text
┌──────────────────┐
│      15:00       │
│                  │
│     REUNIÃO      │
│                  │
│      AGORA       │
└──────────────────┘
```

### Empty

```text
┌──────────────────┐
│      14:32       │
│   SEG · 24 AGO   │
│                  │
│   SEM EVENTOS    │
└──────────────────┘
```

## 9. Web UI

Não é admin completo.

**Agenda:** próximos Events; Google read-only; CRUD de Lembretes (título, data/hora, duração opcional).

**Settings:** os quatro campos do §4 (sem quiet hours).

## 10. Secrets / bootstrap

### Worker secrets

```text
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
GOOGLE_REFRESH_TOKEN
DEVICE_API_TOKEN
```

Mais binding D1 e `triggers.crons` no Wrangler. Nada de secret em `VITE_*`.

### `GOOGLE_REFRESH_TOKEN` (ops)

Checklist humana (uma vez por conta):

1. Projeto Google Cloud com Calendar API ligada.
2. OAuth client (tipo adequado a refresh offline / playground).
3. Consent com scope de leitura do Calendar; obter refresh token de longa duração.
4. Gravar como secret do Worker (`wrangler secret put`).
5. Rotação: repetir o fluxo e atualizar o secret; sem OAuth interativo no app.

### `DEVICE_API_TOKEN` (ops)

1. Gerar token longo aleatório; `wrangler secret put DEVICE_API_TOKEN`.
2. Mesmo valor no firmware (compile-time / NVS no flash).
3. Rotação MVP: gerar novo secret, reflashear device, atualizar Worker — na mesma janela. Sem distribuição OTA de token.

Setup Access (política, IdP) fica **fora** desta spec de app.

## 11. Estrutura monorepo

Mínimo alinhado à research TanStack/Workers. Tooling CI fino fora do MVP.

```text
alerts/
├── app/                    # @app/alerts — Node/Worker (UI, API, Cron, D1)
│   ├── domain/
│   ├── server/
│   ├── client/
│   ├── routes/
│   ├── db/migrations/
│   ├── worker.ts
│   ├── package.json
│   ├── vite.config.ts
│   ├── wrangler.jsonc
│   └── vitest.config.ts
├── firmware/
│   └── esp32-c6/
│       ├── network/
│       ├── sync/
│       ├── scheduler/
│       ├── storage/
│       └── ui/
├── docs/
│   ├── index.md            # esta spec
│   └── research/
└── CONTEXT.md
```

Um Worker serve UI + API + Cron.

## 12. Checklist MVP

### Backend

- [ ] TanStack Start + Workers (entry `fetch` + `scheduled`)
- [ ] D1 + migrations + seed Settings
- [ ] Sync Google via Cron (modelo §5)
- [ ] CRUD Lembretes + listagem (Google read-only na API de events)
- [ ] `GET`/`PUT /api/settings`
- [ ] `GET /api/device/schedule` + Bearer
- [ ] `GET /api/health`
- [ ] Secrets no Wrangler; plano Paid

### Web

- [ ] Lista de próximos Events
- [ ] CRUD Lembrete
- [ ] Settings (4 campos)
- [ ] Protegido por Access (deploy)

### Firmware

- [ ] Wi-Fi + HTTPS schedule poll
- [ ] SNTP + fallback `serverTime`
- [ ] LittleFS cache + NVS meta
- [ ] Scheduler nos 4 estados
- [ ] LVGL ASCII→UI (Ambient / Alert / Now / Empty)
- [ ] Toque + timeout 15 s
- [ ] Offline com cache

## 13. Fora do MVP

- Quiet hours
- Calendário mensal no display
- Criar/editar Events Google (web ou device)
- OAuth interativo no app para trocar conta Google
- Captive portal / provisioning touch
- Auth de sessão própria na web
- Multi-device / multi-usuário
- OTA de firmware
- Swipe na HMI
- CI/monorepo tooling além do mínimo para build/deploy Wrangler
- Push Google (`events.watch`) em vez de Cron
