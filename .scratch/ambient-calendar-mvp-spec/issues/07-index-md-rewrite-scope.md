# Escopo do rewrite de docs/index.md

Type: grilling
Status: resolved
Blocked by: 01, 02, 03, 04, 05, 06

## Question

Com as decisões e researches deste mapa, qual a estrutura e o corte exato do rewrite de `docs/index.md`? O que permanece, o que é reescrito, o que some (ex.: quiet hours), como a spec marca MVP vs não-MVP, e quando o mapa se considera **concluído** (critério de handoff)?

Este ticket não escreve a spec inteira sozinho se for grande demais: define o brief do rewrite e o Definition of Done do destino do mapa.

## Answer

**Este ticket:** brief + DoD. Rewrite de `docs/index.md` = sessão **pós-mapa**.

**Esqueleto-alvo** (reescrever no lugar; apagar quiet hours/contradições; linkar `docs/research/*`):

1. Objetivo  
2. Glossário → `CONTEXT.md`  
3. Arquitetura (Workers / D1 / TanStack freeze)  
4. Dados (Event / Settings)  
5. Sync Google  
6. API (device schedule + web CRUD/settings)  
7. Firmware constraints  
8. Scheduler / HMI / Touch (ASCII)  
9. Web UI  
10. Secrets / bootstrap (ops: obter `GOOGLE_REFRESH_TOKEN`, flash `DEVICE_API_TOKEN`)  
11. Estrutura monorepo (mínimo exigido pela research TanStack)  
12. Checklist MVP (alinhada a tickets 01–06)  
13. Fora do MVP  

**Fog:** multi-device + OTA → out of scope; tokens → §10 ops; CI fino além da research → fora.

**MVP vs later:** corpo = só MVP; §13 = fora.

**DoD do mapa:** Answer deste ticket gravada; fog classificado; nenhum child open. Destino do produto (spec buildável) completa-se no rewrite pós-mapa.
