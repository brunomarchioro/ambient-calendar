import { z } from 'zod'
import { formatInTimeZone } from '@/shared/common/instant'
import type { EventPublic, ManualEvent } from '@/shared/events/types'

const eventRowSchema = z.object({
  id: z.string().min(1),
  source: z.enum(['google', 'manual']),
  externalId: z.string().min(1).nullable(),
  googleAccountId: z.string().min(1).nullable().optional(),
  googleCalendarId: z.string().min(1).nullable().optional(),
  title: z.string(),
  startAt: z.string().min(1),
  endAt: z.string().min(1).nullable(),
  allDay: z.union([z.literal(0), z.literal(1), z.boolean()]),
  timezone: z.string().min(1),
  createdAt: z.string(),
  updatedAt: z.string(),
})

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

export function parseEventRow(row: unknown): EventPublic | null {
  const parsed = eventRowSchema.safeParse(row)
  if (!parsed.success) return null
  const r = parsed.data
  const start = new Date(r.startAt)
  if (Number.isNaN(start.getTime())) return null
  let endAt: string | null = null
  if (r.endAt !== null) {
    const end = new Date(r.endAt)
    if (Number.isNaN(end.getTime())) return null
    endAt = formatInTimeZone(end, r.timezone)
  }
  const base: EventBase = {
    id: r.id,
    title: r.title,
    startAt: formatInTimeZone(start, r.timezone),
    endAt,
    allDay: r.allDay === 1 || r.allDay === true,
    timezone: r.timezone,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  }
  if (r.source === 'google') {
    if (r.externalId === null || !r.googleAccountId || !r.googleCalendarId) return null
    return {
      ...base,
      source: 'google',
      externalId: r.externalId,
      googleAccountId: r.googleAccountId,
      googleCalendarId: r.googleCalendarId,
      calendarSummary: null,
    }
  }
  if (r.externalId !== null || r.googleAccountId || r.googleCalendarId) return null
  return { ...base, source: 'manual', externalId: null }
}

export function manualMutation(
  event: EventPublic | null,
): { ok: true; event: ManualEvent } | { ok: false; status: 404 | 409 } {
  if (event === null) return { ok: false, status: 404 }
  if (event.source === 'google') return { ok: false, status: 409 }
  return { ok: true, event }
}
