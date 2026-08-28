import { httpFetch } from '@/server/common/infra/http-fetch'
import { GOOGLE_OAUTH_SCOPES } from '@/shared/google/types'

export type OAuthClientConfig = {
  clientId: string
  clientSecret: string
  encryptionKey: string
}

export function readOAuthClientConfig(env: {
  GOOGLE_CLIENT_ID?: string
  GOOGLE_CLIENT_SECRET?: string
  ENCRYPTION_KEY?: string
}): OAuthClientConfig | null {
  const clientId = env.GOOGLE_CLIENT_ID
  const clientSecret = env.GOOGLE_CLIENT_SECRET
  const encryptionKey = env.ENCRYPTION_KEY
  if (!clientId || !clientSecret || !encryptionKey) return null
  return { clientId, clientSecret, encryptionKey }
}

const TOKEN_URL = 'https://oauth2.googleapis.com/token'
const AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth'

export function buildOAuthAuthorizeUrl(input: {
  clientId: string
  redirectUri: string
  state: string
  mode: 'connect' | 'reconnect'
}): string {
  const url = new URL(AUTH_URL)
  url.searchParams.set('client_id', input.clientId)
  url.searchParams.set('redirect_uri', input.redirectUri)
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('scope', GOOGLE_OAUTH_SCOPES.join(' '))
  url.searchParams.set('access_type', 'offline')
  url.searchParams.set('include_granted_scopes', 'true')
  url.searchParams.set('state', input.state)
  url.searchParams.set('prompt', input.mode === 'reconnect' ? 'consent' : 'select_account consent')
  return url.toString()
}

export async function exchangeAuthorizationCode(input: {
  clientId: string
  clientSecret: string
  code: string
  redirectUri: string
  fetchImpl?: typeof fetch
}): Promise<
  | { ok: true; accessToken: string; refreshToken: string | null }
  | { ok: false; kind: 'invalid_grant' | 'error'; message: string }
> {
  const fetchImpl = input.fetchImpl ?? httpFetch
  let response: Response
  try {
    response = await fetchImpl(TOKEN_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: input.clientId,
        client_secret: input.clientSecret,
        code: input.code,
        grant_type: 'authorization_code',
        redirect_uri: input.redirectUri,
      }),
    })
  } catch (err) {
    return { ok: false, kind: 'error', message: String(err) }
  }
  const body: unknown = await response.json().catch(() => null)
  if (body && typeof body === 'object' && 'error' in body && body.error === 'invalid_grant') {
    return { ok: false, kind: 'invalid_grant', message: 'invalid_grant' }
  }
  if (
    !response.ok ||
    !body ||
    typeof body !== 'object' ||
    !('access_token' in body) ||
    typeof body.access_token !== 'string'
  ) {
    return { ok: false, kind: 'error', message: `token ${response.status}` }
  }
  const refreshToken =
    'refresh_token' in body && typeof body.refresh_token === 'string' ? body.refresh_token : null
  return { ok: true, accessToken: body.access_token, refreshToken }
}

export async function refreshAccessToken(input: {
  clientId: string
  clientSecret: string
  refreshToken: string
  fetchImpl?: typeof fetch
}): Promise<
  | { ok: true; accessToken: string }
  | { ok: false; kind: 'invalid_grant' | 'error'; message: string }
> {
  const fetchImpl = input.fetchImpl ?? httpFetch
  let response: Response
  try {
    response = await fetchImpl(TOKEN_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: input.clientId,
        client_secret: input.clientSecret,
        refresh_token: input.refreshToken,
        grant_type: 'refresh_token',
      }),
    })
  } catch (err) {
    return { ok: false, kind: 'error', message: String(err) }
  }
  const body: unknown = await response.json().catch(() => null)
  if (body && typeof body === 'object' && 'error' in body && body.error === 'invalid_grant') {
    return { ok: false, kind: 'invalid_grant', message: 'invalid_grant' }
  }
  if (
    !response.ok ||
    !body ||
    typeof body !== 'object' ||
    !('access_token' in body) ||
    typeof body.access_token !== 'string'
  ) {
    return { ok: false, kind: 'error', message: `token ${response.status}` }
  }
  return { ok: true, accessToken: body.access_token }
}

export async function fetchGoogleUserEmail(
  accessToken: string,
  fetchImpl: typeof fetch = httpFetch,
): Promise<string | null> {
  const response = await fetchImpl('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { authorization: `Bearer ${accessToken}` },
  })
  if (!response.ok) return null
  const body: unknown = await response.json().catch(() => null)
  if (body && typeof body === 'object' && 'email' in body && typeof body.email === 'string') {
    return body.email
  }
  return null
}

export async function revokeRefreshToken(
  refreshToken: string,
  fetchImpl: typeof fetch = httpFetch,
): Promise<void> {
  try {
    await fetchImpl('https://oauth2.googleapis.com/revoke', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ token: refreshToken }),
    })
  } catch {
    // best-effort
  }
}
