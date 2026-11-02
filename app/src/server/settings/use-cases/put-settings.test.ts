import { expect, test, vi } from 'vitest'
import { putDevicePinUseCase, putSettingsUseCase } from '@/server/settings/use-cases/put-settings'
import { SETTINGS_DEFAULTS } from '@/shared/settings/types'

vi.mock('@/server/common/infra/db', () => ({ createDb: () => ({}) }))
vi.mock('@/server/settings/repository/put-settings', () => ({
  getSettingsRow: vi.fn(async () => ({ ...SETTINGS_DEFAULTS, devicePin: '2143' })),
  putSettingsRow: vi.fn(async (_db: unknown, value: unknown) => value),
}))

test('general settings preserve the configured device PIN', async () => {
  const values = { ...SETTINGS_DEFAULTS, timezone: 'UTC' }
  const { devicePin: _ignored, ...publicValues } = values

  await expect(putSettingsUseCase({} as D1Database, publicValues)).resolves.toMatchObject({
    timezone: 'UTC',
    devicePin: '2143',
  })
})

test.each(['3142', null] as const)('device PIN can be replaced or removed (%s)', async (devicePin) => {
  await expect(putDevicePinUseCase({} as D1Database, devicePin)).resolves.toMatchObject({ devicePin })
})
