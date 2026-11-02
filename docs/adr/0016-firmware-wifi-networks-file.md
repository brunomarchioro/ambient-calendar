# ADR 0016: Múltiplas Redes Wi-Fi via arquivo JSON no firmware

## Status

Aceito (2026-10-24). Supera a parte de Wi-Fi do [ADR 0008](0008-firmware-dotenv-devvars.md).

## Contexto

O display conhecia uma única Rede Wi-Fi (`ALERTS_WIFI_SSID` / `ALERTS_WIFI_PASSWORD` no `firmware/.dev.vars` → Kconfig). Levar o device para outro lugar exigia rebuild e flash. Se a rede não conectava, `ESP_ERROR_CHECK` abortava o boot e o device reiniciava em loop, mesmo com cache local válido.

## Decisão

- **Arquivo:** `firmware/wifi-networks.json` (gitignored), template `firmware/wifi-networks.example.json`. Array `[{"ssid": "...", "password": "..."}]`; a ordem do array é a prioridade.
- **Limite:** até 3 Redes Wi-Fi.
- **Build:** o próprio build do IDF (CMake `string(JSON)`, `network/wifi_networks.cmake`) lê o JSON e gera um header C em `build/` com as redes. Falha o build se o arquivo estiver ausente, vazio, inválido, com mais de 3 redes, SSID fora de 1–32 bytes ou senha que não seja WPA2 válida (8–63 caracteres ou 64 hex; ssid e senha como string). Sem parser C no host e sem passo manual a esquecer.
- **Sem compatibilidade:** `ALERTS_WIFI_SSID` / `ALERTS_WIFI_PASSWORD` e os `CONFIG_ALERTS_WIFI_*` são removidos.
- **Seleção:** scan, filtra as redes configuradas visíveis, tenta na ordem de prioridade. Segurança mínima WPA2 para todas. Redes ocultas não são suportadas.
- **Falha total no boot:** o device segue offline com o cache local, sem abortar.
- **Perda de conexão em runtime:** recomeça o ciclo de scan + prioridade.

## Alternativas consideradas

| Alternativa | Por que não |
| --- | --- |
| Envs numeradas no `.dev.vars` (`ALERTS_WIFI_1_SSID`…) | Mistura secrets de rede com token da API; JSON expressa lista e prioridade direto |
| Lista serializada numa env (`ssid:pass,…`) | Senhas podem conter `:` e `,` |
| Gravar redes em partição do device (LittleFS/NVS) | Trocar rede sem rebuild, mas exige formato na flash, ferramenta de gravação e parse JSON no ESP32 |
| Escolher por melhor RSSI | Imprevisível quando casa e hotspot estão visíveis ao mesmo tempo |
| Manter alias das envs antigas | Refatoração deliberada; um caminho só |

## Consequências

- Trocar ou adicionar rede ainda exige rebuild e flash.
- Devs com `.dev.vars` antigo precisam criar `firmware/wifi-networks.json`.
- `alerts_wifi_start` não aborta mais o boot: espera até 30 s por IP (para o primeiro poll) e segue sem rede; a conexão continua gerida em background (3 tentativas por rede, reescaneia a cada 30 s).
- O scan considera só os 20 APs de sinal mais forte (`WIFI_SCAN_MAX_AP`); em área densa, uma rede configurada fraca pode ficar de fora até o próximo scan.
- Rede oculta ou aberta exige nova decisão (campo `hidden`, auth configurável).
