import type { EventPublic } from '@/shared/events/types'
import { canMutateEvent } from '@/web/events/utils'
import { Button, Card, Chip } from '@heroui/react'
import { PendingButton } from '@/web/common/components/pending-button'

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
    <Card>
      <Card.Content>
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 space-y-1">
              <h3 className="font-semibold leading-none">{event.title}</h3>
              <p className="text-sm text-muted">{eventWhen(event)}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {!manual && event.calendarSummary ? (
                <Chip size="sm">{event.calendarSummary}</Chip>
              ) : null}
              <Chip size="sm" color={manual ? 'accent' : 'default'} variant={manual ? 'primary' : 'tertiary'}>
                {manual ? 'Lembrete' : 'Google'}
              </Chip>
            </div>
          </div>
          {manual ? (
            <div className="flex flex-wrap gap-3">
              <Button size="sm" variant="outline" onPress={onEdit}>
                Editar
              </Button>
              <PendingButton size="sm" variant="danger" isPending={deleting} onPress={onDelete}>
                Excluir
              </PendingButton>
            </div>
          ) : (
            <p className="text-sm text-muted">Somente leitura</p>
          )}
        </div>
      </Card.Content>
    </Card>
  )
}
