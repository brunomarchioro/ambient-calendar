import { parseGoogleAccountsResponse, type GoogleAccountPublic } from '@/shared/google/types'

export const googleAccountsQueryKey = ['google', 'accounts'] as const

export function googleAccountsQueryOptions() {
  return {
    queryKey: googleAccountsQueryKey,
    queryFn: async (): Promise<GoogleAccountPublic[]> => {
      const response = await fetch('/api/google/accounts')
      if (!response.ok) throw new Error(`http ${response.status}`)
      const body = await response.json()
      const parsed = parseGoogleAccountsResponse(body)
      if (!parsed.success) throw new Error('invalid response')
      return parsed.data.accounts
    },
  }
}
