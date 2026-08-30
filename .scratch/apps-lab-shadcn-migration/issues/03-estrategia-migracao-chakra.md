# Estratégia de migração Chakra → shadcn

Type: grilling
Status: resolved

## Question

Qual estratégia de migração minimiza risco e diff desnecessário?

Opções:

- **Big-bang**: setup Tailwind+shadcn, reescrever os 6 arquivos Chakra, remover `@chakra-ui/react` + `@emotion/react` num único esforço.
- **Incremental**: manter ChakraProvider convivendo temporariamente; migrar rota/componente por vez; remover Chakra no final.
- **Strangler por feature**: migrar `events/` primeiro, depois `settings/`, depois shell (`__root.tsx`).

Inventário Chakra atual: `__root.tsx`, `agenda-page`, `event-card`, `lembrete-form`, `settings-page`, `theme.ts`.

## Answer

**Big-bang.** Um esforço único: init Tailwind+shadcn, reescrever os 6 arquivos, remover Chakra/Emotion e `theme.ts`. Sem convivência temporária — inventário pequeno o suficiente.
