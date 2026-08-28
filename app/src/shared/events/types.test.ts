import { expect, test } from 'vitest'
import {
  normalizeWrite,
  parseEventWrite,
} from '@/shared/events/types'
import { manualMutation, parseEventRow } from '@/server/events/services/parse-event-row'
import { formatInTimeZone } from '@/shared/common/instant'
import { SETTINGS_DEFAULTS } from '@/shared/settings/types'

const tz = SETTINGS_DEFAULTS.timezone

const timedWrite = {
  title: 'Reunião',
  startAt: '2026-08-27T14:00:00-03:00',
  endAt: '2026-08-27T15:00:00-03:00',
  allDay: false,
}

test('rejects a missing title', () => {
  expect(parseEventWrite({ ...timedWrite, title: '' }).success).toBe(false)
  expect(parseEventWrite({ ...timedWrite, title: '   ' }).success).toBe(false)
  const { title: _, ...noTitle } = timedWrite
  expect(parseEventWrite(noTitle).success).toBe(false)
})

test('rejects source and other extra keys on write', () => {
  expect(parseEventWrite({ ...timedWrite, source: 'google' }).success).toBe(false)
  expect(parseEventWrite({ ...timedWrite, source: 'manual' }).success).toBe(false)
  expect(parseEventWrite({ ...timedWrite, externalId: 'g1' }).success).toBe(false)
})

test('accepts timed endAt null', () => {
  const parsed = parseEventWrite({ ...timedWrite, endAt: null })
  expect(parsed.success).toBe(true)
  if (parsed.success) expect(parsed.data.endAt).toBeNull()
})

test('all-day snaps start to midnight in Settings timezone and defaults exclusive end', () => {
  const parsed = parseEventWrite({
    title: 'Feriado',
    startAt: '2026-08-27T15:00:00-03:00',
    endAt: null,
    allDay: true,
  })
  expect(parsed.success).toBe(true)
  if (!parsed.success) return
  const normalized = normalizeWrite(parsed.data, tz)
  expect(normalized.ok).toBe(true)
  if (!normalized.ok) return
  expect(formatInTimeZone(normalized.startAt, tz)).toBe('2026-08-27T00:00:00-03:00')
  expect(normalized.endAt).not.toBeNull()
  expect(formatInTimeZone(normalized.endAt!, tz)).toBe('2026-08-28T00:00:00-03:00')
})

test('timed Z instant formats in Settings timezone and keeps null end', () => {
  const parsed = parseEventWrite({
    title: 'Call',
    startAt: '2026-08-27T17:00:00Z',
    endAt: null,
    allDay: false,
  })
  expect(parsed.success).toBe(true)
  if (!parsed.success) return
  const normalized = normalizeWrite(parsed.data, tz)
  expect(normalized.ok).toBe(true)
  if (!normalized.ok) return
  expect(formatInTimeZone(normalized.startAt, tz)).toBe('2026-08-27T14:00:00-03:00')
  expect(normalized.endAt).toBeNull()
})

test('rejects endAt before or equal to startAt', () => {
  const parsed = parseEventWrite({
    ...timedWrite,
    endAt: '2026-08-27T13:00:00-03:00',
  })
  expect(parsed.success).toBe(true)
  if (!parsed.success) return
  expect(normalizeWrite(parsed.data, tz).ok).toBe(false)
})

test('parseEventRow builds the google | manual union', () => {
  const google = parseEventRow({
    id: 'g1',
    source: 'google',
    externalId: 'google-1',
    title: 'Sync',
    startAt: '2026-08-27T17:00:00.000Z',
    endAt: null,
    allDay: 0,
    timezone: tz,
    createdAt: '2026-08-27T12:00:00.000Z',
    updatedAt: '2026-08-27T12:00:00.000Z',
  })
  expect(google).toEqual({
    id: 'g1',
    source: 'google',
    externalId: 'google-1',
    title: 'Sync',
    startAt: '2026-08-27T14:00:00-03:00',
    endAt: null,
    allDay: false,
    timezone: tz,
    createdAt: '2026-08-27T12:00:00.000Z',
    updatedAt: '2026-08-27T12:00:00.000Z',
  })

  const manual = parseEventRow({
    id: 'm1',
    source: 'manual',
    externalId: null,
    title: 'Lembrete',
    startAt: '2026-08-27T17:00:00.000Z',
    endAt: '2026-08-27T18:00:00.000Z',
    allDay: 0,
    timezone: tz,
    createdAt: '2026-08-27T12:00:00.000Z',
    updatedAt: '2026-08-27T12:00:00.000Z',
  })
  expect(manual?.source).toBe('manual')
  expect(manual && manual.source === 'manual' ? manual.externalId : 'x').toBeNull()
})

test('parseEventRow drops illegal source and externalId pairs', () => {
  expect(
    parseEventRow({
      id: 'g1',
      source: 'google',
      externalId: null,
      title: 'Sync',
      startAt: '2026-08-27T17:00:00.000Z',
      endAt: null,
      allDay: 0,
      timezone: tz,
      createdAt: '2026-08-27T12:00:00.000Z',
      updatedAt: '2026-08-27T12:00:00.000Z',
    }),
  ).toBeNull()
  expect(
    parseEventRow({
      id: 'm1',
      source: 'manual',
      externalId: 'nope',
      title: 'Lembrete',
      startAt: '2026-08-27T17:00:00.000Z',
      endAt: null,
      allDay: 0,
      timezone: tz,
      createdAt: '2026-08-27T12:00:00.000Z',
      updatedAt: '2026-08-27T12:00:00.000Z',
    }),
  ).toBeNull()
})

test('manualMutation is 404 missing, 409 google, ok manual', () => {
  expect(manualMutation(null)).toEqual({ ok: false, status: 404 })
  const google = parseEventRow({
    id: 'g1',
    source: 'google',
    externalId: 'google-1',
    title: 'Sync',
    startAt: '2026-08-27T17:00:00.000Z',
    endAt: null,
    allDay: 0,
    timezone: tz,
    createdAt: '2026-08-27T12:00:00.000Z',
    updatedAt: '2026-08-27T12:00:00.000Z',
  })
  expect(google).not.toBeNull()
  expect(manualMutation(google)).toEqual({ ok: false, status: 409 })
  const manual = parseEventRow({
    id: 'm1',
    source: 'manual',
    externalId: null,
    title: 'Lembrete',
    startAt: '2026-08-27T17:00:00.000Z',
    endAt: null,
    allDay: 0,
    timezone: tz,
    createdAt: '2026-08-27T12:00:00.000Z',
    updatedAt: '2026-08-27T12:00:00.000Z',
  })
  expect(manual).not.toBeNull()
  expect(manualMutation(manual)).toEqual({ ok: true, event: manual })
})
