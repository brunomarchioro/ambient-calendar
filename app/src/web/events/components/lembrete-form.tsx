import { useForm } from '@tanstack/react-form'
import type { EventWrite, ManualEvent } from '@/shared/events/types'
import { normalizeWrite } from '@/shared/events/types'
import {
  defaultLembreteStart,
  parseLembreteForm,
  toDatetimeLocal,
  type LembreteFormValues,
} from '@/web/events/utils'
import { Button, Checkbox, FieldError, Input, Label, TextField } from '@heroui/react'
import { PendingButton } from '@/web/common/components/pending-button'
import { fieldErrorText } from '@/web/common/utils'

function emptyValues(timeZone: string): LembreteFormValues {
  return {
    title: '',
    allDay: false,
    start: defaultLembreteStart(new Date(), timeZone),
    end: '',
  }
}

function valuesFromEvent(event: ManualEvent): LembreteFormValues {
  return {
    title: event.title,
    allDay: event.allDay,
    start: toDatetimeLocal(event.startAt, event.allDay),
    end: event.endAt ? toDatetimeLocal(event.endAt, event.allDay) : '',
  }
}

export function LembreteForm({
  timeZone,
  event,
  pending,
  error,
  onSave,
  onCancel,
}: {
  timeZone: string
  event?: ManualEvent
  pending: boolean
  error: string | null
  onSave: (write: EventWrite) => Promise<void>
  onCancel?: () => void
}) {
  const form = useForm({
    defaultValues: event ? valuesFromEvent(event) : emptyValues(timeZone),
    onSubmit: async ({ value }) => {
      const parsed = parseLembreteForm(value, timeZone)
      if (!parsed.success) return
      const normalized = normalizeWrite(parsed.data, timeZone)
      if (!normalized.ok) return
      await onSave(parsed.data)
      if (!event) form.reset()
    },
  })

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        e.stopPropagation()
        void form.handleSubmit()
      }}
    >
      <div className="flex flex-col gap-4">
        <form.Field
          name="title"
          validators={{
            onChange: ({ value }) => (value.trim() ? undefined : 'Título é obrigatório'),
          }}
        >
          {(field) => {
            const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid
            return (
              <TextField
                name={field.name}
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={field.handleChange}
                isInvalid={isInvalid}
              >
                <Label>Título</Label>
                <Input />
                <FieldError>{fieldErrorText(field.state.meta.errors)}</FieldError>
              </TextField>
            )
          }}
        </form.Field>

        <form.Field name="allDay">
          {(field) => (
            <Checkbox
              name={field.name}
              isSelected={field.state.value}
              onChange={(allDay) => {
                field.handleChange(allDay)
                const start = form.getFieldValue('start')
                const end = form.getFieldValue('end')
                form.setFieldValue(
                  'start',
                  allDay ? start.slice(0, 10) : start.length === 10 ? `${start}T09:00` : start,
                )
                if (end) {
                  form.setFieldValue(
                    'end',
                    allDay ? end.slice(0, 10) : end.length === 10 ? `${end}T10:00` : end,
                  )
                }
              }}
            >
              <Checkbox.Content>
                <Checkbox.Control>
                  <Checkbox.Indicator />
                </Checkbox.Control>
                Dia inteiro
              </Checkbox.Content>
            </Checkbox>
          )}
        </form.Field>

        <form.Subscribe selector={(state) => state.values.allDay}>
          {(allDay) => (
            <>
              <form.Field name="start">
                {(field) => (
                  <TextField
                    type={allDay ? 'date' : 'datetime-local'}
                    name={field.name}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={field.handleChange}
                  >
                    <Label>Início</Label>
                    <Input />
                  </TextField>
                )}
              </form.Field>
              <form.Field
                name="end"
                validators={{
                  onChangeListenTo: ['start', 'allDay'],
                  onChange: ({ value, fieldApi }) => {
                    if (!value.trim()) return undefined
                    const parsed = parseLembreteForm(
                      {
                        title: 'x',
                        allDay: fieldApi.form.getFieldValue('allDay'),
                        start: fieldApi.form.getFieldValue('start'),
                        end: value,
                      },
                      timeZone,
                    )
                    if (!parsed.success) return 'Horário inválido'
                    return normalizeWrite(parsed.data, timeZone).ok
                      ? undefined
                      : 'Fim precisa ser depois do início'
                  },
                }}
              >
                {(field) => {
                  const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid
                  return (
                    <TextField
                      type={allDay ? 'date' : 'datetime-local'}
                      name={field.name}
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={field.handleChange}
                      isInvalid={isInvalid}
                    >
                      <Label>Fim (opcional)</Label>
                      <Input />
                      <FieldError>{fieldErrorText(field.state.meta.errors)}</FieldError>
                    </TextField>
                  )
                }}
              </form.Field>
            </>
          )}
        </form.Subscribe>

        {error ? (
          <p className="text-sm text-danger" role="alert">
            {error}
          </p>
        ) : null}

        <div className="flex flex-wrap gap-3">
          <PendingButton type="submit" isPending={pending}>
            {event ? 'Salvar Lembrete' : 'Criar Lembrete'}
          </PendingButton>
          {onCancel ? (
            <Button variant="outline" onPress={onCancel}>
              Cancelar
            </Button>
          ) : null}
        </div>
      </div>
    </form>
  )
}
