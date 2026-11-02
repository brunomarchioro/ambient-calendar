import { Input, Label, TextField } from '@heroui/react'

export function PinField({
  label,
  value,
  isInvalid,
  describedBy,
  onChange,
}: {
  label: string
  value: string
  isInvalid: boolean
  describedBy: string | undefined
  onChange: (value: string) => void
}) {
  return (
    <TextField
      type="password"
      value={value}
      isInvalid={isInvalid}
      aria-describedby={describedBy}
      onChange={(next) => onChange(next.replace(/[^1-4]/g, ''))}
    >
      <Label>{label}</Label>
      <Input inputMode="numeric" autoComplete="new-password" pattern="[1-4]{4}" maxLength={4} />
    </TextField>
  )
}
