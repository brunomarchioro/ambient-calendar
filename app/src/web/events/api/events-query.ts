import { queryOptions } from '@tanstack/react-query'
import { parseEventsJson, type EventPublic } from '@/shared/events/types'

export const eventsQueryKey = ['events'] as const

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

export function eventsQueryOptions() {
  return queryOptions({
    queryKey: eventsQueryKey,
    queryFn: async (): Promise<EventPublic[]> => {
      const response = await fetch('/api/events')
      const body = await readJson(response)
      if (!response.ok) throw new Error(errorMessage(body, response.status))
      const events = parseEventsJson(body)
      if (!events) throw new Error('invalid events')
      return events
    },
  })
}
