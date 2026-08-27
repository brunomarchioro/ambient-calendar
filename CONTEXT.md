# Ambient Calendar Display

Ambient display pessoal que mostra agenda e alertas de próximos eventos, sincronizado com Google Calendar e lembretes manuais.

## Language

**Ambient Calendar Display**:
O sistema completo: display ESP32, backend e interface web de configuração.
_Avoid_: Alerts (nome do repo apenas), calendar-display

**Event**:
Ocorrência agendada com título e janela de tempo, independente da origem (`google` ou `manual`).
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
Preferências singleton do Ambient Calendar Display: fuso, janela de Alerta, horizonte de sync e quantos próximos Events a HMI lista.
_Avoid_: Config, Preferences, AppConfig
