# Atualizar vanguarda-fullstack e cursor rules para shadcn

Type: task
Status: resolved

## Question

Quais arquivos de skill/rule atualizar quando a migração for decidida, e com qual wording?

Candidatos:

- `.agents/skills/vanguarda-fullstack/SKILL.md` (Stack table: Chakra → shadcn)
- `.agents/skills/vanguarda-fullstack/patterns.md` (imports Chakra nos exemplos)
- `.cursor/rules/vanguarda-fullstack.mdc` (`chakra-ui-builder` → `building-components`?)
- `skills-lock.json` (se aplicável)

Checklist de handoff para quem implementar a migração.

## Answer

Atualizar **no mesmo PR** da migração big-bang (não antes — evita drift):

| Arquivo | Mudança |
|---------|---------|
| `.agents/skills/vanguarda-fullstack/SKILL.md` | Stack table: `Chakra UI v3` → `shadcn/ui + Tailwind v4`; complementares: `chakra-ui-builder` → `building-components` |
| `.agents/skills/vanguarda-fullstack/patterns.md` | Exemplos: imports `@chakra-ui/react` → shadcn primitives em `@/web/common/components/ui/` |
| `.cursor/rules/vanguarda-fullstack.mdc` | UI → `building-components` (remover `chakra-ui-builder`) |
| `skills-lock.json` | Não alterar (chakra skill pode permanecer instalada; só deixa de ser referenciada) |

**Checklist implementação** (ordem sugerida):

1. Tailwind v4 + `@tailwindcss/vite` + global CSS (`@import "tailwindcss"`)
2. `pnpm dlx shadcn@latest init` em `app/` — preset default, `"rsc": false`
3. Plugin order em `vite.config.ts`: `cloudflare → tanstackStart → tailwindcss → react`
4. `shadcn add` componentes necessários (button, card, input, label, select, checkbox, badge, form, …)
5. Reescrever: `__root.tsx`, `agenda-page`, `event-card`, `lembrete-form`, `settings-page`
6. Remover `theme.ts`, `ChakraProvider`, deps `@chakra-ui/react` + `@emotion/react`
7. Atualizar skills/rules (tabela acima)
8. `pnpm test` + smoke manual (`/events`, `/settings`)
