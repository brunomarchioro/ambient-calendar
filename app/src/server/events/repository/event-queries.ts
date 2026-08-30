import { asc, eq } from 'drizzle-orm'
import { createDb, type AppDb } from '@/server/common/infra/db'
import { events } from '@/server/events/repository/schema'
import { calendarSummaryByEventKeys } from '@/server/google/repository/google-queries'
import { parseEventRow } from '@/server/events/services/parse-event-row'
import type { EventPublic } from '@/shared/events/types'

export async function listEvents(db: D1Database | AppDb): Promise<EventPublic[]> {
  const drizzle = typeof db === 'object' && 'select' in db ? db : createDb(db)
  const rows = await drizzle.select().from(events).orderBy(asc(events.startAt))
  const summaries = await calendarSummaryByEventKeys(db)
  return rows.flatMap((row): EventPublic[] => {
    const event = parseEventRow(row)
    if (!event) return []
    if (event.source === 'google') {
      const calendarSummary =
        summaries.get(`${event.googleAccountId}:${event.googleCalendarId}`) ?? null
      return [{ ...event, calendarSummary }]
    }
    return [event]
  })
}

export async function getEvent(db: D1Database | AppDb, id: string): Promise<EventPublic | null> {
  const drizzle = typeof db === 'object' && 'select' in db ? db : createDb(db)
  const [row] = await drizzle.select().from(events).where(eq(events.id, id)).limit(1)
  return row ? parseEventRow(row) : null
}

export async function insertManualEvent(
  db: D1Database | AppDb,
  row: {
    id: string
    title: string
    startAt: string
    endAt: string | null
    allDay: boolean
    timezone: string
    createdAt: string
    updatedAt: string
  },
): Promise<void> {
  const drizzle = typeof db === 'object' && 'insert' in db ? db : createDb(db)
  await drizzle.insert(events).values({
    id: row.id,
    source: 'manual',
    externalId: null,
    googleAccountId: null,
    googleCalendarId: null,
    title: row.title,
    startAt: row.startAt,
    endAt: row.endAt,
    allDay: row.allDay,
    timezone: row.timezone,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  })
}

export async function updateManualEventRow(
  db: D1Database | AppDb,
  id: string,
  row: {
    title: string
    startAt: string
    endAt: string | null
    allDay: boolean
    timezone: string
    updatedAt: string
  },
): Promise<void> {
  const drizzle = typeof db === 'object' && 'update' in db ? db : createDb(db)
  await drizzle
    .update(events)
    .set({
      title: row.title,
      startAt: row.startAt,
      endAt: row.endAt,
      allDay: row.allDay,
      timezone: row.timezone,
      updatedAt: row.updatedAt,
    })
    .where(eq(events.id, id))
}

export async function deleteManualEventRow(db: D1Database | AppDb, id: string): Promise<void> {
  const drizzle = typeof db === 'object' && 'delete' in db ? db : createDb(db)
  await drizzle.delete(events).where(eq(events.id, id))
}

export async function listDeviceEventRows(db: D1Database | AppDb) {
  const drizzle = typeof db === 'object' && 'select' in db ? db : createDb(db)
  return drizzle
    .select({
      id: events.id,
      title: events.title,
      startAt: events.startAt,
      endAt: events.endAt,
      allDay: events.allDay,
    })
    .from(events)
}
