import { getOrSeedSettings, type Settings } from './settings'

export type DeviceEvent = {
  id: string
  title: string
  startAt: string
  endAt: string | null
  allDay: boolean
}

export type DeviceSchedule = {
  serverTime: string
  timezone: string
  reminderMinutes: number
  showNextEvents: number
  events: DeviceEvent[]
}

export type EventRow = {
  id: string
  title: string
  startAt: string
  endAt: string | null
  allDay: unknown
}

const MS_PER_DAY = 86_400_000
const SELECT_EVENTS = 'SELECT id, title, startAt, endAt, allDay FROM Event' // ponytail: full Event scan, SQL window if the table grows

export function horizonEnd(now: Date, lookaheadDays: number): Date {
  return new Date(now.getTime() + lookaheadDays * MS_PER_DAY)
}

function parseInstant(iso: string): Date {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) throw new Error('invalid instant')
  return date
}

function offsetFromGmtLabel(label: string): string {
  if (label === 'GMT' || label === 'UTC') return '+00:00'
  const match = /^GMT([+-])(\d{1,2})(?::?(\d{2}))?$/.exec(label)
  if (!match) throw new Error('invalid offset')
  return `${match[1]}${match[2].padStart(2, '0')}:${match[3] ?? '00'}`
}

export function formatIsoWithOffset(date: Date, timeZone: string): string {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23',
      timeZoneName: 'longOffset',
    })
      .formatToParts(date)
      .map((part) => [part.type, part.value]),
  )
  const offset = offsetFromGmtLabel(parts.timeZoneName)
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}${offset}`
}

function overlapsHorizon(start: Date, end: Date | null, now: Date, horizon: Date): boolean {
  if (!(start.getTime() < horizon.getTime())) return false
  if (end === null) return start.getTime() >= now.getTime()
  return end.getTime() > now.getTime()
}

export function toDeviceSchedule(args: {
  now: Date
  settings: Settings
  rows: EventRow[]
}): DeviceSchedule {
  const horizon = horizonEnd(args.now, args.settings.lookaheadDays)
  const events = args.rows
    .map((row) => {
      const start = parseInstant(row.startAt)
      const end = row.endAt === null ? null : parseInstant(row.endAt)
      return { row, start, end }
    })
    .filter(({ start, end }) => overlapsHorizon(start, end, args.now, horizon))
    .sort((a, b) => a.start.getTime() - b.start.getTime())
    .map(({ row, start, end }) => ({
      id: row.id,
      title: row.title,
      startAt: formatIsoWithOffset(start, args.settings.timezone),
      endAt: end ? formatIsoWithOffset(end, args.settings.timezone) : null,
      allDay: row.allDay === 1 || row.allDay === true,
    }))
  return {
    serverTime: formatIsoWithOffset(args.now, args.settings.timezone),
    timezone: args.settings.timezone,
    reminderMinutes: args.settings.reminderMinutes,
    showNextEvents: args.settings.showNextEvents,
    events,
  }
}

export function unavailable(): Response {
  return Response.json({ error: 'unavailable' }, { status: 503 })
}

export async function loadDeviceSchedule(db: D1Database, now: Date): Promise<DeviceSchedule> {
  const settings = await getOrSeedSettings(db)
  const { results } = await db.prepare(SELECT_EVENTS).all<EventRow>()
  return toDeviceSchedule({ now, settings, rows: results ?? [] })
}
