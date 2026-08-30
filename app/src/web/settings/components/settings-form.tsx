import { useForm } from '@tanstack/react-form'
import { useSearch } from '@tanstack/react-router'
import { parseSettings, settingsSchema, type Settings } from '@/shared/settings/types'
import { Button } from '@/web/common/components/ui/button'
import { Field, FieldGroup, FieldLabel } from '@/web/common/components/ui/field'
import { NativeSelect } from '@/web/common/components/ui/native-select'
import { GoogleAccountsSection } from '@/web/settings/components/google-accounts-section'
import { GOOGLE_STATUS_MESSAGES, TIMEZONES } from '@/web/settings/components/settings-constants'
import { SettingsNumberField } from '@/web/settings/components/settings-number-field'

export function SettingsForm({
  settings,
  pending,
  error,
  onSave,
  onGoogleChange,
}: {
  settings: Settings
  pending: boolean
  error: string | null
  onSave: (settings: Settings) => Promise<Settings>
  onGoogleChange: () => void
}) {
  const search = useSearch({ strict: false }) as { google?: string }
  const oauthBanner =
    search.google && GOOGLE_STATUS_MESSAGES[search.google]
      ? GOOGLE_STATUS_MESSAGES[search.google]
      : null

  const zones = TIMEZONES.includes(settings.timezone)
    ? TIMEZONES
    : [settings.timezone, ...TIMEZONES]
  const form = useForm({
    defaultValues: settings,
    validators: {
      onSubmit: settingsSchema,
    },
    onSubmit: async ({ value }) => {
      const parsed = parseSettings(value)
      if (!parsed.success) return
      await onSave(parsed.data)
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
        <form.Field name="timezone">
          {(field) => (
            <Field>
              <FieldLabel htmlFor={field.name}>Fuso horário</FieldLabel>
              <NativeSelect
                id={field.name}
                name={field.name}
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
              >
                {zones.map((zone) => (
                  <option key={zone} value={zone}>
                    {zone}
                  </option>
                ))}
              </NativeSelect>
            </Field>
          )}
        </form.Field>

        <form.Field name="reminderMinutes">
          {(field) => (
            <SettingsNumberField field={field} label="Minutos de antecedência do Alerta" min={1} max={180} />
          )}
        </form.Field>
        <form.Field name="lookaheadDays">
          {(field) => <SettingsNumberField field={field} label="Dias de horizonte" min={1} max={30} />}
        </form.Field>
        <form.Field name="showNextEvents">
          {(field) => (
            <SettingsNumberField field={field} label="Próximos Events (agenda e display)" min={1} max={5} />
          )}
        </form.Field>

        {form.state.errors.length > 0 || error ? (
          <p className="text-sm text-destructive" role="alert">
            {error ?? 'Valores fora dos limites da API.'}
          </p>
        ) : null}

        <Button type="submit" loading={pending} className="w-fit">
          Salvar
        </Button>

        <GoogleAccountsSection oauthBanner={oauthBanner} onChange={onGoogleChange} />
      </FieldGroup>
    </form>
  )
}
