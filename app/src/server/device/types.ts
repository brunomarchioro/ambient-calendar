/** Device schedule payload: unix seconds; showNextEvents is for HMI list size only. */
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
  devicePin: string | null
  events: DeviceEvent[]
  tasks: DeviceTask[]
}

export type DeviceTask = { id: string; title: string; dueUnix: number | null }
export type DeviceTaskRow = { id: string; title: string; due: string | null }

export type DeviceEventRow = {
  id: string
  title: string
  startAt: string
  endAt: string | null
  allDay: boolean
}
