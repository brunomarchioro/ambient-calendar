import { formatInTimeZone } from '@/shared/common/instant'
import { createDb } from '@/server/common/infra/db'
import {
  deleteManualEventRow,
  getEvent,
  insertManualEvent,
  listEvents,
  updateManualEventRow,
} from '@/server/events/repository/event-queries'
import { manualMutation } from '@/server/events/services/parse-event-row'
import {
  normalizeWrite,
  toStoredIso,
  type EventPublic,
  type EventWrite,
  type ManualEvent,
} from '@/shared/events/types'
import type { Settings } from '@/shared/settings/types'

function toManualPublic(row: {
  id: string
  title: string
  startAt: Date
  endAt: Date | null
  allDay: boolean
  timezone: string
  createdAt: string
  updatedAt: string
}): ManualEvent {
  return {
    id: row.id,
    source: 'manual',
    externalId: null,
    title: row.title,
    startAt: formatInTimeZone(row.startAt, row.timezone),
    endAt: row.endAt ? formatInTimeZone(row.endAt, row.timezone) : null,
    allDay: row.allDay,
    timezone: row.timezone,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

export async function listEventsUseCase(db: D1Database): Promise<EventPublic[]> {
  return listEvents(createDb(db))
}

export async function createEventUseCase(
  db: D1Database,
  write: EventWrite,
  settings: Settings,
): Promise<{ ok: true; event: ManualEvent } | { ok: false }> {
  const drizzle = createDb(db)
  const normalized = normalizeWrite(write, settings.timezone)
  if (!normalized.ok) return { ok: false }
  const now = new Date().toISOString()
  const id = crypto.randomUUID()
  await insertManualEvent(drizzle, {
    id,
    title: normalized.title,
    startAt: toStoredIso(normalized.startAt, settings.timezone),
    endAt: normalized.endAt ? toStoredIso(normalized.endAt, settings.timezone) : null,
    allDay: normalized.allDay,
    timezone: settings.timezone,
    createdAt: now,
    updatedAt: now,
  })
  return {
    ok: true,
    event: toManualPublic({
      id,
      title: normalized.title,
      startAt: normalized.startAt,
      endAt: normalized.endAt,
      allDay: normalized.allDay,
      timezone: settings.timezone,
      createdAt: now,
      updatedAt: now,
    }),
  }
}

export async function updateEventUseCase(
  db: D1Database,
  id: string,
  write: EventWrite,
  settings: Settings,
): Promise<{ ok: true; event: ManualEvent } | { ok: false; status: 400 | 404 | 409 }> {
  const drizzle = createDb(db)
  const existing = manualMutation(await getEvent(drizzle, id))
  if (!existing.ok) return existing
  const normalized = normalizeWrite(write, settings.timezone)
  if (!normalized.ok) return { ok: false, status: 400 }
  const updatedAt = new Date().toISOString()
  await updateManualEventRow(drizzle, id, {
    title: normalized.title,
    startAt: toStoredIso(normalized.startAt, settings.timezone),
    endAt: normalized.endAt ? toStoredIso(normalized.endAt, settings.timezone) : null,
    allDay: normalized.allDay,
    timezone: settings.timezone,
    updatedAt,
  })
  return {
    ok: true,
    event: toManualPublic({
      id,
      title: normalized.title,
      startAt: normalized.startAt,
      endAt: normalized.endAt,
      allDay: normalized.allDay,
      timezone: settings.timezone,
      createdAt: existing.event.createdAt,
      updatedAt,
    }),
  }
}

export async function deleteEventUseCase(
  db: D1Database,
  id: string,
): Promise<{ ok: true } | { ok: false; status: 404 | 409 }> {
  const drizzle = createDb(db)
  const existing = manualMutation(await getEvent(drizzle, id))
  if (!existing.ok) return existing
  await deleteManualEventRow(drizzle, id)
  return { ok: true }
}
