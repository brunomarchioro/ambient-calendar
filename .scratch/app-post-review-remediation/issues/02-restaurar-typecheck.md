# 02: Restaurar npm run typecheck

**What to build:** Desenvolvedores e CI voltam a checar tipos TypeScript do pacote `app/` com um comando único, sem depender de IDE ou build completo.

**Blocked by:** None (can start immediately)

**Status:** resolved

- [x] Script `typecheck` (`tsc --noEmit`) presente em `package.json`
- [x] `npm run typecheck` termina sem erros no estado atual do branch
- [x] README ou tabela de scripts menciona `typecheck` se outros scripts estiverem documentados

## Answer

`tsconfig.json` inclui `worker-configuration.d.ts` + `env.d.ts` (alias `SYNC_FIXTURE`); fixes pontuais em `event-queries.ts` e `worker.ts`. README documenta `npm run typecheck`.
