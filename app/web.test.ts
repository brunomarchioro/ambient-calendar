import { expect, test } from 'vitest'
import { formatInTimeZone, instantFromWallClock, parseEventsJson } from './event'
import { SETTINGS_DEFAULTS, parseSettings } from './settings'
import {
  canMutateEvent,
  defaultLembreteStart,
  lembreteFormToWrite,
  parseLembreteForm,
  toDatetimeLocal,
  upcomingEvents,
} from './web'

const tz = SETTINGS_DEFAULTS.timezone

const google = {
  id: 'g1',
  source: 'google' as const,
  externalId: 'google-1',
  title: 'Sync',
  startAt: '2026-08-27T14:00:00-03:00',
  endAt: '2026-08-27T15:00:00-03:00',
  allDay: false,
  timezone: tz,
  createdAt: '2026-08-27T12:00:00.000Z',
  updatedAt: '2026-08-27T12:00:00.000Z',
}

const lembrete = {
  id: 'm1',
  source: 'manual' as const,
  externalId: null,
  title: 'Farmácia',
  startAt: '2026-08-27T16:00:00-03:00',
  endAt: null,
  allDay: false,
  timezone: tz,
  createdAt: '2026-08-27T12:00:00.000Z',
  updatedAt: '2026-08-27T12:00:00.000Z',
}

test('instantFromWallClock formats in Settings timezone', () => {
  const instant = instantFromWallClock('2026-08-27T14:00', tz)
  expect(formatInTimeZone(instant, tz)).toBe('2026-08-27T14:00:00-03:00')
})

test('parseEventsJson keeps the google | manual union', () => {
  expect(parseEventsJson([google, lembrete])).toEqual([google, lembrete])
  expect(parseEventsJson([{ ...google, source: 'manual' }])).toBeNull()
})

test('upcomingEvents keeps overlap in the lookahead window', () => {
  const now = new Date('2026-08-27T13:00:00-03:00')
  expect(upcomingEvents([google, lembrete], now, 7).map((event) => event.id)).toEqual(['g1', 'm1'])
  const later = new Date('2026-08-27T15:00:00-03:00')
  expect(upcomingEvents([google, lembrete], later, 7).map((event) => event.id)).toEqual(['m1'])
})

test('upcomingEvents drops Events past the lookahead horizon', () => {
  const now = new Date('2026-08-20T12:00:00-03:00')
  expect(upcomingEvents([google], now, 1)).toEqual([])
})

test('canMutateEvent is only true for Lembretes', () => {
  expect(canMutateEvent(google)).toBe(false)
  expect(canMutateEvent(lembrete)).toBe(true)
})

test('lembrete form maps to EventWrite and rejects an empty title', () => {
  const write = lembreteFormToWrite(
    { title: 'Dentista', allDay: false, start: '2026-08-27T14:00', end: '2026-08-27T15:00' },
    tz,
  )
  expect(write).toEqual({
    title: 'Dentista',
    startAt: '2026-08-27T14:00:00-03:00',
    endAt: '2026-08-27T15:00:00-03:00',
    allDay: false,
  })
  expect(parseLembreteForm({ title: '   ', allDay: false, start: '2026-08-27T14:00', end: '' }, tz).success).toBe(
    false,
  )
})

test('all-day lembrete form uses calendar dates', () => {
  const write = lembreteFormToWrite(
    { title: 'Feriado', allDay: true, start: '2026-08-27', end: '' },
    tz,
  )
  expect(write.startAt).toBe('2026-08-27T00:00:00-03:00')
  expect(write.endAt).toBeNull()
  expect(write.allDay).toBe(true)
})

test('toDatetimeLocal and default start stay in wall-clock form', () => {
  expect(toDatetimeLocal('2026-08-27T14:00:00-03:00', false)).toBe('2026-08-27T14:00')
  expect(toDatetimeLocal('2026-08-27T00:00:00-03:00', true)).toBe('2026-08-27')
  expect(defaultLembreteStart(new Date('2026-08-27T13:00:00-03:00'), tz)).toBe('2026-08-27T14:00')
})

test('settings form bounds match the API schema', () => {
  expect(parseSettings({ ...SETTINGS_DEFAULTS, reminderMinutes: 0 }).success).toBe(false)
  expect(parseSettings({ ...SETTINGS_DEFAULTS, reminderMinutes: 45 }).success).toBe(true)
  expect(parseSettings({ ...SETTINGS_DEFAULTS, lookaheadDays: 31 }).success).toBe(false)
  expect(parseSettings({ ...SETTINGS_DEFAULTS, showNextEvents: 6 }).success).toBe(false)
  expect(parseSettings({ ...SETTINGS_DEFAULTS, quietHours: true }).success).toBe(false)
})
