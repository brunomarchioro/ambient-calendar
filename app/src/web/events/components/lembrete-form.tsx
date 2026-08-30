import { useForm } from '@tanstack/react-form'
import type { EventWrite, ManualEvent } from '@/shared/events/types'
import { normalizeWrite } from '@/shared/events/types'
import {
  defaultLembreteStart,
  parseLembreteForm,
  toDatetimeLocal,
  type LembreteFormValues,
} from '@/web/events/utils'
import { Button } from '@/web/common/components/ui/button'
import { Checkbox } from '@/web/common/components/ui/checkbox'
import { Field, FieldError, FieldGroup, FieldLabel } from '@/web/common/components/ui/field'
import { Input } from '@/web/common/components/ui/input'
import { Label } from '@/web/common/components/ui/label'

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
      <FieldGroup>
        <form.Field
          name="title"
          validators={{
            onChange: ({ value }) => (value.trim() ? undefined : 'Título é obrigatório'),
          }}
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
                {isInvalid ? <FieldError errors={field.state.meta.errors} /> : null}
              </Field>
            )
          }}
        </form.Field>

        <form.Field name="allDay">
          {(field) => (
            <Field className="flex-row items-center gap-2">
              <Checkbox
                id={field.name}
                name={field.name}
                checked={field.state.value}
                onCheckedChange={(checked) => {
                  const allDay = checked === true
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
              />
              <Label htmlFor={field.name} className="font-normal">
                Dia inteiro
              </Label>
            </Field>
          )}
        </form.Field>

        <form.Subscribe selector={(state) => state.values.allDay}>
          {(allDay) => (
            <>
              <form.Field name="start">
                {(field) => (
                  <Field>
                    <FieldLabel htmlFor={field.name}>Início</FieldLabel>
                    <Input
                      id={field.name}
                      type={allDay ? 'date' : 'datetime-local'}
                      name={field.name}
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                    />
                  </Field>
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
                    <Field data-invalid={isInvalid}>
                      <FieldLabel htmlFor={field.name}>Fim (opcional)</FieldLabel>
                      <Input
                        id={field.name}
                        type={allDay ? 'date' : 'datetime-local'}
                        name={field.name}
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(e) => field.handleChange(e.target.value)}
                        aria-invalid={isInvalid}
                      />
                      {isInvalid ? <FieldError errors={field.state.meta.errors} /> : null}
                    </Field>
                  )
                }}
              </form.Field>
            </>
          )}
        </form.Subscribe>

        {error ? (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}

        <div className="flex flex-wrap gap-3">
          <Button type="submit" loading={pending}>
            {event ? 'Salvar Lembrete' : 'Criar Lembrete'}
          </Button>
          {onCancel ? (
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancelar
            </Button>
          ) : null}
        </div>
      </FieldGroup>
    </form>
  )
}
