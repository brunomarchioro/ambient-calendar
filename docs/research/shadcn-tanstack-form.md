# TanStack Form + shadcn/ui — integration pattern

Research for wayfinder ticket `05-forms-tanstack-react-form`.  
**Question:** Best pattern to integrate `@tanstack/react-form` with shadcn/ui (`Field`, `Input`, `Select`, `Checkbox`) replacing Chakra `Field.Root` / `Field.Label` / `Field.ErrorText` in `settings-page.tsx` and `lembrete-form.tsx`.

**Date:** 2026-08-30  
**Sources:** [shadcn/ui — TanStack Form](https://ui.shadcn.com/docs/forms/tanstack-form), [TanStack Form — UI Libraries (React)](https://tanstack.com/form/latest/docs/framework/react/guides/ui-libraries) (primary only).

---

## Verdict (one line)

**Use the official shadcn TanStack Form path:** keep `useForm` + `form.Field` render props; wrap each control in shadcn **`Field` / `FieldLabel` / `FieldError`** (not the legacy React Hook Form `Form` / `FormField` / `FormItem` stack); wire primitives with explicit handlers (`onChange`, `onValueChange`, `onCheckedChange`); derive `isInvalid` from `field.state.meta`.

---

## 1. Do not use the legacy Form/FormField stack

shadcn’s current forms docs split by library:

| Library | shadcn wrapper | Status |
| --- | --- | --- |
| **TanStack Form** | `Field`, `FieldLabel`, `FieldError`, `FieldGroup`, … | **Current official path** |
| React Hook Form | `Controller` + same `Field` components, or older `Form`/`FormField`/`FormItem` | Separate guide |

For this migration **`@tanstack/react-form` stays** — only the Chakra field chrome is replaced. No React Hook Form, no `FormProvider`, no `FormField`/`FormControl`/`FormMessage` from the RHF recipe.

Third-party wrappers (e.g. [felipestanzani/shadcn-tanstack-form](https://github.com/felipestanzani/shadcn-tanstack-form)) add `useAppForm` / `AppField` abstractions. Official docs integrate directly; **skip the extra dependency** unless repeated boilerplate justifies a local helper.

**Citation:** [TanStack Form — UI Libraries](https://tanstack.com/form/latest/docs/framework/react/guides/ui-libraries) points to shadcn’s dedicated guide; [shadcn — TanStack Form](https://ui.shadcn.com/docs/forms/tanstack-form) uses `Field` components throughout.

---

## 2. Canonical field pattern

Every field follows the same skeleton (Input, Select, Checkbox, number `Input`, `datetime-local`, etc.):

```tsx
<form.Field
  name="title"
  validators={{ onChange: ({ value }) => (value.trim() ? undefined : 'Título é obrigatório') }}
>
  {(field) => {
    const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid
    return (
      <Field data-invalid={isInvalid}>
        <FieldLabel htmlFor={field.name}>Título</FieldLabel>
        <Input
          id={field.name}
          name={field.name}
          value={field.state.value}
          onBlur={field.handleBlur}
          onChange={(e) => field.handleChange(e.target.value)}
          aria-invalid={isInvalid}
        />
        {isInvalid && <FieldError errors={field.state.meta.errors} />}
      </Field>
    )
  }}
</form.Field>
```

### Chakra → shadcn mapping

| Chakra (current) | shadcn replacement |
| --- | --- |
| `Field.Root invalid={…} required` | `<Field data-invalid={isInvalid}>` |
| `Field.Label` | `<FieldLabel htmlFor={…}>` |
| `Field.ErrorText` | `{isInvalid && <FieldError errors={field.state.meta.errors} />}` |
| `Stack gap="4"` | `<FieldGroup className="gap-4">` or Tailwind `space-y-4` |
| Manual `fieldError()` string helper | Prefer `<FieldError errors={…} />` (handles string + Zod errors) |

### Invalid state (official)

```tsx
const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid
```

Apply:

- `data-invalid={isInvalid}` on `<Field>`
- `aria-invalid={isInvalid}` on the control (`Input`, `SelectTrigger`, `Checkbox`, …)
- Show `<FieldError>` only when `isInvalid`

**Citation:** [shadcn — Displaying Errors](https://ui.shadcn.com/docs/forms/tanstack-form#displaying-errors).

---

## 3. Control-specific wiring

TanStack Form exposes `field.state.value`, `field.handleChange`, `field.handleBlur` in the render prop. Map to each shadcn primitive:

| Control | Value | Change handler | Notes |
| --- | --- | --- | --- |
| **Input** (text, number, date, datetime-local) | `value={field.state.value}` | `onChange={(e) => field.handleChange(…)}` | Number: `e.target.valueAsNumber`; empty number: guard `Number.isNaN` → `''` display |
| **Select** (Radix) | `value={field.state.value}` | `onValueChange={field.handleChange}` | Put `aria-invalid` on `SelectTrigger` |
| **NativeSelect** | `value={field.state.value}` | `onChange={(e) => field.handleChange(e.target.value)}` | Good for long static lists (timezones) |
| **Checkbox** (boolean) | `checked={field.state.value}` | `onCheckedChange={(c) => field.handleChange(c === true)}` | Horizontal layout: `Field orientation="horizontal"` |
| **Switch** (boolean) | `checked={field.state.value}` | `onCheckedChange={field.handleChange}` | Alternative to checkbox for toggles |

**Citation:** [TanStack Form — shadcn/ui](https://tanstack.com/form/latest/docs/framework/react/guides/ui-libraries#usage-with-shadcnui); [shadcn — Input / Select / Checkbox](https://ui.shadcn.com/docs/forms/tanstack-form#working-with-different-field-types).

### Select example (timezone in `settings-page.tsx`)

```tsx
<form.Field name="timezone">
  {(field) => {
    const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid
    return (
      <Field data-invalid={isInvalid}>
        <FieldLabel htmlFor="settings-timezone">Fuso horário</FieldLabel>
        <NativeSelect
          id="settings-timezone"
          name={field.name}
          value={field.state.value}
          onBlur={field.handleBlur}
          onChange={(e) => field.handleChange(e.target.value)}
          aria-invalid={isInvalid}
        >
          {zones.map((zone) => (
            <NativeSelectOption key={zone} value={zone}>{zone}</NativeSelectOption>
          ))}
        </NativeSelect>
        {isInvalid && <FieldError errors={field.state.meta.errors} />}
      </Field>
    )
  }}
</form.Field>
```

Use Radix `Select` when search/keyboard UX matters; `NativeSelect` is enough for timezone enum (lazy default for parity with current Chakra `NativeSelect`).

### Checkbox example (`allDay` in `lembrete-form.tsx`)

```tsx
<form.Field name="allDay">
  {(field) => (
    <Field orientation="horizontal">
      <Checkbox
        id="lembrete-allDay"
        name={field.name}
        checked={field.state.value}
        onCheckedChange={(checked) => {
          const allDay = checked === true
          field.handleChange(allDay)
          // keep existing cross-field start/end normalization
        }}
      />
      <FieldLabel htmlFor="lembrete-allDay" className="font-normal">
        Dia inteiro
      </FieldLabel>
    </Field>
  )}
</form.Field>
```

Keep `form.Subscribe`, `onChangeListenTo`, and cross-field `setFieldValue` logic — TanStack Form API unchanged.

---

## 4. Form shell and validation

### Submit handler (unchanged)

```tsx
<form
  onSubmit={(e) => {
    e.preventDefault()
    e.stopPropagation()
    void form.handleSubmit()
  }}
>
```

### Validation modes (already used in repo)

| Location | Current pattern | Keep |
| --- | --- | --- |
| `settings-page.tsx` | `validators: { onSubmit: settingsSchema }` (Zod) | Yes — matches shadcn Zod examples |
| `lembrete-form.tsx` | Per-field `onChange` + `onChangeListenTo` | Yes — shadcn docs show `onChange` / `onBlur` / `onSubmit` per field or form |

Form-level errors (`form.state.errors`, mutation `error` prop): render once below `FieldGroup` as `<FieldError>` or a shared alert — not inside each field.

### Submit button state

Optional improvement from shadcn examples:

```tsx
<form.Subscribe selector={(s) => [s.canSubmit, s.isSubmitting]}>
  {([canSubmit, isSubmitting]) => (
    <Button type="submit" disabled={!canSubmit || pending}>
      {isSubmitting || pending ? 'Salvando…' : 'Salvar'}
    </Button>
  )}
</form.Subscribe>
```

---

## 5. shadcn components to install

```bash
pnpm dlx shadcn@latest add field input select native-select checkbox button card label
```

Target paths (vanguarda): `@/web/common/components/ui/*` per [setup research](./shadcn-tanstack-start-workers.md#5-folder-layout-vanguarda-fullstack).

**Not needed for TanStack Form:** legacy `form.tsx` with `FormField`/`FormItem` from the React Hook Form recipe.

---

## 6. Migration notes for the two forms

### `settings-page.tsx`

| Area | Action |
| --- | --- |
| `SettingsForm` fields | Replace Chakra `Field.*` + `NativeSelect` with shadcn `Field` + `NativeSelect` pattern |
| `NumberInput` helper | Keep as thin wrapper; swap Chakra `Field`/`Input` for shadcn equivalents + `FieldError` |
| `GoogleAccountsSection` | **Outside TanStack Form** — standalone `Checkbox` + mutations; no `form.Field` |
| Layout | `Stack` → `FieldGroup` / Tailwind; `Card.Root` → shadcn `Card` |

### `lembrete-form.tsx`

| Area | Action |
| --- | --- |
| `title`, `start`, `end` | Standard `Field` + `Input` pattern |
| `allDay` | `Checkbox` horizontal field (replace raw `<label><input type="checkbox">`) |
| Conditional date types | Keep `form.Subscribe` on `allDay`; only swap field chrome |
| `fieldError()` helper | Can delete if all fields use `<FieldError errors={…} />` |

---

## 7. Optional local DRY (ponytail)

If `NumberInput` and repeated `isInvalid` boilerplate grow, one **local** helper is enough — not a npm wrapper:

```tsx
function FormTextField({ field, label, ...inputProps }: { field: AnyFieldApi; label: string } & ComponentProps<'input'>) {
  const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid
  return (
    <Field data-invalid={isInvalid}>
      <FieldLabel htmlFor={field.name}>{label}</FieldLabel>
      <Input id={field.name} name={field.name} value={field.state.value} onBlur={field.handleBlur}
        onChange={(e) => field.handleChange(e.target.value)} aria-invalid={isInvalid} {...inputProps} />
      {isInvalid && <FieldError errors={field.state.meta.errors} />}
    </Field>
  )
}
```

Use only where it shrinks real duplication; inline `form.Field` blocks are fine for one-off fields.

---

## Sources (primary)

| Topic | URL |
| --- | --- |
| shadcn TanStack Form (main guide) | https://ui.shadcn.com/docs/forms/tanstack-form |
| shadcn React Hook Form (contrast — not our stack) | https://ui.shadcn.com/docs/forms/react-hook-form |
| TanStack Form UI Libraries (React) | https://tanstack.com/form/latest/docs/framework/react/guides/ui-libraries |
| shadcn Field component | https://ui.shadcn.com/docs/components/field |
| shadcn NativeSelect | https://ui.shadcn.com/docs/components/native-select |
