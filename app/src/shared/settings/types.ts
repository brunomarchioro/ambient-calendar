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
  devicePin: null,
} as const

export const settingsValuesSchema = z.strictObject({
  timezone: z.string().refine(isIanaTimezone, {
    message: 'timezone must be a valid IANA name',
  }),
  reminderMinutes: z.int().min(1).max(180),
  lookaheadDays: z.int().min(1).max(30),
  showNextEvents: z.int().min(1).max(5),
})

export const DEVICE_PIN_MESSAGE = 'Use os algarismos 1, 2, 3 e 4 uma vez cada.'
export const devicePinSchema = z.string().refine((value) => /^[1-4]{4}$/.test(value) && new Set(value).size === 4, {
  message: DEVICE_PIN_MESSAGE,
})

export const settingsSchema = settingsValuesSchema.extend({
  devicePin: devicePinSchema.nullable().default(null),
})

export const settingsResponseSchema = settingsValuesSchema.extend({
  pinConfigured: z.boolean(),
})

export type Settings = z.infer<typeof settingsSchema>
export type SettingsValues = z.infer<typeof settingsValuesSchema>
export type SettingsResponse = z.infer<typeof settingsResponseSchema>
export type DevicePin = z.infer<typeof devicePinSchema>

export function parseSettings(input: unknown) {
  return settingsSchema.safeParse(input)
}

export function parseSettingsValues(input: unknown) {
  return settingsValuesSchema.safeParse(input)
}

export function parseSettingsResponse(input: unknown) {
  return settingsResponseSchema.safeParse(input)
}

export function parseDevicePin(input: unknown) {
  return devicePinSchema.safeParse(input)
}

export function toSettingsResponse(settings: Settings): SettingsResponse {
  const { devicePin, ...values } = settings
  return { ...values, pinConfigured: devicePin !== null }
}

export function seedIfMissing(row: Settings | null): Settings {
  return row ?? { ...SETTINGS_DEFAULTS }
}
