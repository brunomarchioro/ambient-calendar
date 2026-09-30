import type { AppDb } from '@/server/common/infra/db'
import { createDb } from '@/server/common/infra/db'
import { seedIfMissing, type DevicePin, type Settings, type SettingsValues } from '@/shared/settings/types'
import { getSettingsRow } from '@/server/settings/repository/put-settings'
import { putSettingsRow } from '@/server/settings/repository/put-settings'

type SettingsRepository = {
  getSettingsRow: typeof getSettingsRow
  putSettingsRow: typeof putSettingsRow
}

const repository: SettingsRepository = { getSettingsRow, putSettingsRow }

export async function getOrSeedSettingsUseCase(
  db: D1Database | AppDb,
  deps: SettingsRepository = repository,
): Promise<Settings> {
  const drizzle = typeof db === 'object' && 'select' in db ? db : createDb(db)
  const row = await deps.getSettingsRow(drizzle)
  if (row) return row
  const seeded = seedIfMissing(null)
  return deps.putSettingsRow(drizzle, seeded)
}

export async function putSettingsUseCase(
  db: D1Database | AppDb,
  value: SettingsValues,
  deps: SettingsRepository = repository,
): Promise<Settings> {
  const drizzle = typeof db === 'object' && 'insert' in db ? db : createDb(db)
  const current = await getOrSeedSettingsUseCase(drizzle, deps)
  return deps.putSettingsRow(drizzle, { ...value, devicePin: current.devicePin })
}

export async function putDevicePinUseCase(
  db: D1Database | AppDb,
  devicePin: DevicePin | null,
  deps: SettingsRepository = repository,
): Promise<Settings> {
  const drizzle = typeof db === 'object' && 'insert' in db ? db : createDb(db)
  const current = await getOrSeedSettingsUseCase(drizzle, deps)
  return deps.putSettingsRow(drizzle, { ...current, devicePin })
}
