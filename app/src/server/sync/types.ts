import { formatGoogleDateTime, zonedMidnight } from '@/shared/common/instant'
import type { Settings } from '@/shared/settings/types'

export type GoogleSecrets = {
  clientId: string
  clientSecret: string
  refreshToken: string
}

export type Horizon = {
  timeMin: string
  timeMax: string
  timeZone: string
}

export type MappedEvent = {
  externalId: string
  title: string
  startAt: string
  endAt: string | null
  allDay: boolean
  timezone: string
}

export type SyncEventRow = {
  id: string
  source: 'google' | 'manual'
  externalId: string | null
  title: string
  startAt: string
  endAt: string | null
  allDay: boolean
  timezone: string
  createdAt: string
  updatedAt: string
}

export type SyncOutcome =
  | { kind: 'ok'; upserted: number; deleted: number }
  | { kind: 'invalid_grant' }
  | { kind: 'skipped'; reason: 'missing_secrets' }
  | { kind: 'error'; message: string }

export type MirrorStore = {
  listGoogleExternalIds(): Promise<string[]>
  upsertGoogle(event: MappedEvent, nowIso: string, newId: () => string): Promise<void>
  deleteGoogleNotIn(keepExternalIds: readonly string[]): Promise<number>
}

export function horizonFrom(now: Date, lookaheadDays: number, timeZone: string): Horizon {
  return {
    timeMin: now.toISOString(),
    timeMax: new Date(now.getTime() + lookaheadDays * 24 * 60 * 60 * 1000).toISOString(),
    timeZone,
  }
}

export function readGoogleSecrets(env: {
  GOOGLE_CLIENT_ID?: string
  GOOGLE_CLIENT_SECRET?: string
  GOOGLE_REFRESH_TOKEN?: string
}): GoogleSecrets | null {
  const clientId = env.GOOGLE_CLIENT_ID
  const clientSecret = env.GOOGLE_CLIENT_SECRET
  const refreshToken = env.GOOGLE_REFRESH_TOKEN
  if (!clientId || !clientSecret || !refreshToken) return null
  return { clientId, clientSecret, refreshToken }
}
