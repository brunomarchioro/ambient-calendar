import type { Settings } from '@/shared/settings/types'
import { decryptSecret } from '@/server/google/infra/token-crypto'
import { fetchCalendarEvents } from '@/server/google/infra/google-calendar-api'
import { refreshAccessToken, type OAuthClientConfig } from '@/server/google/infra/google-oauth'
import { updateGoogleAccountStatus } from '@/server/google/repository/google-queries'
import { mapGoogleItem } from '@/server/sync/services/map-google-item'
import type { Horizon, MirrorStore, SyncOutcome, SyncTarget } from '@/server/sync/types'
import { horizonFrom } from '@/server/sync/types'

type SyncLog = { error: (...args: unknown[]) => void }

async function persistScope(
  store: MirrorStore,
  target: Pick<SyncTarget, 'googleAccountId' | 'googleCalendarId'>,
  items: unknown[],
  timezone: string,
  now: Date,
  newId: () => string,
): Promise<{ upserted: number; deleted: number }> {
  const scope = {
    googleAccountId: target.googleAccountId,
    googleCalendarId: target.googleCalendarId,
  }
  const mapped = items.flatMap((item) => {
    const event = mapGoogleItem(item, timezone)
    return event ? [event] : []
  })
  const nowIso = now.toISOString()
  for (const event of mapped) {
    await store.upsertGoogle(scope, event, nowIso, newId)
  }
  const deleted = await store.deleteGoogleNotIn(
    scope,
    mapped.map((event) => event.externalId),
  )
  return { upserted: mapped.length, deleted }
}

async function syncTarget(input: {
  target: SyncTarget
  oauth: OAuthClientConfig
  horizon: Horizon
  store: MirrorStore
  now: Date
  fetchImpl: typeof fetch
  log: SyncLog
  db: D1Database
  newId: () => string
}): Promise<
  | { kind: 'ok'; upserted: number; deleted: number }
  | { kind: 'invalid_grant' }
  | { kind: 'error'; message: string }
> {
  let refreshToken: string
  try {
    refreshToken = await decryptSecret(input.target.refreshTokenEnc, input.oauth.encryptionKey)
  } catch (err) {
    input.log.error('google_sync: decrypt', err)
    return { kind: 'error', message: 'decrypt' }
  }
  const token = await refreshAccessToken({
    clientId: input.oauth.clientId,
    clientSecret: input.oauth.clientSecret,
    refreshToken,
    fetchImpl: input.fetchImpl,
  })
  if (token.ok === false) {
    if (token.kind === 'invalid_grant') {
      try {
        await updateGoogleAccountStatus(
          input.db,
          input.target.googleAccountId,
          'needs_reconnect',
          input.now.toISOString(),
        )
      } catch (err) {
        input.log.error('google_sync: account_status', err)
      }
      return { kind: 'invalid_grant' }
    }
    input.log.error('google_sync: token_error', token.message)
    return { kind: 'error', message: token.message }
  }
  let items: unknown[]
  try {
    items = await fetchCalendarEvents({
      accessToken: token.accessToken,
      calendarId: input.target.googleCalendarId,
      timeMin: input.horizon.timeMin,
      timeMax: input.horizon.timeMax,
      timeZone: input.horizon.timeZone,
      fetchImpl: input.fetchImpl,
    })
  } catch (err) {
    input.log.error('google_sync: list', input.target.googleCalendarId, err)
    return { kind: 'error', message: String(err) }
  }
  const result = await persistScope(
    input.store,
    input.target,
    items,
    input.horizon.timeZone,
    input.now,
    input.newId,
  )
  return { kind: 'ok', ...result }
}

export async function runScheduledSyncUseCase(input: {
  settings: Settings
  oauth: OAuthClientConfig | null
  targets: SyncTarget[]
  fetch: typeof fetch
  store: MirrorStore
  db: D1Database
  now: Date
  log: SyncLog
  items?: unknown[]
  fixtureScope?: { googleAccountId: string; googleCalendarId: string }
  newId?: () => string
}): Promise<SyncOutcome> {
  const newId = input.newId ?? (() => crypto.randomUUID())
  const horizon = horizonFrom(input.now, input.settings.lookaheadDays, input.settings.timezone)

  if (input.items && input.fixtureScope) {
    const result = await persistScope(
      input.store,
      input.fixtureScope,
      input.items,
      input.settings.timezone,
      input.now,
      newId,
    )
    return { kind: 'ok', ...result }
  }

  if (!input.oauth) {
    input.log.error('google_sync: missing_oauth_config')
    return { kind: 'skipped', reason: 'missing_oauth_config' }
  }
  if (input.targets.length === 0) {
    return { kind: 'skipped', reason: 'no_accounts' }
  }

  let upserted = 0
  let deleted = 0
  const errors: string[] = []
  let anyOk = false

  for (const target of input.targets) {
    const outcome = await syncTarget({
      target,
      oauth: input.oauth,
      horizon,
      store: input.store,
      now: input.now,
      fetchImpl: input.fetch,
      log: input.log,
      db: input.db,
      newId,
    })
    if (outcome.kind === 'ok') {
      anyOk = true
      upserted += outcome.upserted
      deleted += outcome.deleted
      continue
    }
    if (outcome.kind === 'invalid_grant') {
      errors.push(`${target.email}: reconectar conta`)
      continue
    }
    errors.push(`${target.email}/${target.googleCalendarId}: ${outcome.message}`)
  }

  if (!anyOk && errors.length > 0) {
    return { kind: 'error', message: errors.join('; ') }
  }
  if (errors.length > 0) {
    return { kind: 'partial', upserted, deleted, errors }
  }
  return { kind: 'ok', upserted, deleted }
}
