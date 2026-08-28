export type GoogleMirrorScope = {
  googleAccountId: string
  googleCalendarId: string
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
  googleAccountId: string | null
  googleCalendarId: string | null
  title: string
  startAt: string
  endAt: string | null
  allDay: boolean
  timezone: string
  createdAt: string
  updatedAt: string
}

export type Horizon = {
  timeMin: string
  timeMax: string
  timeZone: string
}

export type SyncTarget = {
  googleAccountId: string
  googleCalendarId: string
  refreshTokenEnc: string
  email: string
}

export type SyncOutcome =
  | { kind: 'ok'; upserted: number; deleted: number }
  | { kind: 'partial'; upserted: number; deleted: number; errors: string[] }
  | { kind: 'skipped'; reason: 'no_accounts' | 'missing_oauth_config' }
  | { kind: 'error'; message: string }

export type MirrorStore = {
  upsertGoogle(
    scope: GoogleMirrorScope,
    event: MappedEvent,
    nowIso: string,
    newId: () => string,
  ): Promise<void>
  deleteGoogleNotIn(scope: GoogleMirrorScope, keepExternalIds: readonly string[]): Promise<number>
}

import { horizonEnd } from '@/shared/events/horizon'

export function horizonFrom(now: Date, lookaheadDays: number, timeZone: string): Horizon {
  return {
    timeMin: now.toISOString(),
    timeMax: horizonEnd(now, lookaheadDays).toISOString(),
    timeZone,
  }
}
