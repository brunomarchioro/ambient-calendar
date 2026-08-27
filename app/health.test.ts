import { expect, test } from 'vitest'
import { getHealth } from './health'

test('GET health is 200 JSON { ok: true }', async () => {
  const response = await getHealth()
  expect(response.status).toBe(200)
  expect(response.headers.get('content-type')).toMatch(/application\/json/)
  expect(await response.json()).toEqual({ ok: true })
})
