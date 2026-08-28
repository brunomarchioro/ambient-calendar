/** Device schedule payload: unix seconds + server-side truncation to showNextEvents. */
export type DeviceEvent = {
  id: string
  title: string
  startUnix: number
  endUnix: number | null
  allDay: boolean
}

export type DeviceSchedule = {
  serverUnix: number
  timezone: string
  reminderMinutes: number
  showNextEvents: number
  events: DeviceEvent[]
}

export type DeviceEventRow = {
  id: string
  title: string
  startAt: string
  endAt: string | null
  allDay: boolean
}
