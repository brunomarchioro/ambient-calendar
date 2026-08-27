import { readFileSync } from 'node:fs'
import { expect, test } from 'vitest'
import { SETTINGS_DEFAULTS, type Settings } from '@app/domain/settings'
import {
  FIXTURE_ALLDAY,
  FIXTURE_CANCELLED,
  FIXTURE_GOOGLE_ITEMS,
  FIXTURE_INSTANCE,
  FIXTURE_NOW,
  FIXTURE_TIMED,
  TOKEN_INVALID_GRANT,
  TOKEN_OK,
} from '@app/domain/sync.fixtures'
import {
  horizonFrom,
  mapGoogleItem,
  memoryStore,
  readGoogleSecrets,
  runScheduledSync,
} from '@app/domain/sync'

const SECRETS = {
  clientId: 'client.apps.googleusercontent.com',
  clientSecret: 'secret',
  refreshToken: 'refresh-token',
}

const MANUAL_ROW = {
  id: 'manual-1',
  source: 'manual' as const,
  externalId: null,
  title: 'Comprar pão',
  startAt: '2026-08-27T20:00:00-03:00',
  endAt: null,
  allDay: false,
  timezone: 'America/Sao_Paulo',
  createdAt: '2026-08-26T00:00:00.000Z',
  updatedAt: '2026-08-26T00:00:00.000Z',
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
      const method = init?.method ?? 'GET'
      expect(method).toBe('POST')
      return Response.json(opts.tokenBody ?? TOKEN_OK, { status: opts.tokenStatus ?? 200 })
    }
    if (url.pathname === '/calendar/v3/calendars/primary/events') {
      const page = pages.shift() ?? { body: { items: [] } }
      return Response.json(page.body, { status: page.status ?? 200 })
    }
    return new Response('unexpected', { status: 404 })
  }
}

async function syncWith(opts: {
  fetch: typeof fetch
  store?: ReturnType<typeof memoryStore>
  secrets?: typeof SECRETS | null
  items?: unknown[]
  settings?: Settings
  now?: Date
}) {
  const log = silentLog()
  const store = opts.store ?? memoryStore([MANUAL_ROW])
  const outcome = await runScheduledSync({
    settings: opts.settings ?? { ...SETTINGS_DEFAULTS },
    secrets: opts.secrets === undefined ? SECRETS : opts.secrets,
    fetch: opts.fetch,
    store,
    now: opts.now ?? FIXTURE_NOW,
    log,
    items: opts.items,
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
  expect(list?.searchParams.get('timeMin')).toBe('2026-08-27T17:00:00.000Z')
  expect(list?.searchParams.get('timeMax')).toBe('2026-09-03T17:00:00.000Z')
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

test('second sync of the same ids stays one row each', async () => {
  const store = memoryStore([MANUAL_ROW])
  const fetch = googleFetch({ pages: [{ body: { items: [FIXTURE_TIMED] } }] })
  await syncWith({ fetch, store })
  const fetchAgain = googleFetch({ pages: [{ body: { items: [FIXTURE_TIMED] } }] })
  const { outcome } = await syncWith({ fetch: fetchAgain, store })
  expect(outcome).toEqual({ kind: 'ok', upserted: 1, deleted: 0 })
  expect(store.rows.filter((r) => r.externalId === 'google-timed-1')).toHaveLength(1)
})

test('deletes google rows absent from the list and keeps manual', async () => {
  const store = memoryStore([
    MANUAL_ROW,
    {
      id: 'old-google',
      source: 'google',
      externalId: 'stale-id',
      title: 'Stale',
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
  expect(store.rows.map((r) => r.externalId).sort()).toEqual(['google-timed-1', null])
})

test('invalid_grant is ops-logged and does not wipe D1', async () => {
  const store = memoryStore([
    MANUAL_ROW,
    {
      id: 'keep-google',
      source: 'google',
      externalId: 'keep-me',
      title: 'Keep',
      startAt: '2026-08-27T10:00:00-03:00',
      endAt: '2026-08-27T11:00:00-03:00',
      allDay: false,
      timezone: 'America/Sao_Paulo',
      createdAt: '2026-08-20T00:00:00.000Z',
      updatedAt: '2026-08-20T00:00:00.000Z',
    },
  ])
  const { fetch, urls } = captureFetch(
    googleFetch({ tokenStatus: 400, tokenBody: TOKEN_INVALID_GRANT, pages: [] }),
  )
  const { outcome, log } = await syncWith({ fetch, store })
  expect(outcome).toEqual({ kind: 'invalid_grant' })
  expect(log.errors.some((line) => line.includes('invalid_grant'))).toBe(true)
  expect(urls.some((u) => u.pathname.includes('/calendars/'))).toBe(false)
  expect(store.rows.map((r) => r.id).sort()).toEqual(['keep-google', 'manual-1'])
})

test('list HTTP failure does not wipe D1', async () => {
  const store = memoryStore([
    {
      id: 'keep-google',
      source: 'google',
      externalId: 'keep-me',
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
    fetch: googleFetch({ pages: [{ status: 500, body: { error: 'backend' } }] }),
    store,
    secrets: SECRETS,
  })
  expect(outcome.kind).toBe('error')
  expect(store.rows).toHaveLength(1)
})

test('paginates until nextPageToken is gone', async () => {
  const { fetch, urls } = captureFetch(
    googleFetch({
      pages: [
        { body: { items: [FIXTURE_TIMED], nextPageToken: 'page-2' } },
        { body: { items: [FIXTURE_ALLDAY] } },
      ],
    }),
  )
  const { outcome } = await syncWith({ fetch })
  expect(outcome).toEqual({ kind: 'ok', upserted: 2, deleted: 0 })
  const listCalls = urls.filter((u) => u.pathname.endsWith('/calendars/primary/events'))
  expect(listCalls).toHaveLength(2)
  expect(listCalls[1]?.searchParams.get('pageToken')).toBe('page-2')
})

test('missing secrets skip without wiping; injected items upsert without Google HTTP', async () => {
  const skipStore = memoryStore([MANUAL_ROW])
  const skipped = await syncWith({
    fetch: googleFetch({ pages: [] }),
    store: skipStore,
    secrets: null,
  })
  expect(skipped.outcome).toEqual({ kind: 'skipped', reason: 'missing_secrets' })
  expect(skipStore.rows).toEqual([MANUAL_ROW])

  const { fetch, urls } = captureFetch(googleFetch({ pages: [] }))
  const fixtureStore = memoryStore([MANUAL_ROW])
  const { outcome } = await syncWith({
    fetch,
    store: fixtureStore,
    secrets: null,
    items: FIXTURE_GOOGLE_ITEMS,
  })
  expect(outcome.kind).toBe('ok')
  expect(urls).toHaveLength(0)
  expect(fixtureStore.rows.some((r) => r.externalId === 'google-timed-1')).toBe(true)
  expect(fixtureStore.rows.some((r) => r.id === 'manual-1')).toBe(true)
})

test('readGoogleSecrets requires all three values', () => {
  expect(readGoogleSecrets({})).toBeNull()
  expect(readGoogleSecrets({ GOOGLE_CLIENT_ID: 'a' })).toBeNull()
  expect(
    readGoogleSecrets({
      GOOGLE_CLIENT_ID: 'a',
      GOOGLE_CLIENT_SECRET: 'b',
      GOOGLE_REFRESH_TOKEN: 'c',
    }),
  ).toEqual({ clientId: 'a', clientSecret: 'b', refreshToken: 'c' })
})

test('wrangler cron remains */15', () => {
  const text = readFileSync(new URL('../../../wrangler.jsonc', import.meta.url), 'utf8')
  expect(text).toMatch(/"crons":\s*\[\s*"\*\/15 \* \* \* \*"\s*\]/)
})

test('50-event fixture stays under 10s wall', async () => {
  const items = Array.from({ length: 50 }, (_, i) => ({
    ...FIXTURE_TIMED,
    id: `google-load-${i}`,
    summary: `Event ${i}`,
  }))
  const started = performance.now()
  const { outcome } = await syncWith({
    fetch: googleFetch({ pages: [{ body: { items } }] }),
    store: memoryStore(),
  })
  const elapsed = performance.now() - started
  expect(outcome.kind).toBe('ok')
  expect(elapsed).toBeLessThan(10_000)
})
