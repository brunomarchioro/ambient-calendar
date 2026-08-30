# Tema e design tokens com shadcn

Type: grilling
Status: resolved

## Question

Como mapear o tema Chakra mínimo atual (`theme.ts`: fonts system-ui, radii 0.5/0.75/1rem) para o sistema shadcn (CSS variables em `globals.css`, `tailwind.config`, optional `components.json` theme)?

Opções:

- Preset shadcn **default** (neutral/slate) — zero customização inicial.
- Portar tokens Chakra para CSS variables shadcn.
- Adotar preset específico (ex.: `new-york`, `zinc`) e ajustar depois.

Dark mode: incluir agora (`class` strategy) ou adiar?

## Answer

**Preset shadcn default** (style/style variant do `shadcn init` interativo — neutral/slate). Não portar tokens Chakra na migração inicial; paridade funcional > paridade visual. **Dark mode: adiar** (YAGNI); estratégia `.dark` fica documentada na research para quando precisar.
