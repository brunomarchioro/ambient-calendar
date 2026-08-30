/** Paths that skip HTTP Basic Auth (device bearer, OAuth callback, health). Add new public /api routes here. */
const PUBLIC_PATHS = new Set([
  '/api/health',
  '/api/device/schedule',
  '/api/google/oauth/start',
  '/api/google/oauth/callback',
])

const BASIC_REALM = 'Ambient Calendar Display'

export function verifyWebBasicLogin(
  user: string,
  password: string,
  expectedUser: string | undefined,
  expectedPassword: string | undefined,
): boolean {
  if (!expectedUser || !expectedPassword) return false
  return safeEqual(user, expectedUser) && safeEqual(password, expectedPassword)
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

function basicUnauthorized(): Response {
  return new Response('Unauthorized', {
    status: 401,
    headers: { 'WWW-Authenticate': `Basic realm="${BASIC_REALM}"` },
  })
}

function parseBasicCredentials(header: string): { user: string; password: string } | null {
  if (!header.startsWith('Basic ')) return null
  let decoded: string
  try {
    decoded = atob(header.slice('Basic '.length))
  } catch {
    return null
  }
  const colon = decoded.indexOf(':')
  if (colon === -1) return null
  return { user: decoded.slice(0, colon), password: decoded.slice(colon + 1) }
}

export function authorizeWebBasic(
  request: Request,
  user: string | undefined,
  password: string | undefined,
): Response | null {
  if (!user || !password) return null
  const { pathname } = new URL(request.url)
  if (PUBLIC_PATHS.has(pathname)) return null

  const credentials = parseBasicCredentials(request.headers.get('Authorization') ?? '')
  if (!credentials) return basicUnauthorized()
  if (!safeEqual(credentials.user, user) || !safeEqual(credentials.password, password)) {
    return basicUnauthorized()
  }
  return null
}
