# 06: Registrar estratégia de auth web (Basic Auth vs Cloudflare Access)

**What to build:** Documentação clara de como a web admin é protegida hoje e qual o plano (se houver) para Cloudflare Access na borda. Inclui o papel do header `X-TSS_SHELL` no carregamento da SPA TanStack Start. Não implementa Access neste ticket — só registra a decisão.

**Blocked by:** None (can start immediately)

**Status:** resolved

- [x] ADR ou seção em `docs/` descreve Basic Auth no Worker como estado atual
- [x] Documento explica bypass `X-TSS_SHELL` e quando é seguro
- [x] Plano para Access (ou declaração de que Basic Auth é suficiente para MVP pessoal) está explícito
- [x] README onboarding reflete a estratégia sem contradizer ADR 0011

## Answer

ADR 0012; `docs/index.md` e `app/README.md` atualizados. Access adiado para MVP pessoal.
