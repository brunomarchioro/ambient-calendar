import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  disconnectGoogleAccountMutationOptions,
  googleSyncMutationOptions,
  patchGoogleCalendarMutationOptions,
} from '@/web/settings/api/google-mutations'
import { googleAccountsQueryKey, googleAccountsQueryOptions } from '@/web/settings/api/google-accounts-query'
import { Button } from '@/web/common/components/ui/button'
import { GoogleAccountCard } from '@/web/settings/components/google-account-card'

export function GoogleAccountsSection({
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
