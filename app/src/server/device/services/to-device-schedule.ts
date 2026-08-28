import { selectParsedEventsInHorizon } from '@/shared/events/horizon'
import { toUnixSeconds } from '@/shared/common/instant'
import type { Settings } from '@/shared/settings/types'
import type { DeviceEvent, DeviceEventRow, DeviceSchedule } from '@/server/device/types'

export function toDeviceSchedule(args: {
  now: Date
  settings: Settings
  rows: DeviceEventRow[]
}): DeviceSchedule {
  const selected = selectParsedEventsInHorizon(args.rows, {
    now: args.now,
    lookaheadDays: args.settings.lookaheadDays,
    showNextEvents: args.settings.showNextEvents,
  })
  const events: DeviceEvent[] = selected.map(({ event: row, start, end }) => ({
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
