import { z } from 'zod'
import type { GoogleSecrets, Horizon, MirrorStore, SyncOutcome } from '@/server/sync/types'
import { horizonFrom } from '@/server/sync/types'
import { mapGoogleItem } from '@/server/sync/services/map-google-item'
import type { Settings } from '@/shared/settings/types'

type SyncLog = { error: (...args: unknown[]) => void }

const TOKEN_URL = 'https://oauth2.googleapis.com/token'
const EVENTS_URL = 'https://www.googleapis.com/calendar/v3/calendars/primary/events'
const MAX_PAGES = 20 // ponytail: 20 pages, raise if a 7-day primary paginates past that

const tokenOkSchema = z.object({ access_token: z.string().min(1) })
const tokenErrSchema = z.object({ error: z.string() })
const listSchema = z.object({
  items: z.array(z.unknown()).optional(),
  nextPageToken: z.string().optional(),
})

async function persistItems(
  store: MirrorStore,
  items: unknown[],
  timezone: string,
  now: Date,
  newId: () => string,
): Promise<Extract<SyncOutcome, { kind: 'ok' }>> {
  const mapped = items.flatMap((item) => {
    const event = mapGoogleItem(item, timezone)
    return event ? [event] : []
  })
  const nowIso = now.toISOString()
  for (const event of mapped) {
    await store.upsertGoogle(event, nowIso, newId)
  }
  const deleted = await store.deleteGoogleNotIn(mapped.map((event) => event.externalId))
  return { kind: 'ok', upserted: mapped.length, deleted }
}

async function refreshAccessToken(
  secrets: GoogleSecrets,
  fetchImpl: typeof fetch,
  log: SyncLog,
): Promise<{ kind: 'ok'; accessToken: string } | SyncOutcome> {
  let response: Response
  try {
    response = await fetchImpl(TOKEN_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: secrets.clientId,
        client_secret: secrets.clientSecret,
        refresh_token: secrets.refreshToken,
        grant_type: 'refresh_token',
      }),
    })
  } catch (err) {
    log.error('google_sync:', err)
    return { kind: 'error', message: String(err) }
  }
  const body: unknown = await response.json().catch(() => null)
  const err = tokenErrSchema.safeParse(body)
  if (err.success && err.data.error === 'invalid_grant') {
    log.error('google_sync: invalid_grant')
    return { kind: 'invalid_grant' }
  }
  const ok = tokenOkSchema.safeParse(body)
  if (!response.ok || !ok.success) {
    log.error('google_sync: token_error', response.status)
    return { kind: 'error', message: `token ${response.status}` }
  }
  return { kind: 'ok', accessToken: ok.data.access_token }
}

async function listPrimaryEvents(
  accessToken: string,
  horizon: Horizon,
  fetchImpl: typeof fetch,
  log: SyncLog,
): Promise<{ kind: 'ok'; items: unknown[] } | SyncOutcome> {
  const items: unknown[] = []
  let pageToken: string | undefined
  for (let page = 0; page < MAX_PAGES; page += 1) {
    const url = new URL(EVENTS_URL)
    url.searchParams.set('singleEvents', 'true')
    url.searchParams.set('orderBy', 'startTime')
    url.searchParams.set('eventTypes', 'default')
    url.searchParams.set('timeMin', horizon.timeMin)
    url.searchParams.set('timeMax', horizon.timeMax)
    url.searchParams.set('timeZone', horizon.timeZone)
    if (pageToken) url.searchParams.set('pageToken', pageToken)
    let response: Response
    try {
      response = await fetchImpl(url, {
        headers: { authorization: `Bearer ${accessToken}` },
      })
    } catch (err) {
      log.error('google_sync:', err)
      return { kind: 'error', message: String(err) }
    }
    if (!response.ok) {
      log.error('google_sync: list_error', response.status)
      return { kind: 'error', message: `list ${response.status}` }
    }
    const parsed = listSchema.safeParse(await response.json().catch(() => null))
    if (!parsed.success) {
      log.error('google_sync: list_shape')
      return { kind: 'error', message: 'list_shape' }
    }
    if (parsed.data.items) items.push(...parsed.data.items)
    pageToken = parsed.data.nextPageToken
    if (!pageToken) return { kind: 'ok', items }
  }
  log.error('google_sync: too many pages')
  return { kind: 'error', message: 'too many pages' }
}

export async function runScheduledSyncUseCase(input: {
  settings: Settings
  secrets: GoogleSecrets | null
  fetch: typeof fetch
  store: MirrorStore
  now: Date
  log: SyncLog
  items?: unknown[]
  newId?: () => string
}): Promise<SyncOutcome> {
  const newId = input.newId ?? (() => crypto.randomUUID())
  if (input.items) {
    return persistItems(input.store, input.items, input.settings.timezone, input.now, newId)
  }
  if (!input.secrets) {
    input.log.error('google_sync: missing_secrets')
    return { kind: 'skipped', reason: 'missing_secrets' }
  }
  const token = await refreshAccessToken(input.secrets, input.fetch, input.log)
  if (token.kind !== 'ok' || !('accessToken' in token)) return token
  const listed = await listPrimaryEvents(
    token.accessToken,
    horizonFrom(input.now, input.settings.lookaheadDays, input.settings.timezone),
    input.fetch,
    input.log,
  )
  if (listed.kind !== 'ok' || !('items' in listed)) return listed
  return persistItems(input.store, listed.items, input.settings.timezone, input.now, newId)
}
