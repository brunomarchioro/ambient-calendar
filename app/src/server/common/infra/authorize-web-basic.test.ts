import { expect, test } from 'vitest'
import { authorizeWebBasic, verifyWebBasicLogin } from '@/server/common/infra/authorize-web-basic'

const USER = 'admin'
const PASS = 'secret'
const creds = `Basic ${btoa(`${USER}:${PASS}`)}`

function request(path: string, authorization?: string): Request {
  const headers = authorization ? { Authorization: authorization } : undefined
  return new Request(`http://127.0.0.1:3000${path}`, { headers })
}

test('skips when credentials are not configured', () => {
  expect(authorizeWebBasic(request('/events'), undefined, undefined)).toBeNull()
  expect(authorizeWebBasic(request('/events'), USER, undefined)).toBeNull()
})

test('public paths skip auth even when configured', () => {
  for (const path of [
    '/api/health',
    '/api/device/schedule',
    '/api/google/oauth/start',
    '/api/google/oauth/callback',
  ]) {
    expect(authorizeWebBasic(request(path), USER, PASS)).toBeNull()
  }
})

test('TanStack Start SPA shell prerender skips auth', () => {
  const headers = { 'X-TSS_SHELL': 'true' }
  expect(
    authorizeWebBasic(
      new Request('http://127.0.0.1:3000/', { headers }),
      USER,
      PASS,
    ),
  ).toBeNull()
})

test('missing Authorization is 401 with WWW-Authenticate', () => {
  const response = authorizeWebBasic(request('/events'), USER, PASS)
  expect(response?.status).toBe(401)
  expect(response?.headers.get('WWW-Authenticate')).toBe('Basic realm="Ambient Calendar Display"')
})

test('wrong Basic credentials are 401', () => {
  expect(authorizeWebBasic(request('/events', 'Basic wrong'), USER, PASS)?.status).toBe(401)
  const wrong = `Basic ${btoa(`${USER}:other`)}`
  expect(authorizeWebBasic(request('/events', wrong), USER, PASS)?.status).toBe(401)
})

test('non-Basic scheme is 401', () => {
  expect(authorizeWebBasic(request('/api/events', 'Bearer token'), USER, PASS)?.status).toBe(401)
})

test('matching Basic credentials are allowed', () => {
  expect(authorizeWebBasic(request('/api/events', creds), USER, PASS)).toBeNull()
})

test('verifyWebBasicLogin matches configured credentials', () => {
  expect(verifyWebBasicLogin(USER, PASS, USER, PASS)).toBe(true)
  expect(verifyWebBasicLogin(USER, 'wrong', USER, PASS)).toBe(false)
  expect(verifyWebBasicLogin(USER, PASS, undefined, PASS)).toBe(false)
})
