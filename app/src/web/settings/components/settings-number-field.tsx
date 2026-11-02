import { FieldError, Label, NumberField } from '@heroui/react'
import { fieldErrorText } from '@/web/common/utils'

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
    <NumberField
      name={field.name}
      minValue={min}
      maxValue={max}
      step={1}
      value={field.state.value}
      onBlur={field.handleBlur}
      onChange={(value) => field.handleChange(value ?? Number.NaN)}
      isInvalid={isInvalid}
    >
      <Label>{label}</Label>
      <NumberField.Group>
        <NumberField.DecrementButton />
        <NumberField.Input />
        <NumberField.IncrementButton />
      </NumberField.Group>
      <FieldError>{fieldErrorText(field.state.meta.errors)}</FieldError>
    </NumberField>
  )
}
