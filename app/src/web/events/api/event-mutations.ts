import { mutationOptions } from '@tanstack/react-query'
import { parseEventsJson, type EventWrite } from '@/shared/events/types'
import { eventsQueryKey } from '@/web/events/api/events-query'

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json()
  } catch {
    return null
  }
}

function errorMessage(body: unknown, status: number): string {
  if (body && typeof body === 'object' && 'error' in body && typeof body.error === 'string') {
    return body.error
  }
  return `http ${status}`
}

export function createEventMutationOptions() {
  return mutationOptions({
    mutationFn: async (write: EventWrite) => {
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
    },
    meta: { invalidate: eventsQueryKey },
  })
}

export function updateEventMutationOptions() {
  return mutationOptions({
    mutationFn: async ({ id, write }: { id: string; write: EventWrite }) => {
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
    },
    meta: { invalidate: eventsQueryKey },
  })
}

export function deleteEventMutationOptions() {
  return mutationOptions({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/events/${id}`, { method: 'DELETE' })
      if (response.status === 204) return
      const body = await readJson(response)
      throw new Error(errorMessage(body, response.status))
    },
    meta: { invalidate: eventsQueryKey },
  })
}
