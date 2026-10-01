import { selectParsedEventsInHorizon } from '@/shared/events/horizon'
import { toUnixSeconds } from '@/shared/common/instant'
import type { Settings } from '@/shared/settings/types'
import type { DeviceEvent, DeviceEventRow, DeviceSchedule, DeviceTaskRow } from '@/server/device/types'
import { sanitizeDeviceTitle } from '@/server/device/services/device-title'

function localDay(date: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date)
  return `${parts.find((part) => part.type === 'year')?.value}-${parts.find((part) => part.type === 'month')?.value}-${parts.find((part) => part.type === 'day')?.value}`
}

function sortedTasks(tasks: DeviceTaskRow[], now: Date, timeZone: string): DeviceTaskRow[] {
  const today = localDay(now, timeZone)
  return [...tasks].sort((a, b) => {
    const rank = (task: DeviceTaskRow) => !task.due ? 3 : localDay(new Date(task.due), timeZone) < today ? 0 : localDay(new Date(task.due), timeZone) === today ? 1 : 2
    const byRank = rank(a) - rank(b)
    if (byRank) return byRank
    if (a.due && b.due && a.due !== b.due) return new Date(a.due).getTime() - new Date(b.due).getTime()
    return a.title.localeCompare(b.title) || a.id.localeCompare(b.id)
  })
}

export function toDeviceSchedule(args: { now: Date; settings: Settings; rows: DeviceEventRow[]; tasks?: DeviceTaskRow[] }): DeviceSchedule {
  const selected = selectParsedEventsInHorizon(args.rows, {
    now: args.now,
    lookaheadDays: args.settings.lookaheadDays,
  })
  const events: DeviceEvent[] = selected.map(({ event: row, start, end }) => ({
    id: row.id,
    title: sanitizeDeviceTitle(row.title),
    startUnix: toUnixSeconds(start),
    endUnix: end ? toUnixSeconds(end) : null,
    allDay: row.allDay,
  }))
  return {
    serverUnix: toUnixSeconds(args.now),
    timezone: args.settings.timezone,
    reminderMinutes: args.settings.reminderMinutes,
    showNextEvents: args.settings.showNextEvents,
    devicePin: args.settings.devicePin,
    events,
    tasks: sortedTasks(args.tasks ?? [], args.now, args.settings.timezone).slice(0, 20).map((task) => ({ id: task.id, title: sanitizeDeviceTitle(task.title), dueUnix: task.due ? toUnixSeconds(new Date(task.due)) : null })),
  }
}

export function unavailable(): Response {
  return Response.json({ error: 'unavailable' }, { status: 503 })
}
