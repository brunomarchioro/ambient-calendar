import { expect, test } from 'vitest'
import { SETTINGS_DEFAULTS, parseSettings, seedIfMissing } from '@/shared/settings/types'

test('seed defaults match §4', () => {
  expect(SETTINGS_DEFAULTS).toEqual({
    timezone: 'America/Sao_Paulo',
    reminderMinutes: 30,
    lookaheadDays: 7,
    showNextEvents: 2,
  })
  expect(parseSettings(SETTINGS_DEFAULTS).success).toBe(true)
})

test('seedIfMissing writes defaults when the row is absent', () => {
  expect(seedIfMissing(null)).toEqual({ ...SETTINGS_DEFAULTS })
})

test('seedIfMissing keeps an existing Settings row', () => {
  const row = {
    timezone: 'UTC',
    reminderMinutes: 1,
    lookaheadDays: 1,
    showNextEvents: 1,
  }
  expect(seedIfMissing(row)).toEqual(row)
})

test('rejects reminderMinutes below 1 and above 180', () => {
  expect(parseSettings({ ...SETTINGS_DEFAULTS, reminderMinutes: 0 }).success).toBe(false)
  expect(parseSettings({ ...SETTINGS_DEFAULTS, reminderMinutes: 181 }).success).toBe(false)
})

test('rejects lookaheadDays outside 1..30', () => {
  expect(parseSettings({ ...SETTINGS_DEFAULTS, lookaheadDays: 0 }).success).toBe(false)
  expect(parseSettings({ ...SETTINGS_DEFAULTS, lookaheadDays: 31 }).success).toBe(false)
})

test('rejects showNextEvents outside 1..5', () => {
  expect(parseSettings({ ...SETTINGS_DEFAULTS, showNextEvents: 0 }).success).toBe(false)
  expect(parseSettings({ ...SETTINGS_DEFAULTS, showNextEvents: 6 }).success).toBe(false)
})

test('rejects a non-IANA timezone', () => {
  expect(parseSettings({ ...SETTINGS_DEFAULTS, timezone: 'Not/A_Zone' }).success).toBe(false)
})

test('accepts range edges and a valid IANA timezone', () => {
  expect(
    parseSettings({
      timezone: 'UTC',
      reminderMinutes: 1,
      lookaheadDays: 1,
      showNextEvents: 1,
    }).success,
  ).toBe(true)
  expect(
    parseSettings({
      timezone: 'America/Sao_Paulo',
      reminderMinutes: 180,
      lookaheadDays: 30,
      showNextEvents: 5,
    }).success,
  ).toBe(true)
})

test('rejects quiet hours and other extra keys', () => {
  expect(parseSettings({ ...SETTINGS_DEFAULTS, quietHours: true }).success).toBe(false)
})
