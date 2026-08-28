import {
  Badge,
  Box,
  Button,
  Card,
  Checkbox,
  Field,
  Heading,
  HStack,
  Input,
  NativeSelect,
  Stack,
  Text,
} from '@chakra-ui/react'
import { useForm } from '@tanstack/react-form'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useSearch } from '@tanstack/react-router'
import { parseSettings, settingsSchema, type Settings } from '@/shared/settings/types'
import type { GoogleAccountPublic } from '@/shared/google/types'
import { eventsQueryKey } from '@/web/events/api/events-query'
import {
  disconnectGoogleAccountMutationOptions,
  googleSyncMutationOptions,
  patchGoogleCalendarMutationOptions,
} from '@/web/settings/api/google-mutations'
import {
  googleAccountsQueryKey,
  googleAccountsQueryOptions,
} from '@/web/settings/api/google-accounts-query'
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

const GOOGLE_STATUS_MESSAGES: Record<string, string> = {
  connected: 'Conta Google conectada.',
  error: 'Não foi possível conectar a conta Google.',
  no_refresh: 'Google não devolveu refresh token. Tente reconectar com consent.',
  limit: 'Limite de contas Google atingido.',
}

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
              onGoogleChange={() => {
                void queryClient.invalidateQueries({ queryKey: googleAccountsQueryKey })
                void queryClient.invalidateQueries({ queryKey: eventsQueryKey })
              }}
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

        <GoogleAccountsSection oauthBanner={oauthBanner} onChange={onGoogleChange} />
      </Stack>
    </form>
  )
}

function GoogleAccountsSection({
  oauthBanner,
  onChange,
}: {
  oauthBanner: string | null
  onChange: () => void
}) {
  const queryClient = useQueryClient()
  const accountsQuery = useQuery(googleAccountsQueryOptions())
  const syncMutation = useMutation({
    ...googleSyncMutationOptions(),
    onSuccess: (data) => {
      if (data.ok) onChange()
    },
  })
  const disconnectMutation = useMutation({
    ...disconnectGoogleAccountMutationOptions(),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: googleAccountsQueryKey })
      onChange()
    },
  })
  const patchMutation = useMutation({
    ...patchGoogleCalendarMutationOptions(),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: googleAccountsQueryKey })
    },
  })

  const accounts = accountsQuery.data ?? []
  const hasAccounts = accounts.length > 0

  return (
    <Stack gap="3" pt="2" borderTopWidth="1px">
      <Heading size="sm">Contas Google</Heading>
      {oauthBanner ? (
        <Text fontSize="sm" color="fg.muted" role="status">
          {oauthBanner}
        </Text>
      ) : null}
      {accountsQuery.isPending ? <Text fontSize="sm">Carregando contas…</Text> : null}
      {accountsQuery.error ? (
        <Text color="fg.error" role="alert">
          {accountsQuery.error.message}
        </Text>
      ) : null}
      {accounts.map((account) => (
        <GoogleAccountCard
          key={account.id}
          account={account}
          disconnecting={disconnectMutation.isPending}
          patching={patchMutation.isPending}
          onDisconnect={() => disconnectMutation.mutate(account.id)}
          onReconnect={() => {
            window.location.href = `/api/google/oauth/start?mode=reconnect&accountId=${account.id}`
          }}
          onToggleCalendar={(id, enabled) => patchMutation.mutate({ id, enabled })}
        />
      ))}
      <HStack gap="3" flexWrap="wrap">
        <Button
          type="button"
          variant="outline"
          alignSelf="flex-start"
          onClick={() => {
            window.location.href = '/api/google/oauth/start?mode=connect'
          }}
        >
          Adicionar conta Google
        </Button>
        {hasAccounts ? (
          <Button
            type="button"
            variant="outline"
            loading={syncMutation.isPending}
            alignSelf="flex-start"
            onClick={() => syncMutation.mutate()}
          >
            Sincronizar agora
          </Button>
        ) : null}
      </HStack>
      {syncMutation.data ? (
        <Text color={syncMutation.data.ok ? 'fg.muted' : 'fg.error'} role="status">
          {syncMutation.data.message}
        </Text>
      ) : null}
      {syncMutation.error ? (
        <Text color="fg.error" role="alert">
          {syncMutation.error.message}
        </Text>
      ) : null}
    </Stack>
  )
}

function GoogleAccountCard({
  account,
  disconnecting,
  patching,
  onDisconnect,
  onReconnect,
  onToggleCalendar,
}: {
  account: GoogleAccountPublic
  disconnecting: boolean
  patching: boolean
  onDisconnect: () => void
  onReconnect: () => void
  onToggleCalendar: (calendarRowId: string, enabled: boolean) => void
}) {
  const needsReconnect = account.status === 'needs_reconnect'
  return (
    <Box borderWidth="1px" borderRadius="md" p="3">
      <Stack gap="3">
        <HStack justify="space-between" flexWrap="wrap" gap="2">
          <Stack gap="0">
            <Text fontWeight="medium">{account.email}</Text>
            {needsReconnect ? (
              <Badge colorPalette="orange" alignSelf="flex-start">
                Reconectar
              </Badge>
            ) : null}
          </Stack>
          <HStack gap="2">
            {needsReconnect ? (
              <Button type="button" size="sm" variant="outline" onClick={onReconnect}>
                Reconectar
              </Button>
            ) : null}
            <Button
              type="button"
              size="sm"
              variant="outline"
              colorPalette="red"
              loading={disconnecting}
              onClick={onDisconnect}
            >
              Desconectar
            </Button>
          </HStack>
        </HStack>
        <Stack gap="2" pl="1">
          {account.calendars.map((cal) => (
            <Checkbox.Root
              key={cal.id}
              checked={cal.enabled}
              disabled={patching || needsReconnect}
              onCheckedChange={(details) => {
                const enabled = details.checked === true
                if (enabled !== cal.enabled) onToggleCalendar(cal.id, enabled)
              }}
            >
              <Checkbox.HiddenInput />
              <Checkbox.Control />
              <Checkbox.Label>{cal.summary}</Checkbox.Label>
            </Checkbox.Root>
          ))}
          {account.calendars.length === 0 ? (
            <Text fontSize="sm" color="fg.muted">
              Nenhum calendário importado.
            </Text>
          ) : null}
        </Stack>
      </Stack>
    </Box>
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
