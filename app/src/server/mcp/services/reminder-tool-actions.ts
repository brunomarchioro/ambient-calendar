import type { EventPublic, ManualEvent } from '@/shared/events/types'

export function filterManualReminders(events: readonly EventPublic[]): ManualEvent[] {
  return events.filter((event): event is ManualEvent => event.source === 'manual')
}
