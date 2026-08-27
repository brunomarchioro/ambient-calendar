# Contrato GET /api/device/schedule

Type: grilling
Status: resolved
Blocked by: 01, 02

## Question

Qual o contrato exato de `GET /api/device/schedule` na spec: campos por Event (incl. all-day), settings embutidos vs omitidos, formato de tempo, o que o ESP32 deliberadamente **não** recebe (source, externalId, etc.), auth bearer, e erros?

Deve refletir o princípio: backend entende calendário; device entende tempo e apresentação. Incorporar Settings decididos e o modelo de Event vindo do sync Google.

## Answer

`GET /api/device/schedule` com `Authorization: Bearer <DEVICE_API_TOKEN>`.

**Envelope:** `serverTime`, `timezone`, `reminderMinutes`, `showNextEvents`, `events[]`. Sem `lookaheadDays`.

**Event no wire:** `id`, `title`, `startAt`, `endAt`, `allDay`. Omitir `source`, `externalId`, timezone do Event, `createdAt`, `updatedAt`.

**Tempo:** ISO-8601 com offset no fuso de Settings; all-day = `00:00` nesse fuso + `allDay: true`; `endAt` exclusivo; timed sem fim → `endAt: null`.

**Conjunto:** overlap em `[now, now+lookaheadDays]`, `startAt` asc; `[]` → `200`; `showNextEvents` não corta o array.

**Erros:** `401` token; `503` se não monta a resposta; body mínimo.

Princípio: backend = calendário; device = tempo + apresentação.
