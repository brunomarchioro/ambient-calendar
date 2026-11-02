# ADR 0015: HeroUI v3 como biblioteca de UI do app web

O pacote `app/` usa **HeroUI v3** (`@heroui/react` + `@heroui/styles`, Tailwind v4) no lugar de shadcn/ui, substituindo a decisão do mapa `.scratch/apps-lab-shadcn-migration/`. Os primitivos shadcn copiados em `web/common/components/ui/`, `components.json`, `cn` e as dependências Radix/cva/clsx/tailwind-merge foram removidos.

Componentes HeroUI são importados direto de `@heroui/react`, sem wrappers 1:1. Componentes em `web/common/components/` que **adicionam comportamento** (ex.: `PendingButton`, spinner durante `isPending`) são permitidos quando usados por 2+ features. Composição só de markup (ex.: rótulo de `Checkbox`) fica local ao arquivo que a usa. Forms continuam com TanStack Form; erros são formatados por `fieldErrorText` em `web/common/utils.ts`.
