import { Box, Card, Heading, Stack, Text } from '@chakra-ui/react'
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
    <Stack gap="8">
      <Stack gap="4">
        <Heading size="md">{editing ? 'Editar Lembrete' : 'Novo Lembrete'}</Heading>
        {settings ? (
          <Card.Root>
            <Card.Body>
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
            </Card.Body>
          </Card.Root>
        ) : (
          <Text>Carregando configurações…</Text>
        )}
      </Stack>

      <Stack gap="4">
        <Heading size="md">Próximos Events</Heading>
        {eventsQuery.isPending || settingsQuery.isPending ? <Text>Carregando agenda…</Text> : null}
        {eventsQuery.error ? (
          <Text color="fg.error" role="alert">
            {eventsQuery.error.message}
          </Text>
        ) : null}
        {eventsQuery.data && settings && upcoming.length === 0 ? (
          <Box role="status" py="8" px="4" borderWidth="1px" borderRadius="l2">
            <Text>Nenhum Event próximo neste horizonte.</Text>
          </Box>
        ) : null}
        <Stack gap="3">
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
        </Stack>
      </Stack>
    </Stack>
  )
}

function mutationError(error: unknown): string | null {
  return error instanceof Error ? error.message : null
}
