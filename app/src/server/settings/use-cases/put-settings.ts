import type { AppDb } from '@/server/common/infra/db'
import { createDb } from '@/server/common/infra/db'
import { seedIfMissing, type Settings } from '@/shared/settings/types'
import { getSettingsRow } from '@/server/settings/repository/put-settings'
import { putSettingsRow } from '@/server/settings/repository/put-settings'

export async function getOrSeedSettingsUseCase(db: D1Database | AppDb): Promise<Settings> {
  const drizzle = typeof db === 'object' && 'select' in db ? db : createDb(db)
  const row = await getSettingsRow(drizzle)
  if (row) return row
  const seeded = seedIfMissing(null)
  return putSettingsRow(drizzle, seeded)
}

export async function putSettingsUseCase(db: D1Database | AppDb, value: Settings): Promise<Settings> {
  const drizzle = typeof db === 'object' && 'insert' in db ? db : createDb(db)
  return putSettingsRow(drizzle, value)
}
