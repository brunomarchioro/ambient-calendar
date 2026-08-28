# ADR 0008: dotenv (`firmware/.dev.vars`) no firmware host

## Status

Aceito (2026-08-28), revisado (2026-08-28)

## Contexto

Simulador HMI e flash local do ESP32-C6 precisam de URL da API e bearer token. Exportar `ALERTS_*` manualmente é frágil. O firmware **não** reutiliza `app/.dev.vars` — secrets do Worker e do device são arquivos distintos; o valor de `ALERTS_DEVICE_API_TOKEN` deve coincidir com `DEVICE_API_TOKEN` do Worker para o poll HTTP 200, mas cada pacote mantém seu próprio dotenv.

## Decisão

- **Biblioteca:** [dotenv-c](https://github.com/Isty001/dotenv-c) vendored em `firmware/common/dotenv/` (MIT).
- **Arquivo:** `firmware/.dev.vars` (gitignored), template em `firmware/.dev.vars.example`.
- **Wrapper:** `firmware/common/alerts_devvars.c` — carrega dotenv, default de URL `http://127.0.0.1:3000` se ausente.
- **Simulador** (`firmware/simulator/esp32-c6`): prioridade CLI → `firmware/.dev.vars` → env (env legado; export stale perde para o arquivo).
- **Device** (`firmware/esp32-c6`): tool `tools/devvars_to_sdkconfig` lê `firmware/.dev.vars` e gera `sdkconfig.defaults.devvars` (gitignored); `CMakeLists.txt` inclui o fragmento quando existir. Workflow: `make -C tools sync-devvars` antes de `idf.py build`.
- **Testes:** `ALERTS_SKIP_DEVVARS=1` desliga auto-load nos unit tests.

No flash, secrets continuam em Kconfig (`CONFIG_ALERTS_*`); dotenv é só no host (simulador + sync de sdkconfig).

## Alternativas consideradas

| Alternativa | Por que não |
| --- | --- |
| Reutilizar `app/.dev.vars` | Acoplamento indesejado entre pacotes |
| Parser inline sem lib | Decisão explícita de usar dotenv-c |
| Runtime dotenv no ESP32 | Sem filesystem `.dev.vars` no device |
| Só `make run` com shell | Não cobre `./alerts_hmi_sim` direto nem IDF |

## Consequências

- Dev local: `cp firmware/.dev.vars.example firmware/.dev.vars` e alinhar token com o Worker.
- Wi-Fi opcional via `ALERTS_WIFI_*` no `.dev.vars` quando `sync-devvars` for rodado.
- CI não depende de `firmware/.dev.vars` (gitignored).
