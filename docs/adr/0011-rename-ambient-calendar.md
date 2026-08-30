# ADR 0011: Rename do projeto para ambient-calendar

O repositório Git já apontava para `ambient-calendar` e o Worker Cloudflare usava `ambient_calendar`, mas o pacote npm (`@app/alerts`), o banco D1 (`alerts`) e a pasta local ainda carregavam o nome legado do MVP. Alinhamos identidade externa ao vocabulário de domínio (**Ambient Calendar Display** em `CONTEXT.md`).

**Decidido:** pacote `@app/ambient-calendar`; pasta/repo `ambient-calendar`; D1 `ambient_calendar` (binding inalterado); Worker/KV permanecem `ambient_calendar`. Prefixos `alerts_*` no firmware ficam legados — distintos do termo de domínio **Alerta**. ADRs 0002/0003/0004 não foram reescritos (registro histórico).

**Considered:** renomear prefixos do firmware (`ambient_*`) — rejeitado (diff grande, risco HMI, sem ganho funcional). Manter D1 `alerts` — rejeitado (nome legado confunde operação). Editar ADRs antigos in-place — rejeitado (apaga contexto de decisão).

**Consequences:** após deploy, apagar D1 `alerts` no dashboard quando validado. Renomear pasta local (`mv alerts ambient-calendar`) e reabrir `ambient-calendar.code-workspace`. Produção estava vazia — migrations fresh no banco novo, sem export/import.
