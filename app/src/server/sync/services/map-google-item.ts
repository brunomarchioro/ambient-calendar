import { z } from 'zod'
import { formatGoogleDateTime, zonedMidnight } from '@/shared/common/instant'
import type { MappedEvent } from '@/server/sync/types'

const googleDateSchema = z.object({
  date: z.string().optional(),
  dateTime: z.string().optional(),
  timeZone: z.string().optional(),
})

const googleItemSchema = z.object({
  id: z.string().min(1),
  status: z.string().optional(),
  summary: z.string().optional(),
  start: googleDateSchema,
  end: googleDateSchema.optional(),
})

export function mapGoogleItem(item: unknown, timezone: string): MappedEvent | null {
  const parsed = googleItemSchema.safeParse(item)
  if (!parsed.success) return null
  const { id, status, summary, start, end } = parsed.data
  if (status === 'cancelled') return null
  const title = summary?.trim() ? summary.trim() : 'Ocupado'
  if (start.date) {
    return {
      externalId: id,
      title,
      startAt: zonedMidnight(start.date, timezone),
      endAt: end?.date ? zonedMidnight(end.date, timezone) : null,
      allDay: true,
      timezone,
    }
  }
  if (start.dateTime) {
    const zone = start.timeZone ?? timezone
    return {
      externalId: id,
      title,
      startAt: formatGoogleDateTime(start.dateTime, zone),
      endAt: end?.dateTime ? formatGoogleDateTime(end.dateTime, end.timeZone ?? zone) : null,
      allDay: false,
      timezone,
    }
  }
  return null
}
