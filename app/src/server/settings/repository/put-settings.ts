import { eq } from 'drizzle-orm'
import type { Settings } from '@/shared/settings/types'
import { createDb, type AppDb } from '@/server/common/infra/db'
import { settings } from '@/server/settings/repository/schema'

export async function getSettingsRow(db: D1Database | AppDb): Promise<Settings | null> {
  const drizzle = typeof db === 'object' && 'select' in db ? db : createDb(db)
  const [row] = await drizzle.select().from(settings).where(eq(settings.id, 1)).limit(1)
  if (!row) return null
  return {
    timezone: row.timezone,
    reminderMinutes: row.reminderMinutes,
    lookaheadDays: row.lookaheadDays,
    showNextEvents: row.showNextEvents,
  }
}

export async function putSettingsRow(db: D1Database | AppDb, value: Settings): Promise<Settings> {
  const drizzle = typeof db === 'object' && 'insert' in db ? db : createDb(db)
  await drizzle
    .insert(settings)
    .values({
      id: 1,
      timezone: value.timezone,
      reminderMinutes: value.reminderMinutes,
      lookaheadDays: value.lookaheadDays,
      showNextEvents: value.showNextEvents,
    })
    .onConflictDoUpdate({
      target: settings.id,
      set: {
        timezone: value.timezone,
        reminderMinutes: value.reminderMinutes,
        lookaheadDays: value.lookaheadDays,
        showNextEvents: value.showNextEvents,
      },
    })
  return value
}
