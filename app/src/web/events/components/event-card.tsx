import { Badge, Button, Card, Heading, HStack, Stack, Text } from '@chakra-ui/react'
import type { EventPublic } from '@/shared/events/types'
import { canMutateEvent } from '@/web/events/utils'

function eventWhen(event: EventPublic): string {
  if (event.allDay) {
    const start = event.startAt.slice(0, 10)
    const end = event.endAt ? event.endAt.slice(0, 10) : null
    return end ? `${start} → ${end}` : start
  }
  const start = event.startAt.slice(0, 16).replace('T', ' ')
  const end = event.endAt ? event.endAt.slice(0, 16).replace('T', ' ') : null
  return end ? `${start} → ${end}` : start
}

export function EventCard({
  event,
  deleting,
  onEdit,
  onDelete,
}: {
  event: EventPublic
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
            <HStack gap="2" flexWrap="wrap">
              {!manual && event.calendarSummary ? (
                <Badge colorPalette="purple" variant="subtle">
                  {event.calendarSummary}
                </Badge>
              ) : null}
              <Badge colorPalette={manual ? 'blue' : 'gray'}>{manual ? 'Lembrete' : 'Google'}</Badge>
            </HStack>
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
