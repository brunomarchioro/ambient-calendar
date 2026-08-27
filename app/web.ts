import {
  formatInTimeZone,
  instantFromWallClock,
  parseEventWrite,
  parseEventsJson,
  type Event,
  type EventWrite,
  type ManualEvent,
} from './event'
import { parseSettings, type Settings } from './settings'

export const eventsQueryKey = ['events'] as const
export const settingsQueryKey = ['settings'] as const

export type LembreteFormValues = {
  title: string
  allDay: boolean
  start: string
  end: string
}

function errorMessage(body: unknown, status: number): string {
  if (body && typeof body === 'object' && 'error' in body && typeof body.error === 'string') {
    return body.error
  }
  return `http ${status}`
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json()
  } catch {
    return null
  }
}

export async function fetchEvents(): Promise<Event[]> {
  const response = await fetch('/api/events')
  const body = await readJson(response)
  if (!response.ok) throw new Error(errorMessage(body, response.status))
  const events = parseEventsJson(body)
  if (!events) throw new Error('invalid events')
  return events
}

export async function createLembrete(write: EventWrite): Promise<Event> {
  const response = await fetch('/api/events', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(write),
  })
  const body = await readJson(response)
  if (!response.ok) throw new Error(errorMessage(body, response.status))
  const events = parseEventsJson([body])
  if (!events?.[0]) throw new Error('invalid event')
  return events[0]
}

export async function updateLembrete(id: string, write: EventWrite): Promise<Event> {
  const response = await fetch(`/api/events/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(write),
  })
  const body = await readJson(response)
  if (!response.ok) throw new Error(errorMessage(body, response.status))
  const events = parseEventsJson([body])
  if (!events?.[0]) throw new Error('invalid event')
  return events[0]
}

export async function deleteLembrete(id: string): Promise<void> {
  const response = await fetch(`/api/events/${id}`, { method: 'DELETE' })
  if (response.status === 204) return
  const body = await readJson(response)
  throw new Error(errorMessage(body, response.status))
}

export async function fetchSettings(): Promise<Settings> {
  const response = await fetch('/api/settings')
  const body = await readJson(response)
  if (!response.ok) throw new Error(errorMessage(body, response.status))
  const parsed = parseSettings(body)
  if (!parsed.success) throw new Error('invalid settings')
  return parsed.data
}

export async function saveSettings(settings: Settings): Promise<Settings> {
  const response = await fetch('/api/settings', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(settings),
  })
  const body = await readJson(response)
  if (!response.ok) throw new Error(errorMessage(body, response.status))
  const parsed = parseSettings(body)
  if (!parsed.success) throw new Error('invalid settings')
  return parsed.data
}

export function canMutateEvent(event: Event): event is ManualEvent {
  return event.source === 'manual'
}

export function upcomingEvents(events: Event[], now: Date, lookaheadDays: number): Event[] {
  const start = now.getTime()
  const horizon = start + lookaheadDays * 86_400_000
  return events.filter((event) => {
    const eventStart = Date.parse(event.startAt)
    const eventEnd = event.endAt ? Date.parse(event.endAt) : eventStart
    return eventEnd > start && eventStart < horizon
  })
}

export function toDatetimeLocal(iso: string, allDay: boolean): string {
  return allDay ? iso.slice(0, 10) : iso.slice(0, 16)
}

export function defaultLembreteStart(now: Date, timeZone: string): string {
  return toDatetimeLocal(formatInTimeZone(new Date(now.getTime() + 3_600_000), timeZone), false)
}

function wallForForm(value: string, allDay: boolean): string {
  if (allDay) return value.includes('T') ? value : `${value}T00:00`
  return value
}

export function lembreteFormToWrite(values: LembreteFormValues, timeZone: string): EventWrite {
  const startAt = formatInTimeZone(
    instantFromWallClock(wallForForm(values.start, values.allDay), timeZone),
    timeZone,
  )
  const endAt =
    values.end.trim() === ''
      ? null
      : formatInTimeZone(instantFromWallClock(wallForForm(values.end, values.allDay), timeZone), timeZone)
  return { title: values.title, startAt, endAt, allDay: values.allDay }
}

export function parseLembreteForm(values: LembreteFormValues, timeZone: string) {
  const write = lembreteFormToWrite(values, timeZone)
  return parseEventWrite(write)
}
