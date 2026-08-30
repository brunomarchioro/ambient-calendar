# shadcn/ui + TanStack Start + Cloudflare Workers — setup viável?

Type: research
Status: resolved

## Question

Como inicializar e operar **shadcn/ui** (Tailwind v4/v3, Radix, `components.json`) num app **TanStack Start** com **Vite** e deploy **Cloudflare Workers** (`@cloudflare/vite-plugin`), SPA mode (`ssr: false` no root route)?

Subquestões:

- Passos oficiais/recomendados de `npx shadcn@latest init` com Vite (não Next.js).
- Tailwind: versão compatível, `content` paths, PostCSS, conflitos com TanStack Start plugin order.
- SSR/hydration: riscos com `ssr: false` (SPA) — shadcn funciona sem SSR?
- Bundle size / tree-shaking no Worker.
- Onde colocar `components/ui/` na árvore vanguarda (`src/web/common/components/` vs outro).

Deliverable: `docs/research/shadcn-tanstack-start-workers.md`

## Answer

**Viável.** Setup oficial: Tailwind v4 (`@tailwindcss/vite`) + `pnpm dlx shadcn@latest init` num app Start existente (ou `init -t start` greenfield); manter `cloudflare()` antes de `tanstackStart()` e acrescentar `tailwindcss()` no `vite.config.ts`. shadcn funciona bem com SPA/`ssr: false` (componentes client-only; `"rsc": false`). UI vai para assets estáticos no deploy Workers — impacto principal é bundle **client**, não o script do Worker. Colocar primitivos em `src/web/common/components/ui/` com aliases no `components.json`.

Detalhes, checklist e citações: [`docs/research/shadcn-tanstack-start-workers.md`](../../../docs/research/shadcn-tanstack-start-workers.md).
