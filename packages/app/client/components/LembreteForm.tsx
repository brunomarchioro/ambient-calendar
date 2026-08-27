import { Button, Field, Input, Stack, Text } from '@chakra-ui/react'
import { useForm } from '@tanstack/react-form'
import type { EventWrite, ManualEvent } from '@app/domain/event'
import { normalizeWrite } from '@app/domain/event'
import {
  defaultLembreteStart,
  parseLembreteForm,
  toDatetimeLocal,
  type LembreteFormValues,
} from '@app/client/web'

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

function fieldError(errors: unknown[]): string | undefined {
  const first = errors[0]
  if (typeof first === 'string') return first
  if (first && typeof first === 'object' && 'message' in first && typeof first.message === 'string') {
    return first.message
  }
  return undefined
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
      <Stack gap="4">
        <form.Field
          name="title"
          validators={{
            onChange: ({ value }) => (value.trim() ? undefined : 'Título é obrigatório'),
          }}
        >
          {(field) => (
            <Field.Root invalid={field.state.meta.errors.length > 0} required>
              <Field.Label>Título</Field.Label>
              <Input
                name={field.name}
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
              />
              <Field.ErrorText>{fieldError(field.state.meta.errors)}</Field.ErrorText>
            </Field.Root>
          )}
        </form.Field>

        <form.Field name="allDay">
          {(field) => (
            <label>
              <input
                type="checkbox"
                name={field.name}
                checked={field.state.value}
                onChange={(e) => {
                  const allDay = e.target.checked
                  field.handleChange(allDay)
                  const start = form.getFieldValue('start')
                  const end = form.getFieldValue('end')
                  form.setFieldValue('start', allDay ? start.slice(0, 10) : start.length === 10 ? `${start}T09:00` : start)
                  if (end) {
                    form.setFieldValue('end', allDay ? end.slice(0, 10) : end.length === 10 ? `${end}T10:00` : end)
                  }
                }}
              />{' '}
              Dia inteiro
            </label>
          )}
        </form.Field>

        <form.Subscribe selector={(state) => state.values.allDay}>
          {(allDay) => (
            <>
              <form.Field name="start">
                {(field) => (
                  <Field.Root required>
                    <Field.Label>Início</Field.Label>
                    <Input
                      type={allDay ? 'date' : 'datetime-local'}
                      name={field.name}
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                    />
                  </Field.Root>
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
                {(field) => (
                  <Field.Root invalid={field.state.meta.errors.length > 0}>
                    <Field.Label>Fim (opcional)</Field.Label>
                    <Input
                      type={allDay ? 'date' : 'datetime-local'}
                      name={field.name}
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                    />
                    <Field.ErrorText>{fieldError(field.state.meta.errors)}</Field.ErrorText>
                  </Field.Root>
                )}
              </form.Field>
            </>
          )}
        </form.Subscribe>

        {error ? (
          <Text color="fg.error" role="alert">
            {error}
          </Text>
        ) : null}

        <Stack direction="row" gap="3" flexWrap="wrap">
          <Button type="submit" loading={pending}>
            {event ? 'Salvar Lembrete' : 'Criar Lembrete'}
          </Button>
          {onCancel ? (
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancelar
            </Button>
          ) : null}
        </Stack>
      </Stack>
    </form>
  )
}
