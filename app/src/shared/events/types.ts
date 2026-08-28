import { z } from 'zod'
import { formatInTimeZone, instantFromWallClock } from '@/shared/common/instant'

const isoDateTime = z.iso.datetime({ offset: true })

export const eventWriteSchema = z.strictObject({
  title: z.string().trim().min(1),
  startAt: isoDateTime,
  endAt: isoDateTime.nullable().optional(),
  allDay: z.boolean(),
})

export type EventWrite = z.infer<typeof eventWriteSchema>

type EventBase = {
  id: string
  title: string
  startAt: string
  endAt: string | null
  allDay: boolean
  timezone: string
  createdAt: string
  updatedAt: string
}

export type EventPublic =
  | (EventBase & { source: 'google'; externalId: string })
  | (EventBase & { source: 'manual'; externalId: null })

export type ManualEvent = Extract<EventPublic, { source: 'manual' }>

const eventBasePublicSchema = z.object({
  id: z.string().min(1),
  title: z.string(),
  startAt: z.string().min(1),
  endAt: z.string().min(1).nullable(),
  allDay: z.boolean(),
  timezone: z.string().min(1),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export const eventPublicSchema = z.discriminatedUnion('source', [
  eventBasePublicSchema.extend({
    source: z.literal('google'),
    externalId: z.string().min(1),
  }),
  eventBasePublicSchema.extend({
    source: z.literal('manual'),
    externalId: z.null(),
  }),
])

export function parseEventsJson(input: unknown): EventPublic[] | null {
  const parsed = z.array(eventPublicSchema).safeParse(input)
  return parsed.success ? parsed.data : null
}

export function parseEventWrite(input: unknown) {
  return eventWriteSchema.safeParse(input)
}

function calendarDate(instant: Date, timeZone: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(instant)
}

function wallMidnight(ymd: string, timeZone: string): Date {
  return instantFromWallClock(`${ymd}T00:00:00`, timeZone)
}

function midnightInstant(instant: Date, timeZone: string): Date {
  return wallMidnight(calendarDate(instant, timeZone), timeZone)
}

function nextDayMidnight(instant: Date, timeZone: string): Date {
  const [year, month, day] = calendarDate(instant, timeZone).split('-').map(Number)
  const next = new Date(Date.UTC(year, month - 1, day + 1))
  return wallMidnight(next.toISOString().slice(0, 10), timeZone)
}

export function normalizeWrite(
  write: EventWrite,
  timeZone: string,
):
  | { ok: true; title: string; startAt: Date; endAt: Date | null; allDay: boolean }
  | { ok: false } {
  const startAt = write.allDay
    ? midnightInstant(new Date(write.startAt), timeZone)
    : new Date(write.startAt)
  let endAt: Date | null
  if (write.allDay) {
    endAt =
      write.endAt == null
        ? nextDayMidnight(startAt, timeZone)
        : midnightInstant(new Date(write.endAt), timeZone)
  } else {
    endAt = write.endAt == null ? null : new Date(write.endAt)
  }
  if (endAt !== null && endAt.getTime() <= startAt.getTime()) return { ok: false }
  return { ok: true, title: write.title, startAt, endAt, allDay: write.allDay }
}

export function toStoredIso(instant: Date, timeZone: string): string {
  return formatInTimeZone(instant, timeZone)
}
