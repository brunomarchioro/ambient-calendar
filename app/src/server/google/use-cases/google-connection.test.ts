import { expect, test } from 'vitest'
import { SETTINGS_DEFAULTS } from '@/shared/settings/types'
import { FIXTURE_GOOGLE_ITEMS, FIXTURE_NOW, TOKEN_OK } from '@/server/sync/sync.fixtures'
import { encryptSecret } from '@/server/google/infra/token-crypto'
import { memoryStore } from '@/server/sync/services/memory-store'
import { runScheduledSyncUseCase } from '@/server/sync/use-cases/run-scheduled-sync'

const TEST_KEY = btoa(String.fromCharCode(...new Uint8Array(32).fill(3)))

const OAUTH = {
  clientId: 'client.apps.googleusercontent.com',
  clientSecret: 'secret',
  encryptionKey: TEST_KEY,
}

function googleFetch(pages: { body: unknown }[]): typeof fetch {
  const queue = [...pages]
  return async (input) => {
    const raw = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
    const url = new URL(raw)
    if (url.origin === 'https://oauth2.googleapis.com' && url.pathname === '/token') {
      return Response.json(TOKEN_OK)
    }
    if (url.pathname.includes('/calendar/v3/calendars/') && url.pathname.endsWith('/events')) {
      const page = queue.shift() ?? { body: { items: [] } }
      return Response.json(page.body)
    }
    return new Response('unexpected', { status: 404 })
  }
}

test('multi-calendar sync upserts events for enabled target', async () => {
  const refreshTokenEnc = await encryptSecret('refresh', TEST_KEY)
  const outcome = await runScheduledSyncUseCase({
    settings: { ...SETTINGS_DEFAULTS },
    oauth: OAUTH,
    targets: [
      {
        googleAccountId: 'acc-1',
        googleCalendarId: 'primary',
        refreshTokenEnc,
        email: 'user@gmail.com',
      },
    ],
    fetch: googleFetch([{ body: { items: FIXTURE_GOOGLE_ITEMS } }]),
    store: memoryStore(),
    db: {} as D1Database,
    now: FIXTURE_NOW,
    log: { error: () => {} },
  })
  expect(outcome).toEqual({ kind: 'ok', upserted: 3, deleted: 0 })
})
