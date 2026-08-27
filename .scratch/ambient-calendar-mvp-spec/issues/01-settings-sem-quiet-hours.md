# Settings finais sem quiet hours

Type: grilling
Status: resolved
Blocked by:

## Question

Com quiet hours removido, quais campos de **Settings** entram na spec do MVP, com defaults e semântica precisa?

O rascunho tinha: `timezone`, `reminderMinutes`, `lookaheadDays`, `showNextEvents`, `quietHoursStart`, `quietHoursEnd`. Os dois últimos saem. Confirmar os restantes (e se algum outro entra ou sai), defaults, validação, e o que cada um controla no backend vs no device schedule vs só na web.

## Answer

Singleton de Settings com exatamente quatro campos (quiet hours fora; nada novo no MVP):

| Campo | Default | Validação | Quem usa |
| --- | --- | --- | --- |
| `timezone` | `America/Sao_Paulo` | IANA válido | sync Google (`timeZone`), payload device, web |
| `reminderMinutes` | `30` | inteiro `1..180` | Alerta no ESP32; payload device + web; **não** no cron/Google |
| `lookaheadDays` | `7` | inteiro `1..30` | só backend (horizonte sync + filtro do schedule); **não** no payload device; web |
| `showNextEvents` | `2` | inteiro `1..5` | tamanho da lista “próximos” na HMI; payload device + web; backend **não** corta o array de Events do schedule por esse N |

API: `GET`/`PUT /api/settings` com esses quatro campos; seed com defaults se a linha não existir.
