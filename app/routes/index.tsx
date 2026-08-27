import { Badge, Box, Button, Card, Heading, HStack, Stack, Text } from '@chakra-ui/react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { LembreteForm } from '../components/LembreteForm'
import type { Event, EventWrite, ManualEvent } from '../event'
import {
  canMutateEvent,
  createLembrete,
  deleteLembrete,
  eventsQueryKey,
  fetchEvents,
  fetchSettings,
  settingsQueryKey,
  upcomingEvents,
  updateLembrete,
} from '../web'

export const Route = createFileRoute('/')({
  ssr: false,
  component: AgendaPage,
})

function AgendaPage() {
  const queryClient = useQueryClient()
  const [editing, setEditing] = useState<ManualEvent | null>(null)
  const eventsQuery = useQuery({ queryKey: eventsQueryKey, queryFn: fetchEvents })
  const settingsQuery = useQuery({ queryKey: settingsQueryKey, queryFn: fetchSettings })

  const createMutation = useMutation({
    mutationFn: createLembrete,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: eventsQueryKey })
    },
  })
  const updateMutation = useMutation({
    mutationFn: ({ id, write }: { id: string; write: EventWrite }) => updateLembrete(id, write),
    onSuccess: async () => {
      setEditing(null)
      await queryClient.invalidateQueries({ queryKey: eventsQueryKey })
    },
  })
  const deleteMutation = useMutation({
    mutationFn: deleteLembrete,
    onSuccess: async () => {
      if (editing) setEditing(null)
      await queryClient.invalidateQueries({ queryKey: eventsQueryKey })
    },
  })

  const settings = settingsQuery.data
  const upcoming = eventsQuery.data && settings
    ? upcomingEvents(eventsQuery.data, new Date(), settings.lookaheadDays)
    : []

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

function eventWhen(event: Event): string {
  if (event.allDay) {
    const start = event.startAt.slice(0, 10)
    const end = event.endAt ? event.endAt.slice(0, 10) : null
    return end ? `${start} → ${end}` : start
  }
  const start = event.startAt.slice(0, 16).replace('T', ' ')
  const end = event.endAt ? event.endAt.slice(0, 16).replace('T', ' ') : null
  return end ? `${start} → ${end}` : start
}

function EventCard({
  event,
  deleting,
  onEdit,
  onDelete,
}: {
  event: Event
  deleting: boolean
  onEdit: () => void
  onDelete: () => void
}) {
  const manual = canMutateEvent(event)
  return (
    <Card.Root>
      <Card.Body>
        <Stack gap="3">
          <HStack justify="space-between" align="flex-start" gap="3" flexWrap="wrap">
            <Stack gap="1" minW="0">
              <Heading size="sm">{event.title}</Heading>
              <Text color="fg.muted">{eventWhen(event)}</Text>
            </Stack>
            <Badge colorPalette={manual ? 'blue' : 'gray'}>{manual ? 'Lembrete' : 'Google'}</Badge>
          </HStack>
          {manual ? (
            <HStack gap="3" flexWrap="wrap">
              <Button type="button" size="sm" variant="outline" onClick={onEdit}>
                Editar
              </Button>
              <Button type="button" size="sm" variant="outline" colorPalette="red" loading={deleting} onClick={onDelete}>
                Excluir
              </Button>
            </HStack>
          ) : (
            <Text fontSize="sm" color="fg.muted">
              Somente leitura
            </Text>
          )}
        </Stack>
      </Card.Body>
    </Card.Root>
  )
}
