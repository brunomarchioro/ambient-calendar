import { expect, test, vi } from 'vitest'
import type { AppDb } from '@/server/common/infra/db'
import { putDevicePinUseCase, putSettingsUseCase } from '@/server/settings/use-cases/put-settings'
import { SETTINGS_DEFAULTS, type Settings } from '@/shared/settings/types'

function repository(current: Settings) {
  return {
    getSettingsRow: vi.fn(async (_db: D1Database | AppDb) => current),
    putSettingsRow: vi.fn(async (_db: D1Database | AppDb, value: Settings) => value),
  }
}

test('general settings preserve the configured device PIN', async () => {
  const deps = repository({ ...SETTINGS_DEFAULTS, devicePin: '2143' })
  const values = { ...SETTINGS_DEFAULTS, timezone: 'UTC' }
  const { devicePin: _ignored, ...publicValues } = values

  await expect(putSettingsUseCase({} as D1Database, publicValues, deps)).resolves.toMatchObject({
    timezone: 'UTC',
    devicePin: '2143',
  })
})

test.each(['3142', null] as const)('device PIN can be replaced or removed (%s)', async (devicePin) => {
  const deps = repository({ ...SETTINGS_DEFAULTS, devicePin: '2143' })

  await expect(putDevicePinUseCase({} as D1Database, devicePin, deps)).resolves.toMatchObject({ devicePin })
})
