import { z } from 'zod'
import { getOrSeedSettings } from './settings'

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

export type Event =
  | (EventBase & { source: 'google'; externalId: string })
  | (EventBase & { source: 'manual'; externalId: null })

export type ManualEvent = Extract<Event, { source: 'manual' }>

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

export function parseEventsJson(input: unknown): Event[] | null {
  const parsed = z.array(eventPublicSchema).safeParse(input)
  return parsed.success ? parsed.data : null
}

const eventRowSchema = z.object({
  id: z.string().min(1),
  source: z.enum(['google', 'manual']),
  externalId: z.string().min(1).nullable(),
  title: z.string(),
  startAt: z.string().min(1),
  endAt: z.string().min(1).nullable(),
  allDay: z.union([z.literal(0), z.literal(1), z.boolean()]),
  timezone: z.string().min(1),
  createdAt: z.string(),
  updatedAt: z.string(),
})

const SELECT_EVENTS = `SELECT id, source, externalId, title, startAt, endAt, allDay, timezone, createdAt, updatedAt
FROM Event ORDER BY startAt ASC`
const SELECT_EVENT = `SELECT id, source, externalId, title, startAt, endAt, allDay, timezone, createdAt, updatedAt
FROM Event WHERE id = ?`
const INSERT_MANUAL = `INSERT INTO Event (id, source, externalId, title, startAt, endAt, allDay, timezone, createdAt, updatedAt)
VALUES (?, 'manual', NULL, ?, ?, ?, ?, ?, ?, ?)`
const UPDATE_MANUAL = `UPDATE Event SET title = ?, startAt = ?, endAt = ?, allDay = ?, timezone = ?, updatedAt = ?
WHERE id = ? AND source = 'manual'`
const DELETE_MANUAL = `DELETE FROM Event WHERE id = ? AND source = 'manual'`

export function parseEventWrite(input: unknown) {
  return eventWriteSchema.safeParse(input)
}

export async function readJsonBody(
  request: Request,
): Promise<{ ok: true; body: unknown } | { ok: false }> {
  try {
    return { ok: true, body: await request.json() }
  } catch {
    return { ok: false }
  }
}

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

function timeZoneOffsetMs(utcMs: number, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(utcMs))
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value)
  const asUtc = Date.UTC(
    value('year'),
    value('month') - 1,
    value('day'),
    value('hour'),
    value('minute'),
    value('second'),
  )
  return asUtc - utcMs
}

function formatOffset(offsetMs: number): string {
  const sign = offsetMs >= 0 ? '+' : '-'
  const abs = Math.abs(offsetMs)
  return `${sign}${pad(Math.floor(abs / 3_600_000))}:${pad(Math.floor((abs % 3_600_000) / 60_000))}`
}

export function formatInTimeZone(instant: Date, timeZone: string): string {
  const offsetMs = timeZoneOffsetMs(instant.getTime(), timeZone)
  const local = new Date(instant.getTime() + offsetMs)
  return `${local.getUTCFullYear()}-${pad(local.getUTCMonth() + 1)}-${pad(local.getUTCDate())}T${pad(local.getUTCHours())}:${pad(local.getUTCMinutes())}:${pad(local.getUTCSeconds())}${formatOffset(offsetMs)}`
}

function calendarDate(instant: Date, timeZone: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(instant)
}

export function instantFromWallClock(wall: string, timeZone: string): Date {
  const withSeconds = wall.length === 16 ? `${wall}:00` : wall
  const [ymd, hms = '00:00:00'] = withSeconds.split('T')
  const [year, month, day] = ymd.split('-').map(Number)
  const [hour, minute, second] = hms.split(':').map(Number)
  const utcGuess = Date.UTC(year, month - 1, day, hour, minute, second ?? 0)
  const offset = timeZoneOffsetMs(utcGuess, timeZone)
  let instantMs = utcGuess - offset
  const offset2 = timeZoneOffsetMs(instantMs, timeZone)
  if (offset2 !== offset) instantMs = utcGuess - offset2
  return new Date(instantMs)
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

export function parseEventRow(row: unknown): Event | null {
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
    if (r.externalId === null) return null
    return { ...base, source: 'google', externalId: r.externalId }
  }
  if (r.externalId !== null) return null
  return { ...base, source: 'manual', externalId: null }
}

export function manualMutation(
  event: Event | null,
): { ok: true; event: ManualEvent } | { ok: false; status: 404 | 409 } {
  if (event === null) return { ok: false, status: 404 }
  if (event.source === 'google') return { ok: false, status: 409 }
  return { ok: true, event }
}

function toStoredIso(instant: Date): string {
  return instant.toISOString()
}

function toPublic(row: {
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

export async function listEvents(db: D1Database): Promise<Event[]> {
  const { results } = await db.prepare(SELECT_EVENTS).all<Record<string, unknown>>()
  return (results ?? []).flatMap((row) => {
    const event = parseEventRow(row)
    return event ? [event] : []
  })
}

export async function getEvent(db: D1Database, id: string): Promise<Event | null> {
  const row = await db.prepare(SELECT_EVENT).bind(id).first<Record<string, unknown>>()
  return row ? parseEventRow(row) : null
}

export async function createManualEvent(
  db: D1Database,
  write: EventWrite,
): Promise<{ ok: true; event: ManualEvent } | { ok: false }> {
  const settings = await getOrSeedSettings(db)
  const normalized = normalizeWrite(write, settings.timezone)
  if (!normalized.ok) return { ok: false }
  const now = new Date().toISOString()
  const id = crypto.randomUUID()
  await db
    .prepare(INSERT_MANUAL)
    .bind(
      id,
      normalized.title,
      toStoredIso(normalized.startAt),
      normalized.endAt ? toStoredIso(normalized.endAt) : null,
      normalized.allDay ? 1 : 0,
      settings.timezone,
      now,
      now,
    )
    .run()
  return {
    ok: true,
    event: toPublic({
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

export async function updateManualEvent(
  db: D1Database,
  id: string,
  write: EventWrite,
): Promise<{ ok: true; event: ManualEvent } | { ok: false; status: 400 | 404 | 409 }> {
  const existing = manualMutation(await getEvent(db, id))
  if (!existing.ok) return existing
  const settings = await getOrSeedSettings(db)
  const normalized = normalizeWrite(write, settings.timezone)
  if (!normalized.ok) return { ok: false, status: 400 }
  const updatedAt = new Date().toISOString()
  await db
    .prepare(UPDATE_MANUAL)
    .bind(
      normalized.title,
      toStoredIso(normalized.startAt),
      normalized.endAt ? toStoredIso(normalized.endAt) : null,
      normalized.allDay ? 1 : 0,
      settings.timezone,
      updatedAt,
      id,
    )
    .run()
  return {
    ok: true,
    event: toPublic({
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

export async function deleteManualEvent(
  db: D1Database,
  id: string,
): Promise<{ ok: true } | { ok: false; status: 404 | 409 }> {
  const existing = manualMutation(await getEvent(db, id))
  if (!existing.ok) return existing
  await db.prepare(DELETE_MANUAL).bind(id).run()
  return { ok: true }
}
