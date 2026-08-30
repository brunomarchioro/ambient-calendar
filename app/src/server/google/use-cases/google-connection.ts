import { httpFetch } from '@/server/common/infra/http-fetch'
import { MAX_GOOGLE_ACCOUNTS } from '@/shared/google/types'
import {
  buildOAuthAuthorizeUrl,
  exchangeAuthorizationCode,
  fetchGoogleUserEmail,
  readOAuthClientConfig,
  revokeRefreshToken,
  type OAuthClientConfig,
} from '@/server/google/infra/google-oauth'
import { encryptSecret, decryptSecret } from '@/server/google/infra/token-crypto'
import { fetchCalendarList } from '@/server/google/infra/google-calendar-api'
import {
  consumeOAuthState,
  countGoogleAccounts,
  countAccountCalendars,
  deleteGoogleAccount,
  getGoogleAccount,
  getGoogleAccountByEmail,
  getGoogleCalendar,
  insertOAuthState,
  listGoogleAccountsWithCalendars,
  replaceAccountCalendars,
  saveGoogleAccountTokens,
  setGoogleCalendarEnabled,
  updateGoogleAccountTokens,
} from '@/server/google/repository/google-queries'

export function oauthRedirectUri(origin: string): string {
  return `${origin}/api/google/oauth/callback`
}

async function importAccountCalendarsFromGoogle(input: {
  db: D1Database
  accountId: string
  accessToken: string
  fetchImpl: typeof fetch
  nowIso: string
}): Promise<'ok' | 'calendar_error'> {
  try {
    const calendars = await fetchCalendarList(input.accessToken, input.fetchImpl)
    await replaceAccountCalendars(
      input.db,
      input.accountId,
      calendars.map((cal) => ({
        calendarId: cal.calendarId,
        summary: cal.summary,
        enabled: cal.selected,
      })),
      input.nowIso,
      () => crypto.randomUUID(),
    )
    return 'ok'
  } catch (error) {
    console.error('importAccountCalendarsFromGoogle failed', error)
    return 'calendar_error'
  }
}

async function ensureAccountCalendarsImported(input: {
  db: D1Database
  accountId: string
  accessToken: string
  fetchImpl: typeof fetch
  nowIso: string
}): Promise<'ok' | 'calendar_error'> {
  if ((await countAccountCalendars(input.db, input.accountId)) > 0) {
    return 'ok'
  }
  return importAccountCalendarsFromGoogle(input)
}

export async function startGoogleOAuthUseCase(input: {
  db: D1Database
  env: { GOOGLE_CLIENT_ID?: string; GOOGLE_CLIENT_SECRET?: string; ENCRYPTION_KEY?: string }
  origin: string
  mode: 'connect' | 'reconnect'
  googleAccountId?: string
}): Promise<{ kind: 'redirect'; url: string } | { kind: 'error'; message: string }> {
  const oauth = readOAuthClientConfig(input.env)
  if (!oauth) return { kind: 'error', message: 'OAuth não configurado no Worker.' }
  if (input.mode === 'connect') {
    const count = await countGoogleAccounts(input.db)
    if (count >= MAX_GOOGLE_ACCOUNTS) {
      return { kind: 'error', message: `Limite de ${MAX_GOOGLE_ACCOUNTS} contas Google.` }
    }
  } else if (!input.googleAccountId || !(await getGoogleAccount(input.db, input.googleAccountId))) {
    return { kind: 'error', message: 'Conta Google não encontrada.' }
  }
  const nonce = crypto.randomUUID()
  await insertOAuthState(input.db, {
    nonce,
    mode: input.mode,
    googleAccountId: input.googleAccountId ?? null,
    createdAt: new Date().toISOString(),
  })
  return {
    kind: 'redirect',
    url: buildOAuthAuthorizeUrl({
      clientId: oauth.clientId,
      redirectUri: oauthRedirectUri(input.origin),
      state: nonce,
      mode: input.mode,
    }),
  }
}

export async function handleGoogleOAuthCallbackUseCase(input: {
  db: D1Database
  env: { GOOGLE_CLIENT_ID?: string; GOOGLE_CLIENT_SECRET?: string; ENCRYPTION_KEY?: string }
  origin: string
  code: string | null
  state: string | null
  fetchImpl?: typeof fetch
}): Promise<{ kind: 'redirect'; location: string } | { kind: 'error'; message: string }> {
  const settingsUrl = (query: string) => `${input.origin}/settings?${query}`
  try {
    if (!input.code || !input.state) {
      return { kind: 'redirect', location: settingsUrl('google=error') }
    }
    const oauth = readOAuthClientConfig(input.env)
    if (!oauth) return { kind: 'redirect', location: settingsUrl('google=error') }
    const pending = await consumeOAuthState(input.db, input.state)
    if (!pending) return { kind: 'redirect', location: settingsUrl('google=error') }

    const fetchImpl = input.fetchImpl ?? httpFetch
    const exchanged = await exchangeAuthorizationCode({
      clientId: oauth.clientId,
      clientSecret: oauth.clientSecret,
      code: input.code,
      redirectUri: oauthRedirectUri(input.origin),
      fetchImpl,
    })
    if (!exchanged.ok) {
      return { kind: 'redirect', location: settingsUrl('google=error') }
    }
    if (!exchanged.refreshToken) {
      return { kind: 'redirect', location: settingsUrl('google=no_refresh') }
    }

    const email = await fetchGoogleUserEmail(exchanged.accessToken, fetchImpl)
    if (!email) return { kind: 'redirect', location: settingsUrl('google=error') }

    const nowIso = new Date().toISOString()
    const refreshTokenEnc = await encryptSecret(exchanged.refreshToken, oauth.encryptionKey)

    if (pending.mode === 'reconnect') {
      const accountId = pending.googleAccountId
      if (!accountId) return { kind: 'redirect', location: settingsUrl('google=error') }
      const account = await getGoogleAccount(input.db, accountId)
      if (!account || account.email !== email) {
        return { kind: 'redirect', location: settingsUrl('google=error') }
      }
      await updateGoogleAccountTokens(input.db, accountId, refreshTokenEnc, nowIso)
      const imported = await ensureAccountCalendarsImported({
        db: input.db,
        accountId,
        accessToken: exchanged.accessToken,
        fetchImpl,
        nowIso,
      })
      if (imported === 'calendar_error') {
        return { kind: 'redirect', location: settingsUrl('google=calendar_error') }
      }
      return { kind: 'redirect', location: settingsUrl('google=connected') }
    }

    const existing = await getGoogleAccountByEmail(input.db, email)
    if (!existing) {
      const count = await countGoogleAccounts(input.db)
      if (count >= MAX_GOOGLE_ACCOUNTS) {
        return { kind: 'redirect', location: settingsUrl('google=limit') }
      }
    }

    const accountId = await saveGoogleAccountTokens(input.db, {
      id: existing?.id ?? crypto.randomUUID(),
      email,
      refreshTokenEnc,
      status: 'active',
      connectedAt: existing?.connectedAt ?? nowIso,
      updatedAt: nowIso,
    })

    const imported = await ensureAccountCalendarsImported({
      db: input.db,
      accountId,
      accessToken: exchanged.accessToken,
      fetchImpl,
      nowIso,
    })
    if (imported === 'calendar_error') {
      return { kind: 'redirect', location: settingsUrl('google=calendar_error') }
    }

    return { kind: 'redirect', location: settingsUrl('google=connected') }
  } catch (error) {
    console.error('handleGoogleOAuthCallback failed', error)
    return { kind: 'redirect', location: settingsUrl('google=error') }
  }
}

export async function listGoogleAccountsUseCase(db: D1Database) {
  return { accounts: await listGoogleAccountsWithCalendars(db) }
}

export async function disconnectGoogleAccountUseCase(input: {
  db: D1Database
  env: { ENCRYPTION_KEY?: string }
  accountId: string
}): Promise<{ ok: true } | { ok: false; status: 404 }> {
  const account = await getGoogleAccount(input.db, input.accountId)
  if (!account) return { ok: false, status: 404 }
  const key = input.env.ENCRYPTION_KEY
  if (key) {
    try {
      const refreshToken = await decryptSecret(account.refreshTokenEnc, key)
      await revokeRefreshToken(refreshToken)
    } catch {
      // best-effort
    }
  }
  await deleteGoogleAccount(input.db, input.accountId)
  return { ok: true }
}

export async function patchGoogleCalendarUseCase(input: {
  db: D1Database
  calendarRowId: string
  enabled: boolean
}): Promise<{ ok: true } | { ok: false; status: 404 }> {
  const cal = await getGoogleCalendar(input.db, input.calendarRowId)
  if (!cal) return { ok: false, status: 404 }
  await setGoogleCalendarEnabled(input.db, input.calendarRowId, input.enabled, new Date().toISOString())
  return { ok: true }
}

export function readOAuthForSync(env: {
  GOOGLE_CLIENT_ID?: string
  GOOGLE_CLIENT_SECRET?: string
  ENCRYPTION_KEY?: string
}): OAuthClientConfig | null {
  return readOAuthClientConfig(env)
}
