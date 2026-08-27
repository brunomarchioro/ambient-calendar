import { z } from 'zod'

function isIanaTimezone(timezone: string): boolean {
  try {
    new Intl.DateTimeFormat(undefined, { timeZone: timezone })
    return true
  } catch {
    return false
  }
}

export const SETTINGS_DEFAULTS = {
  timezone: 'America/Sao_Paulo',
  reminderMinutes: 30,
  lookaheadDays: 7,
  showNextEvents: 2,
} as const

export const settingsSchema = z.strictObject({
  timezone: z.string().refine(isIanaTimezone, {
    message: 'timezone must be a valid IANA name',
  }),
  reminderMinutes: z.int().min(1).max(180),
  lookaheadDays: z.int().min(1).max(30),
  showNextEvents: z.int().min(1).max(5),
})

export type Settings = z.infer<typeof settingsSchema>

const SELECT_SETTINGS =
  'SELECT timezone, reminderMinutes, lookaheadDays, showNextEvents FROM Settings WHERE id = 1'
const UPSERT_SETTINGS = `INSERT INTO Settings (id, timezone, reminderMinutes, lookaheadDays, showNextEvents)
VALUES (1, ?, ?, ?, ?)
ON CONFLICT(id) DO UPDATE SET
  timezone = excluded.timezone,
  reminderMinutes = excluded.reminderMinutes,
  lookaheadDays = excluded.lookaheadDays,
  showNextEvents = excluded.showNextEvents`

export function parseSettings(input: unknown) {
  return settingsSchema.safeParse(input)
}

export function seedIfMissing(row: Settings | null): Settings {
  return row ?? { ...SETTINGS_DEFAULTS }
}

export async function getOrSeedSettings(db: D1Database): Promise<Settings> {
  const row = await db.prepare(SELECT_SETTINGS).first<Record<string, unknown>>()
  const parsed = row ? parseSettings(row) : null
  if (parsed?.success) return parsed.data
  const seeded = seedIfMissing(null)
  await putSettings(db, seeded)
  return seeded
}

export async function putSettings(db: D1Database, settings: Settings): Promise<Settings> {
  await db
    .prepare(UPSERT_SETTINGS)
    .bind(
      settings.timezone,
      settings.reminderMinutes,
      settings.lookaheadDays,
      settings.showNextEvents,
    )
    .run()
  return settings
}
