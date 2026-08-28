import { expect, test } from 'vitest'
import { SETTINGS_DEFAULTS } from '@/shared/settings/types'
import { FIXTURE_GOOGLE_ITEMS, FIXTURE_NOW, TOKEN_INVALID_GRANT, TOKEN_OK } from '@/server/sync/sync.fixtures'
import {
  googleConnectionTestFromOutcome,
  testGoogleConnectionUseCase,
} from '@/server/sync/use-cases/test-google-connection'

const SECRETS = {
  clientId: 'client.apps.googleusercontent.com',
  clientSecret: 'secret',
  refreshToken: 'refresh-token',
}

function googleFetch(opts: {
  tokenStatus?: number
  tokenBody?: unknown
  pages: { status?: number; body: unknown }[]
}): typeof fetch {
  const pages = [...opts.pages]
  return async (input) => {
    const raw = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
    const url = new URL(raw)
    if (url.origin === 'https://oauth2.googleapis.com' && url.pathname === '/token') {
      return Response.json(opts.tokenBody ?? TOKEN_OK, { status: opts.tokenStatus ?? 200 })
    }
    if (url.pathname === '/calendar/v3/calendars/primary/events') {
      const page = pages.shift() ?? { body: { items: [] } }
      return Response.json(page.body, { status: page.status ?? 200 })
    }
    return new Response('unexpected', { status: 404 })
  }
}

test('googleConnectionTestFromOutcome maps sync outcomes to UI messages', () => {
  expect(googleConnectionTestFromOutcome({ kind: 'ok', upserted: 3, deleted: 0 })).toEqual({
    ok: true,
    message: 'Conexão OK. 3 Events sincronizados no horizonte.',
    eventCount: 3,
  })
  expect(googleConnectionTestFromOutcome({ kind: 'ok', upserted: 0, deleted: 0 }).message).toMatch(
    /nenhum Event/,
  )
  expect(googleConnectionTestFromOutcome({ kind: 'invalid_grant' }).ok).toBe(false)
  expect(googleConnectionTestFromOutcome({ kind: 'skipped', reason: 'missing_secrets' }).message).toMatch(
    /Credenciais Google/,
  )
  expect(googleConnectionTestFromOutcome({ kind: 'error', message: 'token 401' }).message).toMatch(
    /incorretos/,
  )
})

test('testGoogleConnectionUseCase checks token and list without persisting', async () => {
  const ok = await testGoogleConnectionUseCase({
    settings: { ...SETTINGS_DEFAULTS },
    secrets: SECRETS,
    fetch: googleFetch({ pages: [{ body: { items: FIXTURE_GOOGLE_ITEMS } }] }),
    now: FIXTURE_NOW,
  })
  expect(ok.ok).toBe(true)
  expect(ok.eventCount).toBe(3)

  const bad = await testGoogleConnectionUseCase({
    settings: { ...SETTINGS_DEFAULTS },
    secrets: SECRETS,
    fetch: googleFetch({ tokenBody: TOKEN_INVALID_GRANT, tokenStatus: 400, pages: [] }),
    now: FIXTURE_NOW,
  })
  expect(bad.ok).toBe(false)
  expect(bad.message).toMatch(/Refresh token/)

  const missing = await testGoogleConnectionUseCase({
    settings: { ...SETTINGS_DEFAULTS },
    secrets: null,
    fetch: googleFetch({ pages: [] }),
    now: FIXTURE_NOW,
  })
  expect(missing.ok).toBe(false)
})
