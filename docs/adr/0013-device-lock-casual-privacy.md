# ADR 0013: Bloqueio do dispositivo para privacidade casual

O **Bloqueio do dispositivo** usa um **PIN do dispositivo** formado por uma permutação de `1`, `2`, `3` e `4` (24 combinações) para permitir quatro áreas de toque grandes no display de 172×320. Ele oculta Events e impede interações locais, mas não é autenticação forte: o PIN permanece em texto puro no D1, no contrato do device e no cache LittleFS; extração física da flash e força bruta estão fora do escopo.

O PIN só é cadastrado, substituído ou removido pela UI web protegida por Basic Auth. A API web expõe apenas `pinConfigured`; o valor segue exclusivamente no `GET /api/device/schedule` autenticado pelo token do device e nunca deve aparecer em logs ou erros. O device bloqueia no boot quando o cache contém PIN, ao receber um PIN diferente e por pressão de 2 segundos em qualquer área da tela; não há bloqueio por inatividade nem limite de tentativas.
