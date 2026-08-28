# Multi-conta Google, OAuth web e calendários selecionáveis

Evolução pós-MVP: o sync deixa de depender de `GOOGLE_REFRESH_TOKEN` em secret e de um único calendário `primary`. Contas Google são vinculadas pela web (OAuth authorization code); refresh tokens ficam no D1 criptografados com `ENCRYPTION_KEY`. Cada conta pode expor vários **Calendários Google** (`calendarList`, `selected=true` na primeira ligação); o usuário liga/desliga cada um na Settings. O cron faz `events.list` por par (conta, calendário habilitado) e delete-not-in nesse escopo. Events google ganham `googleAccountId` + `googleCalendarId`; unicidade em `(googleAccountId, googleCalendarId, externalId)`. Até 5 contas por deploy. `invalid_grant` marca a conta como `needs_reconnect` sem derrubar as outras. Contrato do device (`GET /api/device/schedule`) inalterado.

**Considered:** prefixo em `externalId` (rejeitado — colunas explícitas); refresh token continua em secret com fallback (rejeitado — corte limpo); sweep global delete-not-in (rejeitado — por par conta+calendário).

**Consequences:** `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET`/`ENCRYPTION_KEY` permanecem secrets de ops; migration apaga Events `google` legados; escopos OAuth incluem `calendar.calendarlist.readonly`; reconexão periódica necessária em app OAuth Testing (~7d).
