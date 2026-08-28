import { expect, test } from 'vitest'
import { authorizeDevice } from '@/server/device/infra/authorize-device'

test('missing Authorization is 401', async () => {
  const response = authorizeDevice(null, 'secret')
  expect(response?.status).toBe(401)
  expect(await response?.json()).toEqual({ error: 'unauthorized' })
})

test('wrong Bearer token is 401', () => {
  expect(authorizeDevice('Bearer other', 'secret')?.status).toBe(401)
})

test('non-Bearer scheme is 401', () => {
  expect(authorizeDevice('Basic secret', 'secret')?.status).toBe(401)
})

test('empty configured token is 401', () => {
  expect(authorizeDevice('Bearer ', '')?.status).toBe(401)
  expect(authorizeDevice('Bearer secret', undefined)?.status).toBe(401)
})

test('matching Bearer token is allowed', () => {
  expect(authorizeDevice('Bearer secret', 'secret')).toBeNull()
})
