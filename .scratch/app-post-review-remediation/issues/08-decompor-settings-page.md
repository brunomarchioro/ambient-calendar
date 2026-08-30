# 08: Decompor página de Configurações (Settings + Google + sync)

**What to build:** Tela `/settings` mantém paridade funcional — editar Settings, conectar/desconectar contas Google, escolher calendários, disparar sync manual — mas o código deixa de concentrar tudo num único componente monolítico. Cada seção vira componente explícito, mais fácil de manter e revisar.

**Blocked by:** None (can start immediately)

**Status:** resolved

- [x] Seções Settings, Google accounts e sync manual são componentes separados (compound ou siblings claros)
- [x] Formulário Settings + TanStack Form + shadcn Field inalterados em comportamento
- [x] Smoke manual: salvar settings, OAuth flow, sync manual ainda funcionam
- [x] `npm test` passa
