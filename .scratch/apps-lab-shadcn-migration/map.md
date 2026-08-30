# Migrar apps/lab para shadcn — map

Labels: `wayfinder:map`

## Destination

Pacote **`app/`** (in-place) com UI **100% shadcn/ui** (Tailwind v4 + Radix), **sem Chakra**, skills/cursor rules alinhados, e plano de migração buildável pronto para handoff de implementação.

## Notes

- Domínio: `CONTEXT.md` (domain-modeling). Skills: `grilling`, `domain-modeling`, `research`, `vanguarda-fullstack`, `building-components`.
- Estado atual: Chakra UI v3 em 6 arquivos TSX + `theme.ts`. Sem Tailwind/shadcn ainda.
- Estratégia: **big-bang** (um PR). Tema: **preset shadcn default**. Dark mode: adiar.
- Setup técnico: [`docs/research/shadcn-tanstack-start-workers.md`](../docs/research/shadcn-tanstack-start-workers.md). Forms: [`docs/research/shadcn-tanstack-form.md`](../docs/research/shadcn-tanstack-form.md).
- Wayfinder é planning: este mapa produz decisões/spec, não o código migrado.
- Mapa **planning done** — todos os tickets fechados; próxima ação = implementação big-bang (checklist ticket 06).
- Tracker: `.scratch/apps-lab-shadcn-migration/`.

## Decisions so far

- [shadcn/ui + TanStack Start + Cloudflare Workers — setup viável?](.scratch/apps-lab-shadcn-migration/issues/02-shadcn-tanstack-start-setup.md): Viável — Tailwind v4 + `@tailwindcss/vite`, `shadcn init`, plugin order `cloudflare → tanstackStart → tailwindcss → react`, primitivos em `src/web/common/components/ui/`. Detalhe: [`docs/research/shadcn-tanstack-start-workers.md`](../docs/research/shadcn-tanstack-start-workers.md).
- [Escopo do pacote: apps/lab vs app/](.scratch/apps-lab-shadcn-migration/issues/01-escopo-pacote-apps-lab.md): Migrar `app/` in-place; sem rename para `apps/lab`.
- [Estratégia de migração Chakra → shadcn](.scratch/apps-lab-shadcn-migration/issues/03-estrategia-migracao-chakra.md): Big-bang — reescrever 6 arquivos + remover Chakra/Emotion num PR.
- [Tema e design tokens com shadcn](.scratch/apps-lab-shadcn-migration/issues/04-tema-e-design-tokens.md): Preset default; não portar tokens Chakra; dark mode adiado.
- [Forms: TanStack Form + shadcn Field](.scratch/apps-lab-shadcn-migration/issues/05-forms-tanstack-react-form.md): Manter `useForm` + `form.Field`; usar shadcn `Field`/`FieldLabel`/`FieldError` (não stack RHF `FormField`); wiring por tipo (`onValueChange` Select, `onCheckedChange` Checkbox); `NativeSelect` para timezone. Detalhe: [`docs/research/shadcn-tanstack-form.md`](../docs/research/shadcn-tanstack-form.md).
- [Atualizar vanguarda-fullstack e cursor rules](.scratch/apps-lab-shadcn-migration/issues/06-atualizar-vanguarda-fullstack-skill.md): Checklist de arquivos skill/rule + ordem de implementação no mesmo PR.

## Not yet specified

_(vazio — fog classificado)_

## Out of scope

- Rename `app/` → `apps/lab` (monorepo futuro).
- Firmware / HMI / LVGL.
- Redesign de UX além de paridade funcional.
- Dark mode na migração inicial.
- Novas features de produto.
- Testes visuais automatizados / screenshot regression — smoke manual (`pnpm test` + `/events` + `/settings`) cobre o MVP (ticket 06).
