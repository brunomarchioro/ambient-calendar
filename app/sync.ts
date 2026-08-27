import { z } from 'zod'
import type { Settings } from './settings'

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

export type EventRow = {
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

type SyncLog = { error: (...args: unknown[]) => void }

const TOKEN_URL = 'https://oauth2.googleapis.com/token'
const EVENTS_URL = 'https://www.googleapis.com/calendar/v3/calendars/primary/events'
const MAX_PAGES = 20 // ponytail: 20 pages, raise if a 7-day primary paginates past that

const googleDateSchema = z.object({
  date: z.string().optional(),
  dateTime: z.string().optional(),
  timeZone: z.string().optional(),
})

const googleItemSchema = z.object({
  id: z.string().min(1),
  status: z.string().optional(),
  summary: z.string().optional(),
  start: googleDateSchema,
  end: googleDateSchema.optional(),
})

const tokenOkSchema = z.object({ access_token: z.string().min(1) })
const tokenErrSchema = z.object({ error: z.string() })
const listSchema = z.object({
  items: z.array(z.unknown()).optional(),
  nextPageToken: z.string().optional(),
})

export function horizonFrom(now: Date, lookaheadDays: number, timeZone: string): Horizon {
  return {
    timeMin: now.toISOString(),
    timeMax: new Date(now.getTime() + lookaheadDays * 24 * 60 * 60 * 1000).toISOString(),
    timeZone,
  }
}

function offsetFor(timeZone: string, instant: Date): string {
  const raw =
    new Intl.DateTimeFormat('en-US', { timeZone, timeZoneName: 'longOffset' })
      .formatToParts(instant)
      .find((part) => part.type === 'timeZoneName')?.value ?? 'GMT'
  if (raw === 'GMT' || raw === 'UTC') return '+00:00'
  const match = raw.match(/GMT([+-])(\d{1,2})(?::(\d{2}))?/)
  if (!match) return '+00:00'
  return `${match[1]}${match[2].padStart(2, '0')}:${match[3] ?? '00'}`
}

export function zonedMidnight(ymd: string, timeZone: string): string {
  return `${ymd}T00:00:00${offsetFor(timeZone, new Date(`${ymd}T12:00:00.000Z`))}`
}

function withOffset(dateTime: string, timeZone: string): string {
  if (/[zZ]$/.test(dateTime) || /[+-]\d{2}:\d{2}$/.test(dateTime)) return dateTime
  const probe = new Date(`${dateTime}Z`)
  if (Number.isNaN(probe.getTime())) return dateTime
  return `${dateTime}${offsetFor(timeZone, probe)}`
}

export function mapGoogleItem(item: unknown, timezone: string): MappedEvent | null {
  const parsed = googleItemSchema.safeParse(item)
  if (!parsed.success) return null
  const { id, status, summary, start, end } = parsed.data
  if (status === 'cancelled') return null
  const title = summary ?? ''
  if (start.date) {
    return {
      externalId: id,
      title,
      startAt: zonedMidnight(start.date, timezone),
      endAt: end?.date ? zonedMidnight(end.date, timezone) : null,
      allDay: true,
      timezone,
    }
  }
  if (start.dateTime) {
    const zone = start.timeZone ?? timezone
    return {
      externalId: id,
      title,
      startAt: withOffset(start.dateTime, zone),
      endAt: end?.dateTime ? withOffset(end.dateTime, end.timeZone ?? zone) : null,
      allDay: false,
      timezone,
    }
  }
  return null
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

export function memoryStore(seed: EventRow[] = []): MirrorStore & { rows: EventRow[] } {
  const rows = seed.map((row) => ({ ...row }))
  return {
    rows,
    async listGoogleExternalIds() {
      const ids: string[] = []
      for (const row of rows) {
        if (row.source === 'google' && row.externalId !== null) ids.push(row.externalId)
      }
      return ids
    },
    async upsertGoogle(event, nowIso, newId) {
      const existing = rows.find(
        (row) => row.source === 'google' && row.externalId === event.externalId,
      )
      if (existing) {
        existing.title = event.title
        existing.startAt = event.startAt
        existing.endAt = event.endAt
        existing.allDay = event.allDay
        existing.timezone = event.timezone
        existing.updatedAt = nowIso
        return
      }
      rows.push({
        id: newId(),
        source: 'google',
        externalId: event.externalId,
        title: event.title,
        startAt: event.startAt,
        endAt: event.endAt,
        allDay: event.allDay,
        timezone: event.timezone,
        createdAt: nowIso,
        updatedAt: nowIso,
      })
    },
    async deleteGoogleNotIn(keepExternalIds) {
      const keep = new Set(keepExternalIds)
      let deleted = 0
      for (let i = rows.length - 1; i >= 0; i -= 1) {
        const row = rows[i]
        if (row && row.source === 'google' && (row.externalId === null || !keep.has(row.externalId))) {
          rows.splice(i, 1)
          deleted += 1
        }
      }
      return deleted
    },
  }
}

const UPSERT_GOOGLE = `INSERT INTO Event (id, source, externalId, title, startAt, endAt, allDay, timezone, createdAt, updatedAt)
VALUES (?, 'google', ?, ?, ?, ?, ?, ?, ?, ?)
ON CONFLICT(externalId) DO UPDATE SET
  title = excluded.title,
  startAt = excluded.startAt,
  endAt = excluded.endAt,
  allDay = excluded.allDay,
  timezone = excluded.timezone,
  updatedAt = excluded.updatedAt`

export function d1Store(db: D1Database): MirrorStore {
  return {
    async listGoogleExternalIds() {
      const { results } = await db
        .prepare(`SELECT externalId FROM Event WHERE source = 'google' AND externalId IS NOT NULL`)
        .all<{ externalId: string }>()
      return results.map((row) => row.externalId)
    },
    async upsertGoogle(event, nowIso, newId) {
      await db
        .prepare(UPSERT_GOOGLE)
        .bind(
          newId(),
          event.externalId,
          event.title,
          event.startAt,
          event.endAt,
          event.allDay ? 1 : 0,
          event.timezone,
          nowIso,
          nowIso,
        )
        .run()
    },
    async deleteGoogleNotIn(keepExternalIds) {
      const existing = await this.listGoogleExternalIds()
      const keep = new Set(keepExternalIds)
      let deleted = 0
      for (const externalId of existing) {
        if (keep.has(externalId)) continue
        await db
          .prepare(`DELETE FROM Event WHERE source = 'google' AND externalId = ?`)
          .bind(externalId)
          .run()
        deleted += 1
      }
      return deleted
    },
  }
}

async function persistItems(
  store: MirrorStore,
  items: unknown[],
  timezone: string,
  now: Date,
  newId: () => string,
): Promise<Extract<SyncOutcome, { kind: 'ok' }>> {
  const mapped: MappedEvent[] = []
  for (const item of items) {
    const event = mapGoogleItem(item, timezone)
    if (event) mapped.push(event)
  }
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

export async function runScheduledSync(input: {
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
  if (token.kind !== 'ok') return token
  const listed = await listPrimaryEvents(
    token.accessToken,
    horizonFrom(input.now, input.settings.lookaheadDays, input.settings.timezone),
    input.fetch,
    input.log,
  )
  if (listed.kind !== 'ok') return listed
  return persistItems(input.store, listed.items, input.settings.timezone, input.now, newId)
}
