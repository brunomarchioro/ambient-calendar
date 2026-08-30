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
import { Badge } from '@/web/common/components/ui/badge'
import { Button } from '@/web/common/components/ui/button'
import { Card, CardContent } from '@/web/common/components/ui/card'
import { Checkbox } from '@/web/common/components/ui/checkbox'
import { Field, FieldError, FieldGroup, FieldLabel } from '@/web/common/components/ui/field'
import { Input } from '@/web/common/components/ui/input'
import { Label } from '@/web/common/components/ui/label'
import { NativeSelect } from '@/web/common/components/ui/native-select'

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
    <div className="flex flex-col gap-6">
      <h2 className="text-lg font-semibold">Configurações</h2>
      {settingsQuery.isPending ? <p className="text-sm text-muted-foreground">Carregando configurações…</p> : null}
      {settingsQuery.error ? (
        <p className="text-sm text-destructive" role="alert">
          {settingsQuery.error.message}
        </p>
      ) : null}
      {settingsQuery.data ? (
        <Card>
          <CardContent className="pt-6">
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
          </CardContent>
        </Card>
      ) : null}
    </div>
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
            <NumberInput field={field} label="Minutos de antecedência do Alerta" min={1} max={180} />
          )}
        </form.Field>
        <form.Field name="lookaheadDays">
          {(field) => <NumberInput field={field} label="Dias de horizonte" min={1} max={30} />}
        </form.Field>
        <form.Field name="showNextEvents">
          {(field) => (
            <NumberInput field={field} label="Próximos Events (agenda e display)" min={1} max={5} />
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
    <div className="flex flex-col gap-3 border-t pt-4">
      <h3 className="text-base font-semibold">Contas Google</h3>
      {oauthBanner ? (
        <p className="text-sm text-muted-foreground" role="status">
          {oauthBanner}
        </p>
      ) : null}
      {accountsQuery.isPending ? <p className="text-sm text-muted-foreground">Carregando contas…</p> : null}
      {accountsQuery.error ? (
        <p className="text-sm text-destructive" role="alert">
          {accountsQuery.error.message}
        </p>
      ) : null}
      {accounts.map((account) => (
        <GoogleAccountCard
          key={account.id}
          account={account}
          disconnecting={
            disconnectMutation.isPending && disconnectMutation.variables === account.id
          }
          patchingCalendarId={
            patchMutation.isPending ? (patchMutation.variables?.id ?? null) : null
          }
          onDisconnect={() => disconnectMutation.mutate(account.id)}
          onReconnect={() => {
            window.location.href = `/api/google/oauth/start?mode=reconnect&accountId=${account.id}`
          }}
          onToggleCalendar={(id, enabled) => patchMutation.mutate({ id, enabled })}
        />
      ))}
      <div className="flex flex-wrap gap-3">
        <Button
          type="button"
          variant="outline"
          className="w-fit"
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
            className="w-fit"
            onClick={() => syncMutation.mutate()}
          >
            Sincronizar agora
          </Button>
        ) : null}
      </div>
      {syncMutation.data ? (
        <p
          className={syncMutation.data.ok ? 'text-sm text-muted-foreground' : 'text-sm text-destructive'}
          role="status"
        >
          {syncMutation.data.message}
        </p>
      ) : null}
      {syncMutation.error ? (
        <p className="text-sm text-destructive" role="alert">
          {syncMutation.error.message}
        </p>
      ) : null}
    </div>
  )
}

function GoogleAccountCard({
  account,
  disconnecting,
  patchingCalendarId,
  onDisconnect,
  onReconnect,
  onToggleCalendar,
}: {
  account: GoogleAccountPublic
  disconnecting: boolean
  patchingCalendarId: string | null
  onDisconnect: () => void
  onReconnect: () => void
  onToggleCalendar: (calendarRowId: string, enabled: boolean) => void
}) {
  const needsReconnect = account.status === 'needs_reconnect'
  return (
    <div className="rounded-md border p-3">
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="space-y-1">
            <p className="font-medium">{account.email}</p>
            {needsReconnect ? (
              <Badge variant="secondary" className="bg-orange-100 text-orange-900 dark:bg-orange-950 dark:text-orange-100">
                Reconectar
              </Badge>
            ) : null}
          </div>
          <div className="flex gap-2">
            {needsReconnect ? (
              <Button type="button" size="sm" variant="outline" onClick={onReconnect}>
                Reconectar
              </Button>
            ) : null}
            <Button type="button" size="sm" variant="destructive" loading={disconnecting} onClick={onDisconnect}>
              Desconectar
            </Button>
          </div>
        </div>
        <div className="flex flex-col gap-2 pl-1">
          {account.calendars.map((cal) => (
            <div key={cal.id} className="flex items-center gap-2">
              <Checkbox
                id={`cal-${cal.id}`}
                checked={cal.enabled}
                disabled={needsReconnect || patchingCalendarId === cal.id}
                onCheckedChange={(checked) => {
                  const enabled = checked === true
                  if (enabled !== cal.enabled) onToggleCalendar(cal.id, enabled)
                }}
              />
              <Label htmlFor={`cal-${cal.id}`} className="font-normal">
                {cal.summary}
              </Label>
            </div>
          ))}
          {account.calendars.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum calendário importado.</p>
          ) : null}
        </div>
      </div>
    </div>
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
    state: { value: number; meta: { isTouched: boolean; isValid: boolean; errors: unknown[] } }
    handleBlur: () => void
    handleChange: (value: number) => void
  }
  label: string
  min: number
  max: number
}) {
  const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid
  return (
    <Field data-invalid={isInvalid}>
      <FieldLabel htmlFor={field.name}>{label}</FieldLabel>
      <Input
        id={field.name}
        type="number"
        name={field.name}
        min={min}
        max={max}
        step={1}
        value={Number.isNaN(field.state.value) ? '' : field.state.value}
        onBlur={field.handleBlur}
        onChange={(e) => field.handleChange(e.target.valueAsNumber)}
        aria-invalid={isInvalid}
      />
      {isInvalid ? <FieldError errors={field.state.meta.errors as Array<string | { message?: string }>} /> : null}
    </Field>
  )
}
