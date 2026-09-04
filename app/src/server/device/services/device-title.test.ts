import { expect, test } from 'vitest'
import { DEVICE_TITLE_MAX_BYTES, sanitizeDeviceTitle } from '@/server/device/services/device-title'

test('folds Portuguese accents to ASCII', () => {
  expect(sanitizeDeviceTitle('Reunião na São Paulo')).toBe('Reuniao na Sao Paulo')
})

test('strips emoji and folds remaining accents', () => {
  expect(sanitizeDeviceTitle('Dentista 🦷 amanhã')).toBe('Dentista amanha')
})

test('strips symbols outside Basic Latin', () => {
  expect(sanitizeDeviceTitle('Reunião → call')).toBe('Reuniao call')
})

test('strips control characters and collapses whitespace', () => {
  expect(sanitizeDeviceTitle('a  \n\t b')).toBe('a b')
})

test('emoji-only title becomes empty', () => {
  expect(sanitizeDeviceTitle('🎉')).toBe('')
})

test('empty title stays empty', () => {
  expect(sanitizeDeviceTitle('')).toBe('')
})

test('truncates to DEVICE_TITLE_MAX_BYTES', () => {
  const long = 'a'.repeat(DEVICE_TITLE_MAX_BYTES + 10)
  const sanitized = sanitizeDeviceTitle(long)
  expect(new TextEncoder().encode(sanitized).length).toBe(DEVICE_TITLE_MAX_BYTES)
  expect(sanitized).toBe('a'.repeat(DEVICE_TITLE_MAX_BYTES))
})
