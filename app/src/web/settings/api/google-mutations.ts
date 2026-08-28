import { parseGoogleSyncResult, type GoogleSyncResult } from '@/shared/google/types'

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json()
  } catch {
    return null
  }
}

export function googleSyncMutationOptions() {
  return {
    mutationFn: async (): Promise<GoogleSyncResult> => {
      const response = await fetch('/api/google/sync', { method: 'POST' })
      const body = await readJson(response)
      if (!response.ok) {
        const message =
          body && typeof body === 'object' && 'error' in body && typeof body.error === 'string'
            ? body.error
            : `http ${response.status}`
        throw new Error(message)
      }
      const parsed = parseGoogleSyncResult(body)
      if (!parsed.success) throw new Error('invalid response')
      return parsed.data
    },
  }
}

export function disconnectGoogleAccountMutationOptions() {
  return {
    mutationFn: async (accountId: string): Promise<void> => {
      const response = await fetch(`/api/google/accounts/${accountId}/disconnect`, {
        method: 'POST',
      })
      if (!response.ok) throw new Error(`http ${response.status}`)
    },
  }
}

export function patchGoogleCalendarMutationOptions() {
  return {
    mutationFn: async (input: { id: string; enabled: boolean }): Promise<void> => {
      const response = await fetch(`/api/google/calendars/${input.id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ enabled: input.enabled }),
      })
      if (!response.ok) throw new Error(`http ${response.status}`)
    },
  }
}
