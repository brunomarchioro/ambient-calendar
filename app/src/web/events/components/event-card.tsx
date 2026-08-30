import type { EventPublic } from '@/shared/events/types'
import { canMutateEvent } from '@/web/events/utils'
import { Badge } from '@/web/common/components/ui/badge'
import { Button } from '@/web/common/components/ui/button'
import { Card, CardContent } from '@/web/common/components/ui/card'

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
      <CardContent className="pt-6">
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 space-y-1">
              <h3 className="font-semibold leading-none">{event.title}</h3>
              <p className="text-sm text-muted-foreground">{eventWhen(event)}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {!manual && event.calendarSummary ? (
                <Badge variant="secondary">{event.calendarSummary}</Badge>
              ) : null}
              <Badge variant={manual ? 'default' : 'outline'}>{manual ? 'Lembrete' : 'Google'}</Badge>
            </div>
          </div>
          {manual ? (
            <div className="flex flex-wrap gap-3">
              <Button type="button" size="sm" variant="outline" onClick={onEdit}>
                Editar
              </Button>
              <Button type="button" size="sm" variant="destructive" loading={deleting} onClick={onDelete}>
                Excluir
              </Button>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Somente leitura</p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
