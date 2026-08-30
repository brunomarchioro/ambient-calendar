import { Field, FieldError, FieldLabel } from '@/web/common/components/ui/field'
import { Input } from '@/web/common/components/ui/input'

export function SettingsNumberField({
  field,
  label,
  min,
  max,
}: {
  field: {
    name: string
    state: { value: number; meta: { isTouched: boolean; isValid: boolean; errors: unknown[] } }
    handleBlur: () => void
    handleChange: (value: number) => void
  }
  label: string
  min: number
  max: number
}) {
  const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid
  return (
    <Field data-invalid={isInvalid}>
      <FieldLabel htmlFor={field.name}>{label}</FieldLabel>
      <Input
        id={field.name}
        type="number"
        name={field.name}
        min={min}
        max={max}
        step={1}
        value={Number.isNaN(field.state.value) ? '' : field.state.value}
        onBlur={field.handleBlur}
        onChange={(e) => field.handleChange(e.target.valueAsNumber)}
        aria-invalid={isInvalid}
      />
      {isInvalid ? <FieldError errors={field.state.meta.errors as Array<string | { message?: string }>} /> : null}
    </Field>
  )
}
