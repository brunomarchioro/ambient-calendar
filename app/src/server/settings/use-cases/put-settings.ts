import { createDb, type AppDb } from '@/server/common/infra/db'
import { seedIfMissing, type DevicePin, type Settings, type SettingsValues } from '@/shared/settings/types'
import { getSettingsRow, putSettingsRow } from '@/server/settings/repository/put-settings'

async function getOrSeed(db: AppDb): Promise<Settings> {
  return (await getSettingsRow(db)) ?? putSettingsRow(db, seedIfMissing(null))
}

export function getOrSeedSettingsUseCase(db: D1Database): Promise<Settings> {
  return getOrSeed(createDb(db))
}

export async function putSettingsUseCase(db: D1Database, value: SettingsValues): Promise<Settings> {
  const drizzle = createDb(db)
  const current = await getOrSeed(drizzle)
  return putSettingsRow(drizzle, { ...value, devicePin: current.devicePin })
}

export async function putDevicePinUseCase(db: D1Database, devicePin: DevicePin | null): Promise<Settings> {
  const drizzle = createDb(db)
  const current = await getOrSeed(drizzle)
  return putSettingsRow(drizzle, { ...current, devicePin })
}
