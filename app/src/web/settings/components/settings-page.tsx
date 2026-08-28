import { Button, Card, Field, Heading, Input, NativeSelect, Stack, Text } from '@chakra-ui/react'
import { useForm } from '@tanstack/react-form'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { parseSettings, settingsSchema, type Settings } from '@/shared/settings/types'
import { eventsQueryKey } from '@/web/events/api/events-query'
import { testGoogleConnectionMutationOptions } from '@/web/settings/api/google-connection-mutation'
import {
  saveSettingsMutationOptions,
  settingsQueryKey,
  settingsQueryOptions,
} from '@/web/settings/api/settings-query'

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

export function SettingsPage() {
  const queryClient = useQueryClient()
  const settingsQuery = useQuery(settingsQueryOptions())
  const saveMutation = useMutation({
    ...saveSettingsMutationOptions(),
    onSuccess: async (settings) => {
      queryClient.setQueryData(settingsQueryKey, settings)
    },
  })

  return (
    <Stack gap="6">
      <Heading size="md">Configurações</Heading>
      {settingsQuery.isPending ? <Text>Carregando configurações…</Text> : null}
      {settingsQuery.error ? (
        <Text color="fg.error" role="alert">
          {settingsQuery.error.message}
        </Text>
      ) : null}
      {settingsQuery.data ? (
        <Card.Root>
          <Card.Body>
            <SettingsForm
              settings={settingsQuery.data}
              pending={saveMutation.isPending}
              error={saveMutation.error instanceof Error ? saveMutation.error.message : null}
              onSave={(settings) => saveMutation.mutateAsync(settings)}
              onGoogleSyncSuccess={() =>
                queryClient.invalidateQueries({ queryKey: eventsQueryKey })
              }
            />
          </Card.Body>
        </Card.Root>
      ) : null}
    </Stack>
  )
}

function SettingsForm({
  settings,
  pending,
  error,
  onSave,
  onGoogleSyncSuccess,
}: {
  settings: Settings
  pending: boolean
  error: string | null
  onSave: (settings: Settings) => Promise<Settings>
  onGoogleSyncSuccess: () => void
}) {
  const zones = TIMEZONES.includes(settings.timezone)
    ? TIMEZONES
    : [settings.timezone, ...TIMEZONES]
  const testMutation = useMutation({
    ...testGoogleConnectionMutationOptions(),
    onSuccess: (data) => {
      if (data.ok) onGoogleSyncSuccess()
    },
  })
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
      <Stack gap="4">
        <form.Field name="timezone">
          {(field) => (
            <Field.Root required>
              <Field.Label>Fuso horário</Field.Label>
              <NativeSelect.Root>
                <NativeSelect.Field
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
                </NativeSelect.Field>
                <NativeSelect.Indicator />
              </NativeSelect.Root>
            </Field.Root>
          )}
        </form.Field>

        <form.Field name="reminderMinutes">
          {(field) => (
            <NumberInput field={field} label="Minutos de antecedência do Alerta" min={1} max={180} />
          )}
        </form.Field>
        <form.Field name="lookaheadDays">
          {(field) => <NumberInput field={field} label="Dias de horizonte" min={1} max={30} />}
        </form.Field>
        <form.Field name="showNextEvents">
          {(field) => <NumberInput field={field} label="Próximos Events na HMI" min={1} max={5} />}
        </form.Field>

        {form.state.errors.length > 0 || error ? (
          <Text color="fg.error" role="alert">
            {error ?? 'Valores fora dos limites da API.'}
          </Text>
        ) : null}

        <Button type="submit" loading={pending} alignSelf="flex-start">
          Salvar
        </Button>

        <Stack gap="2" pt="2" borderTopWidth="1px">
          <Text fontSize="sm" color="fg.muted">
            Testa OAuth, sincroniza o calendário primary no horizonte atual e atualiza a agenda.
          </Text>
          <Button
            type="button"
            variant="outline"
            loading={testMutation.isPending}
            alignSelf="flex-start"
            onClick={() => testMutation.mutate()}
          >
            Testar e sincronizar Google
          </Button>
          {testMutation.error ? (
            <Text color="fg.error" role="alert">
              {testMutation.error.message}
            </Text>
          ) : null}
          {testMutation.data ? (
            <Text color={testMutation.data.ok ? 'fg.muted' : 'fg.error'} role="status">
              {testMutation.data.message}
            </Text>
          ) : null}
        </Stack>
      </Stack>
    </form>
  )
}

function NumberInput({
  field,
  label,
  min,
  max,
}: {
  field: {
    name: string
    state: { value: number; meta: { errors: unknown[] } }
    handleBlur: () => void
    handleChange: (value: number) => void
  }
  label: string
  min: number
  max: number
}) {
  const message = field.state.meta.errors
    .map((err) =>
      typeof err === 'string'
        ? err
        : err && typeof err === 'object' && 'message' in err
          ? String(err.message)
          : '',
    )
    .find(Boolean)
  return (
    <Field.Root invalid={field.state.meta.errors.length > 0} required>
      <Field.Label>{label}</Field.Label>
      <Input
        type="number"
        name={field.name}
        min={min}
        max={max}
        step={1}
        value={Number.isNaN(field.state.value) ? '' : field.state.value}
        onBlur={field.handleBlur}
        onChange={(e) => field.handleChange(e.target.valueAsNumber)}
      />
      <Field.ErrorText>{message}</Field.ErrorText>
    </Field.Root>
  )
}
