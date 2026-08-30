# 01: Concluir rename ADR 0011 (pacote + docs operacionais)

**What to build:** Identidade do pacote web alinhada ao ADR 0011 e operação local/deploy documentada corretamente. Quem clona o repo vê `@app/ambient-calendar`, README com binding D1 `DB` e database `ambient_calendar` (igual ao Wrangler), e servidor MCP sem nome legado `alerts`. Diff de estilo sem valor funcional em rotas raiz não entra no merge.

**Blocked by:** None (can start immediately)

**Status:** resolved

- [x] `package.json` / lockfile commitados com nome `@app/ambient-calendar`
- [x] README descreve binding `DB` e `database_name` `ambient_calendar` (não confundir os dois)
- [x] Servidor MCP expõe nome coerente com Ambient Calendar Display (não `alerts`)
- [x] Churn de estilo em `__root.tsx` revertido ou removido do escopo deste ticket
- [x] `npm test` passa

## Answer

Rename concluído em 2026-08-30: `package.json`/`package-lock.json` → `@app/ambient-calendar`; README binding `DB` + database `ambient_calendar`; MCP `name: 'ambient-calendar'`; `__root.tsx` revertido ao HEAD.
