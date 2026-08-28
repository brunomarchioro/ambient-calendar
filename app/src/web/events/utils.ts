import {
  formatInTimeZone,
  instantFromWallClock,
} from '@/shared/common/instant'
import {
  parseEventWrite,
  type EventPublic,
  type EventWrite,
  type ManualEvent,
} from '@/shared/events/types'

export type LembreteFormValues = {
  title: string
  allDay: boolean
  start: string
  end: string
}

export function canMutateEvent(event: EventPublic): event is ManualEvent {
  return event.source === 'manual'
}

export function toDatetimeLocal(iso: string, allDay: boolean): string {
  return allDay ? iso.slice(0, 10) : iso.slice(0, 16)
}

export function defaultLembreteStart(now: Date, timeZone: string): string {
  return toDatetimeLocal(formatInTimeZone(new Date(now.getTime() + 3_600_000), timeZone), false)
}

function wallForForm(value: string, allDay: boolean): string {
  if (allDay) return value.includes('T') ? value : `${value}T00:00`
  return value
}

export function lembreteFormToWrite(values: LembreteFormValues, timeZone: string): EventWrite {
  const startAt = formatInTimeZone(
    instantFromWallClock(wallForForm(values.start, values.allDay), timeZone),
    timeZone,
  )
  const endAt =
    values.end.trim() === ''
      ? null
      : formatInTimeZone(instantFromWallClock(wallForForm(values.end, values.allDay), timeZone), timeZone)
  return { title: values.title, startAt, endAt, allDay: values.allDay }
}

export function parseLembreteForm(values: LembreteFormValues, timeZone: string) {
  const write = lembreteFormToWrite(values, timeZone)
  return parseEventWrite(write)
}
