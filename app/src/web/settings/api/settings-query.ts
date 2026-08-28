import { queryOptions } from '@tanstack/react-query'
import { parseSettings, type Settings } from '@/shared/settings/types'

export const settingsQueryKey = ['settings'] as const

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

export function settingsQueryOptions() {
  return queryOptions({
    queryKey: settingsQueryKey,
    queryFn: async (): Promise<Settings> => {
      const response = await fetch('/api/settings')
      const body = await readJson(response)
      if (!response.ok) throw new Error(errorMessage(body, response.status))
      const parsed = parseSettings(body)
      if (!parsed.success) throw new Error('invalid settings')
      return parsed.data
    },
  })
}

export function saveSettingsMutationOptions() {
  return {
    mutationFn: async (settings: Settings): Promise<Settings> => {
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
    },
    meta: { invalidate: settingsQueryKey },
  }
}
