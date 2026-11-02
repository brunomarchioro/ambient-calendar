import { useForm } from '@tanstack/react-form'
import { useSearch } from '@tanstack/react-router'
import { parseSettingsValues, settingsValuesSchema, type SettingsValues } from '@/shared/settings/types'
import { Label, ListBox, Select } from '@heroui/react'
import { PendingButton } from '@/web/common/components/pending-button'
import { GoogleAccountsSection } from '@/web/settings/components/google-accounts-section'
import { SettingsNumberField } from '@/web/settings/components/settings-number-field'

const TIMEZONES = [
  'America/Sao_Paulo',
  'America/Fortaleza',
  'America/Recife',
  'America/Bahia',
  'America/Manaus',
  'America/Cuiaba',
  'America/Porto_Velho',
  'America/Rio_Branco',
  'America/Belem',
  'America/Noronha',
  'UTC',
]

const GOOGLE_STATUS_MESSAGES: Record<string, string> = {
  connected: 'Conta Google conectada.',
  error: 'Não foi possível conectar a conta Google.',
  no_refresh: 'Google não devolveu refresh token. Tente reconectar com consent.',
  limit: 'Limite de contas Google atingido.',
  calendar_error:
    'Conta conectada, mas não foi possível importar calendários. Conceda acesso ao Google Calendar e reconecte (contas corporativas podem exigir liberação do admin).',
  tasks_connected: 'Google Tasks conectado para a conta.',
}

export function SettingsForm({
  settings,
  pending,
  error,
  onSave,
  onGoogleChange,
}: {
  settings: SettingsValues
  pending: boolean
  error: string | null
  onSave: (settings: SettingsValues) => Promise<unknown>
  onGoogleChange: () => void
}) {
  const search = useSearch({ strict: false }) as { google?: string }
  const oauthBanner = (search.google && GOOGLE_STATUS_MESSAGES[search.google]) || null

  const zones = TIMEZONES.includes(settings.timezone) ? TIMEZONES : [settings.timezone, ...TIMEZONES]
  const form = useForm({
    defaultValues: settings,
    validators: {
      onSubmit: settingsValuesSchema,
    },
    onSubmit: async ({ value }) => {
      const parsed = parseSettingsValues(value)
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
      <div className="flex flex-col gap-4">
        <form.Field name="timezone">
          {(field) => (
            <Select
              name={field.name}
              value={field.state.value}
              onBlur={field.handleBlur}
              onChange={(key) => {
                if (typeof key === 'string') field.handleChange(key)
              }}
            >
              <Label>Fuso horário</Label>
              <Select.Trigger>
                <Select.Value />
                <Select.Indicator />
              </Select.Trigger>
              <Select.Popover>
                <ListBox>
                  {zones.map((zone) => (
                    <ListBox.Item key={zone} id={zone} textValue={zone}>
                      {zone}
                      <ListBox.ItemIndicator />
                    </ListBox.Item>
                  ))}
                </ListBox>
              </Select.Popover>
            </Select>
          )}
        </form.Field>

        <form.Field name="reminderMinutes">
          {(field) => <SettingsNumberField field={field} label="Minutos de antecedência do Alerta" min={1} max={180} />}
        </form.Field>
        <form.Field name="lookaheadDays">
          {(field) => <SettingsNumberField field={field} label="Dias de horizonte" min={1} max={30} />}
        </form.Field>
        <form.Field name="showNextEvents">
          {(field) => <SettingsNumberField field={field} label="Próximos Events (agenda e display)" min={1} max={5} />}
        </form.Field>

        {form.state.errors.length > 0 || error ? (
          <p className="text-sm text-danger" role="alert">
            {error ?? 'Valores fora dos limites da API.'}
          </p>
        ) : null}

        <PendingButton type="submit" isPending={pending} className="w-fit">
          Salvar
        </PendingButton>

        <GoogleAccountsSection oauthBanner={oauthBanner} onChange={onGoogleChange} />
      </div>
    </form>
  )
}
