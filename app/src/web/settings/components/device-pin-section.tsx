import { useState, type FormEvent } from 'react'
import { DEVICE_PIN_MESSAGE, parseDevicePin, type DevicePin } from '@/shared/settings/types'
import { Button } from '@heroui/react'
import { PendingButton } from '@/web/common/components/pending-button'
import { PinField } from '@/web/settings/components/pin-field'

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

  const message = validation ?? error
  const errorId = message ? 'device-pin-error' : undefined

  if (configured && !editing) {
    return (
      <section aria-labelledby="device-pin-title" className="flex flex-col gap-3">
        <div>
          <h3 id="device-pin-title" className="font-medium">
            Bloqueio do dispositivo
          </h3>
          <p className="text-sm text-muted" role="status">
            PIN configurado
          </p>
        </div>
        {error ? (
          <p className="text-sm text-danger" role="alert">
            {error}
          </p>
        ) : null}
        <div className="flex gap-2">
          <Button variant="outline" onPress={() => setEditing(true)}>
            Alterar
          </Button>
          <PendingButton
            variant="danger"
            isPending={pending}
            onPress={() => {
              if (window.confirm('Remover o PIN do dispositivo?')) void onRemove()
            }}
          >
            Remover
          </PendingButton>
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
        <p className="text-sm text-muted">Use os números 1, 2, 3 e 4 uma vez cada.</p>
      </div>
      <PinField
        label="PIN de 4 dígitos"
        value={pin}
        isInvalid={validation !== null}
        describedBy={errorId}
        onChange={setPin}
      />
      <PinField
        label="Confirmar PIN"
        value={confirmation}
        isInvalid={validation !== null}
        describedBy={errorId}
        onChange={setConfirmation}
      />
      {message ? (
        <p id="device-pin-error" className="text-sm text-danger" role="alert">
          {message}
        </p>
      ) : null}
      <div className="flex gap-2">
        <PendingButton type="submit" isPending={pending}>
          {configured ? 'Salvar novo PIN' : 'Cadastrar PIN'}
        </PendingButton>
        {configured ? (
          <Button variant="outline" onPress={() => setEditing(false)}>
            Cancelar
          </Button>
        ) : null}
      </div>
    </form>
  )
}
