# Modelo de sync Google Calendar

Type: research
Status: resolved
Blocked by:

## Question

Quais fatos da Google Calendar API a spec do MVP precisa fixar para: autenticação com refresh token de uma conta; buscar eventos futuros no horizonte (`lookaheadDays`); expandir recorrentes em instâncias; tratar all-day e timezones; sincronização periódica via cron (espelho no D1 com upsert por `externalId` e delete fora do horizonte)?

Restringir a primary sources oficiais. Entregar recomendações concretas para o contrato de sync (endpoints, campos, armadilhas) que a spec possa citar.

## Answer

Cron faz refresh OAuth + `events.list` em `primary` com `singleEvents=true`, `timeMin`/`timeMax` = horizonte e `timeZone` da app; upsert por `id`→`externalId` e delete por ausência/fora do horizonte — sem `syncToken` (incompatível com filtro de tempo).

Findings: [docs/research/google-calendar-sync-model.md](../../../docs/research/google-calendar-sync-model.md)
