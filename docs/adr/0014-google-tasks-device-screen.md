# ADR 0014: Google Tasks como modelo e tela próprios

**Tarefas Google** são espelhadas separadamente de Events, por Conta Google e Lista de tarefas Google selecionável. O sync usa somente leitura, inclui tarefas pendentes de topo (inclusive atribuídas), e a Tela de Tarefas não participa de Alerta ou Agora; prazos são apenas datas, agrupadas em Atrasadas, Hoje, Próximas e Sem prazo. Listas descobertas começam habilitadas, até 20 tarefas são enviadas, e a privacidade do Bloqueio do dispositivo cobre seus títulos.

O escopo `tasks.readonly` é concedido incrementalmente por Conta Google e uma recusa não interrompe Calendar. Para manter um único poll, cache e indicador de sync, a coleção `tasks` é adicionada ao `GET /api/device/schedule`, não ganha endpoint próprio; cron e sync manual atualizam Calendar e Tasks juntos. A Tela de Tarefas é acessível por swipe horizontal somente quando ao menos uma lista está habilitada; toque permanece somente leitura.
