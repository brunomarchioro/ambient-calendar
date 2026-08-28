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

export function parseSettings(input: unknown) {
  return settingsSchema.safeParse(input)
}

export function seedIfMissing(row: Settings | null): Settings {
  return row ?? { ...SETTINGS_DEFAULTS }
}
