# Forms: TanStack Form + shadcn Field

Type: research
Status: resolved

## Question

Qual padrão recomendado para integrar **`@tanstack/react-form`** com componentes shadcn (`Form`, `FormField`, `Input`, `Select`, `Checkbox`) substituindo Chakra `Field.Root` / `Field.Label` / `Field.ErrorText` usados em `settings-page.tsx` e `lembrete-form.tsx`?

Deliverable: seção em `docs/research/shadcn-tanstack-start-workers.md` ou doc dedicado.

## Answer

**Padrão oficial (shadcn + TanStack Form docs):** manter `useForm` + `form.Field` render props; **não** usar o stack legado React Hook Form (`Form` / `FormField` / `FormItem`). Substituir Chakra `Field.*` por shadcn **`Field` / `FieldLabel` / `FieldError` / `FieldGroup`**.

Por campo:

1. `const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid`
2. `<Field data-invalid={isInvalid}>` + `<FieldLabel htmlFor={…}>`
3. Control com handlers explícitos: `Input` → `onChange`; `Select` → `onValueChange={field.handleChange}`; `Checkbox` → `onCheckedChange={(c) => field.handleChange(c === true)}`
4. `{isInvalid && <FieldError errors={field.state.meta.errors} />}` + `aria-invalid` no controle

**Componentes:** `pnpm dlx shadcn@latest add field input select native-select checkbox button card label` em `src/web/common/components/ui/`.

**Decisões por form:** `settings-page` — `NativeSelect` para timezone (lista longa); manter helper `NumberInput` fino; Google checkboxes ficam fora do form (mutations). `lembrete-form` — `Checkbox` horizontal para `allDay`; manter `form.Subscribe` / `onChangeListenTo` intactos.

Detalhe completo: [`docs/research/shadcn-tanstack-form.md`](../../../docs/research/shadcn-tanstack-form.md).
