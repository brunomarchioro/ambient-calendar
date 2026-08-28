import { parseGoogleConnectionTest, type GoogleConnectionTest } from '@/shared/sync/types'

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

export function testGoogleConnectionMutationOptions() {
  return {
    mutationFn: async (): Promise<GoogleConnectionTest> => {
      const response = await fetch('/api/settings/google-connection', { method: 'POST' })
      const body = await readJson(response)
      if (!response.ok) throw new Error(errorMessage(body, response.status))
      const parsed = parseGoogleConnectionTest(body)
      if (!parsed.success) throw new Error('invalid response')
      return parsed.data
    },
  }
}
