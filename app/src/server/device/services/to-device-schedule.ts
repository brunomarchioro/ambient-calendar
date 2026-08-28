import { toUnixSeconds } from '@/shared/common/instant'
import type { Settings } from '@/shared/settings/types'
import type { DeviceEvent, DeviceEventRow, DeviceSchedule } from '@/server/device/types'

const MS_PER_DAY = 86_400_000

export function horizonEnd(now: Date, lookaheadDays: number): Date {
  return new Date(now.getTime() + lookaheadDays * MS_PER_DAY)
}

function parseInstant(iso: string): Date {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) throw new Error('invalid instant')
  return date
}

function overlapsHorizon(start: Date, end: Date | null, now: Date, horizon: Date): boolean {
  if (!(start.getTime() < horizon.getTime())) return false
  if (end === null) return start.getTime() >= now.getTime()
  return end.getTime() > now.getTime()
}

export function toDeviceSchedule(args: {
  now: Date
  settings: Settings
  rows: DeviceEventRow[]
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
    .slice(0, args.settings.showNextEvents)
    .map(({ row, start, end }) => ({
      id: row.id,
      title: row.title,
      startUnix: toUnixSeconds(start),
      endUnix: end ? toUnixSeconds(end) : null,
      allDay: row.allDay,
    }))
  return {
    serverUnix: toUnixSeconds(args.now),
    timezone: args.settings.timezone,
    reminderMinutes: args.settings.reminderMinutes,
    showNextEvents: args.settings.showNextEvents,
    events,
  }
}

export function unavailable(): Response {
  return Response.json({ error: 'unavailable' }, { status: 503 })
}
