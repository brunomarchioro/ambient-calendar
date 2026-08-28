import { expect, test } from 'vitest'
import { encryptSecret, decryptSecret } from '@/server/google/infra/token-crypto'

const TEST_KEY = btoa(String.fromCharCode(...new Uint8Array(32).fill(9)))

test('encryptSecret round-trips refresh tokens', async () => {
  const enc = await encryptSecret('refresh-token-abc', TEST_KEY)
  expect(enc).not.toContain('refresh-token-abc')
  expect(await decryptSecret(enc, TEST_KEY)).toBe('refresh-token-abc')
})
