import { expect, test } from 'vitest'
import { DEVICE_TITLE_MAX_BYTES, sanitizeDeviceTitle } from '@/server/device/services/device-title'

test('keeps Portuguese Latin-1 accents', () => {
  expect(sanitizeDeviceTitle('Reunião na São Paulo')).toBe('Reunião na São Paulo')
})

test('strips emoji', () => {
  expect(sanitizeDeviceTitle('Dentista 🦷 amanhã')).toBe('Dentista amanhã')
})

test('strips symbols outside Latin-1', () => {
  expect(sanitizeDeviceTitle('Reunião → call')).toBe('Reunião call')
})

test('strips control characters and collapses whitespace', () => {
  expect(sanitizeDeviceTitle('a  \n\t b')).toBe('a b')
})

test('emoji-only title becomes empty', () => {
  expect(sanitizeDeviceTitle('🎉')).toBe('')
})

test('truncates to DEVICE_TITLE_MAX_BYTES without splitting UTF-8', () => {
  const long = 'ã'.repeat(50)
  const sanitized = sanitizeDeviceTitle(long)
  expect(new TextEncoder().encode(sanitized).length).toBeLessThanOrEqual(DEVICE_TITLE_MAX_BYTES)
  expect(sanitized).toBe('ã'.repeat(47))
})
