import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { eventsQueryKey } from '@/web/events/api/events-query'
import { googleAccountsQueryKey } from '@/web/settings/api/google-accounts-query'
import {
  saveSettingsMutationOptions,
  settingsQueryKey,
  settingsQueryOptions,
} from '@/web/settings/api/settings-query'
import { Card, CardContent } from '@/web/common/components/ui/card'
import { SettingsForm } from '@/web/settings/components/settings-form'

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
