# Ambient Calendar Display — MVP spec map

Labels: `wayfinder:map`

## Destination

Uma spec buildável do MVP completo do **Ambient Calendar Display** (backend Cloudflare/TanStack + web + firmware ESP-IDF/LVGL), reescrevendo `docs/index.md` no lugar, pronta para handoff de implementação.

## Notes

- Domínio: consultar e manter `CONTEXT.md` (domain-modeling). Skills usuais: grilling, domain-modeling, research.
- `docs/index.md` é rascunho a refinar — não fonte congelada.
- Tracker: markdown local em `.scratch/ambient-calendar-mvp-spec/`.
- Já decidido fora dos tickets: auth web Basic no Worker ([ADR 0012](../../docs/adr/0012-web-basic-auth.md)); **Contas Google** via OAuth web + D1 ([ADR 0006](../../docs/adr/0006-google-multi-account-oauth.md)); **Cliente MCP** / Autorização MCP ([ADR 0010](../../docs/adr/0010-mcp-reminders-oauth.md)); Lembrete = UI de Event manual; quiet hours removido; Google read-only na web (sem CRUD google); bootstrap ESP32 compile-time; sync espelho D1; HMI na spec = estados/ASCII.
- Wayfinder é planning: este mapa produz a spec/decisões, não o código do MVP (salvo Notes override futuro).
- Mapa **planning done** (ticket 07): rewrite de `docs/index.md` é a próxima ação pós-mapa, segundo o brief do ticket 07.
- Rewrite de `docs/index.md` **feito** (sessão pós-mapa); spec aponta researches e o mapa.

## Decisions so far

- [TanStack Start HTTP-only no Workers + D1](.scratch/ambient-calendar-mvp-spec/issues/03-tanstack-start-workers-d1.md): Worker único com entry custom (fetch+scheduled), D1 via binding/env, API só por server routes + SPA/SSR off; Paid para Cron/Google; não prometer Free, Node fs, D1 concorrente nem Cron além de 15 min.
- [Modelo de sync Google Calendar](.scratch/ambient-calendar-mvp-spec/issues/02-google-calendar-sync-model.md): Cron = refresh OAuth por conta + `events.list` por **Calendário Google habilitado** (`singleEvents`, horizonte `timeMin`/`timeMax`); upsert por `(conta, calendário, externalId)`; delete-not-in por escopo; sem `syncToken` ([ADR 0006](../../docs/adr/0006-google-multi-account-oauth.md))
- [Constraints ESP32-C6 + Waveshare 1.47"](.scratch/ambient-calendar-mvp-spec/issues/04-esp32-c6-waveshare-constraints.md): JD9853+AXS5106L (IDF≥5.5 BSP/LVGL); 512KB SRAM/8MB flash/sem PSRAM; NVS+LittleFS (não SPIFFS); SNTP primário + serverUnix fallback; HTTPS via esp_http_client+cert bundle
- [Settings finais sem quiet hours](.scratch/ambient-calendar-mvp-spec/issues/01-settings-sem-quiet-hours.md): singleton com `timezone`, `reminderMinutes`, `lookaheadDays`, `showNextEvents` (defaults SP/30/7/2; ranges 1–180 / 1–30 / 1–5); `lookaheadDays` só backend; `showNextEvents` não corta o schedule
- [Contrato GET /api/device/schedule](.scratch/ambient-calendar-mvp-spec/issues/05-device-schedule-contract.md): Bearer + envelope `serverUnix`/`timezone`/`reminderMinutes`/`showNextEvents`/`events`; Event = `id`/`title`/`startUnix`/`endUnix`/`allDay` (sem source/externalId); Unix UTC no wire; horizonte no backend; `401`/`503` (ADR 0004)
- [Estados do scheduler e HMI](.scratch/ambient-calendar-mvp-spec/issues/06-scheduler-hmi-states.md): `Now`>`Alert`>`Ambient`>`Empty`; Alerta/Now só timed; foco = menor `startAt`; Now ≤2 min; Ambient = hora→próximo→countdown→lista N; tap+15s; sem swipe; ASCII na spec
- [Escopo do rewrite de docs/index.md](.scratch/ambient-calendar-mvp-spec/issues/07-index-md-rewrite-scope.md): brief §§1–13 no lugar; corpo=MVP; tokens em ops; research linkada; rewrite pós-mapa; DoD = children closed + fog classificado
- **Multi-conta Google + OAuth web** ([ADR 0006](../../docs/adr/0006-google-multi-account-oauth.md)): até 5 contas; refresh no D1 criptografado; calendários selecionáveis na Settings; fluxo `/api/google/oauth/*`
- **Cliente MCP + Autorização MCP** ([ADR 0010](../../docs/adr/0010-mcp-reminders-oauth.md)): `/mcp` + tools de Lembretes; OAuth distinto de Conta Google e Basic Auth web

## Not yet specified

_(vazio — fog classificado no ticket 07)_

## Out of scope

- Quiet hours / `quietHoursStart` / `quietHoursEnd`.
- Calendário mensal no display.
- Edição ou criação de Events Google pela web ou pelo device.
- Captive portal / provisioning touch no ESP32 (MVP = compile-time/flash).
- Auth de sessão própria na aplicação web.
- Mais de um device / multi-usuário.
- OTA de firmware.
- Detalhe fino de monorepo tooling (CI etc.) além do mínimo da research TanStack/Workers.
- Refresh token único em secret (`GOOGLE_REFRESH_TOKEN`) — substituído por OAuth web ([ADR 0006](../../docs/adr/0006-google-multi-account-oauth.md)).
