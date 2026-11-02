import { eq } from 'drizzle-orm'
import type { Settings } from '@/shared/settings/types'
import type { AppDb } from '@/server/common/infra/db'
import { settings } from '@/server/settings/repository/schema'

export async function getSettingsRow(db: AppDb): Promise<Settings | null> {
  const [row] = await db.select().from(settings).where(eq(settings.id, 1)).limit(1)
  if (!row) return null
  const { id: _id, ...value } = row
  return value
}

export async function putSettingsRow(db: AppDb, value: Settings): Promise<Settings> {
  await db
    .insert(settings)
    .values({ id: 1, ...value })
    .onConflictDoUpdate({ target: settings.id, set: value })
  return value
}
