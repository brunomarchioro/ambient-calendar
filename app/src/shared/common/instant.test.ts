import { expect, test } from 'vitest'
import { SETTINGS_DEFAULTS } from '@/shared/settings/types'
import {
  DEVICE_ISO_MAX_LEN,
  formatGoogleDateTime,
  formatInTimeZone,
  instantFromWallClock,
  zonedMidnight,
} from '@/shared/common/instant'

const tz = SETTINGS_DEFAULTS.timezone
const now = new Date('2026-08-27T14:00:00-03:00')

test('formatInTimeZone emits offset ISO without millis', () => {
  expect(formatInTimeZone(now, 'America/Sao_Paulo')).toBe('2026-08-27T14:00:00-03:00')
  expect(formatInTimeZone(now, 'UTC')).toBe('2026-08-27T17:00:00+00:00')
  expect(formatInTimeZone(now, tz).length).toBeLessThanOrEqual(DEVICE_ISO_MAX_LEN)
})

test('instantFromWallClock round-trips in Settings timezone', () => {
  const instant = instantFromWallClock('2026-08-27T14:00', tz)
  expect(formatInTimeZone(instant, tz)).toBe('2026-08-27T14:00:00-03:00')
})

test('zonedMidnight uses midnight in timezone', () => {
  expect(zonedMidnight('2026-08-28', tz)).toBe('2026-08-28T00:00:00-03:00')
})

test('formatGoogleDateTime normalizes offset and bare wall clocks', () => {
  expect(formatGoogleDateTime('2026-08-27T14:00:00-03:00', tz)).toBe('2026-08-27T14:00:00-03:00')
  expect(formatGoogleDateTime('2026-08-27T14:00:00', tz)).toBe('2026-08-27T14:00:00-03:00')
  expect(formatGoogleDateTime('2026-08-27T17:00:00Z', tz)).toBe('2026-08-27T14:00:00-03:00')
})
