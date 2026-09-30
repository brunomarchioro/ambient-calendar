import { useState, type FormEvent } from 'react'
import { DEVICE_PIN_MESSAGE, parseDevicePin, type DevicePin } from '@/shared/settings/types'
import { Button } from '@/web/common/components/ui/button'
import { Field, FieldError, FieldLabel } from '@/web/common/components/ui/field'
import { Input } from '@/web/common/components/ui/input'

export function DevicePinSection({
  configured,
  pending,
  error,
  onSave,
  onRemove,
}: {
  configured: boolean
  pending: boolean
  error: string | null
  onSave: (pin: DevicePin) => Promise<unknown>
  onRemove: () => Promise<unknown>
}) {
  const [editing, setEditing] = useState(!configured)
  const [pin, setPin] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [validation, setValidation] = useState<string | null>(null)

  async function submit(event: FormEvent) {
    event.preventDefault()
    const parsed = parseDevicePin(pin)
    const message = !parsed.success
      ? DEVICE_PIN_MESSAGE
      : pin !== confirmation
        ? 'A confirmação não corresponde ao PIN.'
        : null
    setValidation(message)
    if (message || !parsed.success) return
    await onSave(parsed.data)
    setPin('')
    setConfirmation('')
    setEditing(false)
  }

  if (configured && !editing) {
    return (
      <section aria-labelledby="device-pin-title" className="flex flex-col gap-3">
        <div>
          <h3 id="device-pin-title" className="font-medium">
            Bloqueio do dispositivo
          </h3>
          <p className="text-sm text-muted-foreground" role="status">
            PIN configurado
          </p>
        </div>
        {error ? (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={() => setEditing(true)}>
            Alterar
          </Button>
          <Button
            type="button"
            variant="destructive"
            loading={pending}
            onClick={() => {
              if (window.confirm('Remover o PIN do dispositivo?')) void onRemove()
            }}
          >
            Remover
          </Button>
        </div>
      </section>
    )
  }

  return (
    <form onSubmit={(event) => void submit(event)} aria-labelledby="device-pin-title" className="flex flex-col gap-4">
      <div>
        <h3 id="device-pin-title" className="font-medium">
          Bloqueio do dispositivo
        </h3>
        <p className="text-sm text-muted-foreground">Use os números 1, 2, 3 e 4 uma vez cada.</p>
      </div>
      <Field>
        <FieldLabel htmlFor="device-pin">PIN de 4 dígitos</FieldLabel>
        <Input
          id="device-pin"
          type="password"
          inputMode="numeric"
          autoComplete="new-password"
          pattern="[1-4]{4}"
          maxLength={4}
          value={pin}
          aria-invalid={validation !== null}
          aria-describedby="device-pin-error"
          onChange={(event) => setPin(event.target.value.replace(/[^1-4]/g, ''))}
        />
      </Field>
      <Field>
        <FieldLabel htmlFor="device-pin-confirmation">Confirmar PIN</FieldLabel>
        <Input
          id="device-pin-confirmation"
          type="password"
          inputMode="numeric"
          autoComplete="new-password"
          pattern="[1-4]{4}"
          maxLength={4}
          value={confirmation}
          aria-invalid={validation !== null}
          aria-describedby="device-pin-error"
          onChange={(event) => setConfirmation(event.target.value.replace(/[^1-4]/g, ''))}
        />
      </Field>
      <FieldError id="device-pin-error">{validation ?? error}</FieldError>
      <div className="flex gap-2">
        <Button type="submit" loading={pending}>
          {configured ? 'Salvar novo PIN' : 'Cadastrar PIN'}
        </Button>
        {configured ? (
          <Button type="button" variant="outline" onClick={() => setEditing(false)}>
            Cancelar
          </Button>
        ) : null}
      </div>
    </form>
  )
}
