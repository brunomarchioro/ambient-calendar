import { readFileSync } from 'node:fs'
import { expect, test } from 'vitest'
import { SETTINGS_DEFAULTS, type Settings } from '@/shared/settings/types'
import { encryptSecret } from '@/server/google/infra/token-crypto'
import {
  FIXTURE_ALLDAY,
  FIXTURE_CANCELLED,
  FIXTURE_GOOGLE_ITEMS,
  FIXTURE_INSTANCE,
  FIXTURE_NOW,
  FIXTURE_TIMED,
  TOKEN_INVALID_GRANT,
  TOKEN_OK,
} from '@/server/sync/sync.fixtures'
import { horizonFrom } from '@/server/sync/types'
import { mapGoogleItem } from '@/server/sync/services/map-google-item'
import {
  FIXTURE_ACCOUNT_ID,
  FIXTURE_CALENDAR_ID,
  fixtureScope,
  memoryStore,
} from '@/server/sync/services/memory-store'
import { runScheduledSyncUseCase } from '@/server/sync/use-cases/run-scheduled-sync'

const TEST_KEY = btoa(String.fromCharCode(...new Uint8Array(32).fill(7)))

const OAUTH = {
  clientId: 'client.apps.googleusercontent.com',
  clientSecret: 'secret',
  encryptionKey: TEST_KEY,
}

const MANUAL_ROW = {
  id: 'manual-1',
  source: 'manual' as const,
  externalId: null,
  googleAccountId: null,
  googleCalendarId: null,
  title: 'Comprar pão',
  startAt: '2026-08-27T20:00:00-03:00',
  endAt: null,
  allDay: false,
  timezone: 'America/Sao_Paulo',
  createdAt: '2026-08-26T00:00:00.000Z',
  updatedAt: '2026-08-26T00:00:00.000Z',
}

const SCOPE = fixtureScope()

async function encryptedRefreshToken() {
  return encryptSecret('refresh-token', TEST_KEY)
}

function silentLog() {
  const errors: string[] = []
  return {
    errors,
    error: (...args: unknown[]) => {
      errors.push(args.map(String).join(' '))
    },
  }
}

function captureFetch(handler: typeof fetch): { fetch: typeof fetch; urls: URL[] } {
  const urls: URL[] = []
  const wrapped: typeof fetch = async (input, init) => {
    const raw = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
    urls.push(new URL(raw))
    return handler(input, init)
  }
  return { fetch: wrapped, urls }
}

function googleFetch(opts: {
  tokenStatus?: number
  tokenBody?: unknown
  pages: { status?: number; body: unknown }[]
}): typeof fetch {
  const pages = [...opts.pages]
  return async (input, init) => {
    const raw = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
    const url = new URL(raw)
    if (url.origin === 'https://oauth2.googleapis.com' && url.pathname === '/token') {
      expect(init?.method ?? 'GET').toBe('POST')
      return Response.json(opts.tokenBody ?? TOKEN_OK, { status: opts.tokenStatus ?? 200 })
    }
    if (url.pathname.includes('/calendar/v3/calendars/') && url.pathname.endsWith('/events')) {
      const page = pages.shift() ?? { body: { items: [] } }
      return Response.json(page.body, { status: page.status ?? 200 })
    }
    return new Response('unexpected', { status: 404 })
  }
}

async function syncWith(opts: {
  fetch: typeof fetch
  store?: ReturnType<typeof memoryStore>
  oauth?: typeof OAUTH | null
  targets?: Awaited<ReturnType<typeof encryptedRefreshToken>> extends string
    ? {
        googleAccountId: string
        googleCalendarId: string
        refreshTokenEnc: string
        email: string
      }[]
    : never
  items?: unknown[]
  settings?: Settings
  now?: Date
}) {
  const log = silentLog()
  const store = opts.store ?? memoryStore([MANUAL_ROW])
  const refreshTokenEnc = await encryptedRefreshToken()
  const targets =
    opts.targets ??
    ([
      {
        googleAccountId: FIXTURE_ACCOUNT_ID,
        googleCalendarId: FIXTURE_CALENDAR_ID,
        refreshTokenEnc,
        email: 'user@gmail.com',
      },
    ] as const)
  const outcome = await runScheduledSyncUseCase({
    settings: opts.settings ?? { ...SETTINGS_DEFAULTS },
    oauth: opts.oauth === undefined ? OAUTH : opts.oauth,
    targets: [...targets],
    fetch: opts.fetch,
    store,
    db: {} as D1Database,
    now: opts.now ?? FIXTURE_NOW,
    log,
    items: opts.items,
    fixtureScope: opts.items ? SCOPE : undefined,
  })
  return { outcome, store, log }
}

test('horizon is [now, now+lookaheadDays) in RFC3339', () => {
  expect(horizonFrom(FIXTURE_NOW, 7, 'America/Sao_Paulo')).toEqual({
    timeMin: '2026-08-27T17:00:00.000Z',
    timeMax: '2026-09-03T17:00:00.000Z',
    timeZone: 'America/Sao_Paulo',
  })
})

test('map timed item keeps offset ISO', () => {
  expect(mapGoogleItem(FIXTURE_TIMED, 'America/Sao_Paulo')).toEqual({
    externalId: 'google-timed-1',
    title: 'Reunião',
    startAt: '2026-08-27T14:00:00-03:00',
    endAt: '2026-08-27T15:00:00-03:00',
    allDay: false,
    timezone: 'America/Sao_Paulo',
  })
})

test('map private event uses Ocupado title', () => {
  expect(
    mapGoogleItem({ ...FIXTURE_TIMED, summary: '  ' }, 'America/Sao_Paulo')?.title,
  ).toBe('Ocupado')
})

test('map all-day item uses midnight in Settings timezone, exclusive end', () => {
  expect(mapGoogleItem(FIXTURE_ALLDAY, 'America/Sao_Paulo')).toEqual({
    externalId: 'google-allday-1',
    title: 'Feriado',
    startAt: '2026-08-28T00:00:00-03:00',
    endAt: '2026-08-29T00:00:00-03:00',
    allDay: true,
    timezone: 'America/Sao_Paulo',
  })
})

test('map skips cancelled and keeps instance id not iCalUID', () => {
  expect(mapGoogleItem(FIXTURE_CANCELLED, 'America/Sao_Paulo')).toBeNull()
  expect(mapGoogleItem(FIXTURE_INSTANCE, 'America/Sao_Paulo')?.externalId).toBe(
    'series_20260827T170000Z',
  )
})

test('events.list uses singleEvents, eventTypes=default, and Settings lookahead', async () => {
  const { fetch, urls } = captureFetch(
    googleFetch({ pages: [{ body: { items: FIXTURE_GOOGLE_ITEMS } }] }),
  )
  await syncWith({ fetch })
  const list = urls.find((u) => u.pathname.endsWith('/calendars/primary/events'))
  expect(list).toBeDefined()
  expect(list?.searchParams.get('singleEvents')).toBe('true')
  expect(list?.searchParams.get('eventTypes')).toBe('default')
  expect(list?.searchParams.get('orderBy')).toBe('startTime')
  expect(list?.searchParams.get('timeZone')).toBe('America/Sao_Paulo')
})

test('upserts fixture items by externalId and preserves manual', async () => {
  const { outcome, store } = await syncWith({
    fetch: googleFetch({ pages: [{ body: { items: FIXTURE_GOOGLE_ITEMS } }] }),
  })
  expect(outcome).toEqual({ kind: 'ok', upserted: 3, deleted: 0 })
  expect(store.rows.filter((r) => r.source === 'manual')).toEqual([MANUAL_ROW])
  expect(
    store.rows
      .filter((r) => r.source === 'google')
      .map((r) => r.externalId)
      .sort(),
  ).toEqual(['google-allday-1', 'google-timed-1', 'series_20260827T170000Z'])
})

test('delete-not-in is scoped per calendar', async () => {
  const store = memoryStore([
    MANUAL_ROW,
    {
      id: 'old-google',
      source: 'google',
      externalId: 'stale-id',
      googleAccountId: FIXTURE_ACCOUNT_ID,
      googleCalendarId: FIXTURE_CALENDAR_ID,
      title: 'Stale',
      startAt: '2026-08-27T10:00:00-03:00',
      endAt: '2026-08-27T11:00:00-03:00',
      allDay: false,
      timezone: 'America/Sao_Paulo',
      createdAt: '2026-08-20T00:00:00.000Z',
      updatedAt: '2026-08-20T00:00:00.000Z',
    },
    {
      id: 'other-cal',
      source: 'google',
      externalId: 'keep-other-cal',
      googleAccountId: FIXTURE_ACCOUNT_ID,
      googleCalendarId: 'other',
      title: 'Other',
      startAt: '2026-08-27T10:00:00-03:00',
      endAt: '2026-08-27T11:00:00-03:00',
      allDay: false,
      timezone: 'America/Sao_Paulo',
      createdAt: '2026-08-20T00:00:00.000Z',
      updatedAt: '2026-08-20T00:00:00.000Z',
    },
  ])
  const { outcome } = await syncWith({
    fetch: googleFetch({ pages: [{ body: { items: [FIXTURE_TIMED] } }] }),
    store,
  })
  expect(outcome).toEqual({ kind: 'ok', upserted: 1, deleted: 1 })
  expect(store.rows.some((r) => r.externalId === 'keep-other-cal')).toBe(true)
})

test('invalid_grant marks partial sync without wiping other rows', async () => {
  const refreshTokenEnc = await encryptedRefreshToken()
  const store = memoryStore([
    MANUAL_ROW,
    {
      id: 'keep-google',
      source: 'google',
      externalId: 'keep-me',
      googleAccountId: FIXTURE_ACCOUNT_ID,
      googleCalendarId: FIXTURE_CALENDAR_ID,
      title: 'Keep',
      startAt: '2026-08-27T10:00:00-03:00',
      endAt: '2026-08-27T11:00:00-03:00',
      allDay: false,
      timezone: 'America/Sao_Paulo',
      createdAt: '2026-08-20T00:00:00.000Z',
      updatedAt: '2026-08-20T00:00:00.000Z',
    },
  ])
  const { outcome } = await syncWith({
    fetch: googleFetch({ tokenStatus: 400, tokenBody: TOKEN_INVALID_GRANT, pages: [] }),
    store,
    targets: [
      {
        googleAccountId: FIXTURE_ACCOUNT_ID,
        googleCalendarId: FIXTURE_CALENDAR_ID,
        refreshTokenEnc,
        email: 'user@gmail.com',
      },
    ],
  })
  expect(outcome.kind).toBe('error')
  expect(store.rows.map((r) => r.id).sort()).toEqual(['keep-google', 'manual-1'])
})

test('missing oauth config skips without wiping; injected items upsert without Google HTTP', async () => {
  const skipStore = memoryStore([MANUAL_ROW])
  const skipped = await syncWith({
    fetch: googleFetch({ pages: [] }),
    store: skipStore,
    oauth: null,
    targets: [],
  })
  expect(skipped.outcome).toEqual({ kind: 'skipped', reason: 'missing_oauth_config' })
  expect(skipStore.rows).toEqual([MANUAL_ROW])

  const { fetch, urls } = captureFetch(googleFetch({ pages: [] }))
  const fixtureStore = memoryStore([MANUAL_ROW])
  const { outcome } = await syncWith({
    fetch,
    store: fixtureStore,
    oauth: null,
    targets: [],
    items: FIXTURE_GOOGLE_ITEMS,
  })
  expect(outcome.kind).toBe('ok')
  expect(urls).toHaveLength(0)
  expect(fixtureStore.rows.some((r) => r.externalId === 'google-timed-1')).toBe(true)
})

test('wrangler cron remains */15', () => {
  const text = readFileSync(new URL('../../../../wrangler.jsonc', import.meta.url), 'utf8')
  expect(text).toMatch(/"crons":\s*\[\s*"\*\/15 \* \* \* \*"\s*\]/)
})
