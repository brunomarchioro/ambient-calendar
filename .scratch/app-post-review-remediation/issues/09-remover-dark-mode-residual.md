# 09: Remover dark mode residual pós-migração shadcn

**What to build:** UI permanece light-only conforme decisão do map shadcn migration (`Dark mode: adiar`). Classes `dark:`, variantes e tokens de dark mode gerados ou copiados por engano saem do CSS e componentes, sem regressão visual na theme default.

**Blocked by:** None (can start immediately)

**Status:** resolved

- [x] Sem `@custom-variant dark` ou equivalente ativo sem feature flag
- [x] Componentes web não usam utilitários `dark:` na migração inicial
- [x] `/events` e `/settings` renderizam igual ao estado light anterior (smoke visual)
- [x] Map shadcn ou comentário `ponytail:` registra adiamento explícito se algum token for mantido de propósito
