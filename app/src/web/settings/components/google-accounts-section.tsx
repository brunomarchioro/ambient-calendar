import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  disconnectGoogleAccountMutationOptions,
  googleSyncMutationOptions,
  patchGoogleCalendarMutationOptions,
  patchGoogleTaskListMutationOptions,
} from '@/web/settings/api/google-mutations'
import { googleAccountsQueryKey, googleAccountsQueryOptions } from '@/web/settings/api/google-accounts-query'
import { Button } from '@heroui/react'
import { PendingButton } from '@/web/common/components/pending-button'
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
    onSuccess: () => {
      onChange()
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
  const taskPatchMutation = useMutation({
    ...patchGoogleTaskListMutationOptions(),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: googleAccountsQueryKey }),
  })

  const accounts = accountsQuery.data ?? []
  const hasAccounts = accounts.length > 0

  return (
    <div className="flex flex-col gap-3 border-t pt-4">
      <h3 className="text-base font-semibold">Contas Google</h3>
      {oauthBanner ? (
        <p className="text-sm text-muted" role="status">
          {oauthBanner}
        </p>
      ) : null}
      {accountsQuery.isPending ? <p className="text-sm text-muted">Carregando contas…</p> : null}
      {accountsQuery.error ? (
        <p className="text-sm text-danger" role="alert">
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
          patchingTaskListId={taskPatchMutation.isPending ? (taskPatchMutation.variables?.id ?? null) : null}
          onDisconnect={() => disconnectMutation.mutate(account.id)}
          onReconnect={() => {
            window.location.href = `/api/google/oauth/start?mode=reconnect&accountId=${account.id}`
          }}
          onConnectTasks={() => {
            window.location.href = `/api/google/oauth/start?mode=connect_tasks&accountId=${account.id}`
          }}
          onToggleCalendar={(id, enabled) => patchMutation.mutate({ id, enabled })}
          onToggleTaskList={(id, enabled) => taskPatchMutation.mutate({ id, enabled })}
        />
      ))}
      <div className="flex flex-wrap gap-3">
        <Button
          variant="outline"
          onPress={() => {
            window.location.href = '/api/google/oauth/start?mode=connect'
          }}
        >
          Adicionar conta Google
        </Button>
        {hasAccounts ? (
          <PendingButton variant="outline" isPending={syncMutation.isPending} onPress={() => syncMutation.mutate()}>
            Sincronizar agora
          </PendingButton>
        ) : null}
      </div>
      {syncMutation.data ? (
        <p
          className={syncMutation.data.ok ? 'text-sm text-muted' : 'text-sm text-danger'}
          role="status"
        >
          {syncMutation.data.message}
        </p>
      ) : null}
      {syncMutation.error ? (
        <p className="text-sm text-danger" role="alert">
          {syncMutation.error.message}
        </p>
      ) : null}
      {taskPatchMutation.error ? (
        <p className="text-sm text-danger" role="alert">
          {taskPatchMutation.error.message}
        </p>
      ) : null}
    </div>
  )
}
