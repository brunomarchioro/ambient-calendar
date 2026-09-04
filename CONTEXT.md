# Ambient Calendar Display

Ambient display pessoal que mostra agenda e alertas de próximos eventos, sincronizado com Google Calendar e lembretes manuais.

## Language

**Ambient Calendar Display**:
O sistema completo: display ESP32, backend e interface web de configuração.
_Avoid_: alerts (prefixo legado no firmware), calendar-display

**Event**:
Ocorrência agendada com título e janela de tempo, independente da origem (`google` ou `manual`). Events `google` pertencem a uma **Conta Google** e a um **Calendário Google** (colunas de espelho; não expostas no device).
_Avoid_: Appointment, meeting

**Lembrete**:
Rótulo de UI para um Event com `source: manual`. Não é um tipo de domínio separado.
_Avoid_: Reminder (como tipo), ManualEvent

**Alerta**:
Estado de apresentação no display quando um Event timed está dentro da janela de antecedência (`reminderMinutes`), antes do `startAt`. Calculado no ESP32, não é uma entidade persistida. All-day não dispara Alerta.
_Avoid_: Notification, push

**Agora**:
Estado de apresentação no display na janela curta após o `startAt` de um Event timed. Calculado no ESP32, não é uma entidade persistida.
_Avoid_: Now (como entidade), Live, in-progress

**Settings**:
Preferências singleton do Ambient Calendar Display: fuso, janela de Alerta, horizonte de sync e quantos próximos Events a HMI e a agenda web listam (`showNextEvents`).
_Avoid_: Config, Preferences, AppConfig

**Conta Google**:
Conta Google conectada ao Ambient Calendar Display via OAuth (credencial offline + identidade, ex.: e-mail). Pode haver mais de uma por deploy.
_Avoid_: User, account (genérico), GoogleUser

**Calendário Google**:
Agenda dentro de uma Conta Google escolhida para espelho no D1. Identificado pelo `calendarId` da API Google; pode ser `primary`, próprio ou compartilhado.
_Avoid_: Agenda Google (colide com a página Agenda), calendar (sem qualificador)

**Overlay**:
Modo de apresentação temporário que mostra a lista de próximos Events por cima do estado atual do display (Empty, Ambient, Alerta ou Agora). Abre com toque curto fora do card de foco; em Ambient com lista visível o toque não abre overlay. Fecha com segundo toque ou após 15 s. O scheduler continua calculando o estado de fundo; o Overlay só altera o que é desenhado.
_Avoid_: Modal, popup, tela

**Encerramento antecipado**:
Ação no display (toque no card Agora) que registra localmente que um Event em Agora deixou de ocupar essa janela no instante do toque, até o `endAt` do cache. Não altera o Event no backend.
_Avoid_: Dismiss, snooze

**Foco secundário**:
Segundo Event na janela de Alerta exibido como card adicional enquanto o estado de apresentação permanece Agora.
_Avoid_: Secondary state

**Indicador de sync**:
Ícone ou idade no header que reflete frescor do cache local: `LV_SYMBOL_REFRESH` (verde, &lt; 5 min) ou `Nm` (cinza, 5–60 min). Distinto de Agora.
_Avoid_: LIVE (ambiguidade com Agora)

**Título no display**:
Representação do título do Event enviada ao ESP32 — ASCII Basic Latin, truncada ao limite do firmware. Distinta do título canônico persistido (pode ter acentos ou emoji).
_Avoid_: DeviceTitle (como entidade), sanitized title

**Cliente MCP**:
Assistente de IA externo (ex.: ChatGPT, Claude) que se conecta ao Ambient Calendar Display via Model Context Protocol para listar ou administrar Lembretes. Um deploy pessoal reconhece um único humano autorizado; vários Clientes MCP podem registrar-se, mas compartilham o mesmo conjunto de Events.
_Avoid_: MCP user, bot, agent (genérico)

**Autorização MCP**:
Fluxo OAuth que concede a um Cliente MCP permissão para invocar tools no Worker. Distinto de **Conta Google** (espelho de calendário) e de HTTP Basic Auth da UI web.
_Avoid_: MCP auth (genérico), API key
