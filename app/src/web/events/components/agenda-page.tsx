import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import type { EventWrite, ManualEvent } from '@/shared/events/types'
import {
  createEventMutationOptions,
  deleteEventMutationOptions,
  updateEventMutationOptions,
} from '@/web/events/api/event-mutations'
import { eventsQueryKey, eventsQueryOptions } from '@/web/events/api/events-query'
import { EventCard } from '@/web/events/components/event-card'
import { LembreteForm } from '@/web/events/components/lembrete-form'
import { selectEventsInHorizon } from '@/shared/events/horizon'
import { canMutateEvent } from '@/web/events/utils'
import { settingsQueryOptions } from '@/web/settings/api/settings-query'
import { Card, CardContent } from '@/web/common/components/ui/card'

export function AgendaPage() {
  const queryClient = useQueryClient()
  const [editing, setEditing] = useState<ManualEvent | null>(null)
  const eventsQuery = useQuery(eventsQueryOptions())
  const settingsQuery = useQuery(settingsQueryOptions())

  const createMutation = useMutation({
    ...createEventMutationOptions(),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: eventsQueryKey })
    },
  })
  const updateMutation = useMutation({
    ...updateEventMutationOptions(),
    onSuccess: async () => {
      setEditing(null)
      await queryClient.invalidateQueries({ queryKey: eventsQueryKey })
    },
  })
  const deleteMutation = useMutation({
    ...deleteEventMutationOptions(),
    onSuccess: async () => {
      if (editing) setEditing(null)
      await queryClient.invalidateQueries({ queryKey: eventsQueryKey })
    },
  })

  const settings = settingsQuery.data
  const upcoming = useMemo(() => {
    if (!eventsQuery.data || !settings) return []
    return selectEventsInHorizon(eventsQuery.data, {
      now: new Date(),
      lookaheadDays: settings.lookaheadDays,
      showNextEvents: settings.showNextEvents,
    })
  }, [eventsQuery.data, settings])

  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold">{editing ? 'Editar Lembrete' : 'Novo Lembrete'}</h2>
        {settings ? (
          <Card>
            <CardContent className="pt-6">
              <LembreteForm
                key={editing?.id ?? 'new'}
                timeZone={settings.timezone}
                event={editing ?? undefined}
                pending={createMutation.isPending || updateMutation.isPending}
                error={mutationError(editing ? updateMutation.error : createMutation.error)}
                onSave={async (write) => {
                  if (editing) await updateMutation.mutateAsync({ id: editing.id, write })
                  else await createMutation.mutateAsync(write)
                }}
                onCancel={editing ? () => setEditing(null) : undefined}
              />
            </CardContent>
          </Card>
        ) : (
          <p className="text-sm text-muted-foreground">Carregando configurações…</p>
        )}
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold">Próximos Events</h2>
        {eventsQuery.isPending || settingsQuery.isPending ? (
          <p className="text-sm text-muted-foreground">Carregando agenda…</p>
        ) : null}
        {eventsQuery.error ? (
          <p className="text-sm text-destructive" role="alert">
            {eventsQuery.error.message}
          </p>
        ) : null}
        {eventsQuery.data && settings && upcoming.length === 0 ? (
          <div className="rounded-lg border px-4 py-8 text-center text-sm" role="status">
            Nenhum Event próximo neste horizonte.
          </div>
        ) : null}
        <div className="flex flex-col gap-3">
          {upcoming.map((event) => (
            <EventCard
              key={event.id}
              event={event}
              deleting={deleteMutation.isPending && deleteMutation.variables === event.id}
              onEdit={() => {
                if (canMutateEvent(event)) setEditing(event)
              }}
              onDelete={() => {
                if (!canMutateEvent(event)) return
                if (window.confirm('Excluir este Lembrete?')) deleteMutation.mutate(event.id)
              }}
            />
          ))}
        </div>
      </section>
    </div>
  )
}

function mutationError(error: unknown): string | null {
  return error instanceof Error ? error.message : null
}
