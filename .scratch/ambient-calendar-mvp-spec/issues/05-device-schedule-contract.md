# Contrato GET /api/device/schedule

Type: grilling
Status: resolved
Blocked by: 01, 02

## Question

Qual o contrato exato de `GET /api/device/schedule` na spec: campos por Event (incl. all-day), settings embutidos vs omitidos, formato de tempo, o que o ESP32 deliberadamente **não** recebe (source, externalId, etc.), auth bearer, e erros?

Deve refletir o princípio: backend entende calendário; device entende tempo e apresentação. Incorporar Settings decididos e o modelo de Event vindo do sync Google.

## Answer

`GET /api/device/schedule` com `Authorization: Bearer <DEVICE_API_TOKEN>`.

**Envelope:** `serverUnix`, `timezone`, `reminderMinutes`, `showNextEvents`, `events[]`. Sem `lookaheadDays`.

**Event no wire:** `id`, `title`, `startUnix`, `endUnix`, `allDay`. Omitir `source`, `externalId`, timezone do Event, `createdAt`, `updatedAt`.

**Tempo:** segundos Unix UTC (`serverUnix`, `startUnix`, `endUnix`); `endUnix: null` = timed sem fim; all-day = instantes de meia-noite no fuso de Settings convertidos para Unix + `allDay: true`; `endUnix` exclusivo quando presente. SNTP no device; `serverUnix` só seed/fallback de relógio (ADR 0004).

**Conjunto:** overlap em `[now, now+lookaheadDays]`, ordenado por `startUnix` asc; `[]` → `200`; `showNextEvents` não corta o array.

**Erros:** `401` token; `503` se não monta a resposta; body mínimo.

Princípio: backend = calendário; device = tempo + apresentação.
