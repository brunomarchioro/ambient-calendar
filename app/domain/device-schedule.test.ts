import { expect, test } from 'vitest'
import { SETTINGS_DEFAULTS } from '@app/domain/settings'
import {
  formatIsoWithOffset,
  horizonEnd,
  toDeviceSchedule,
  type EventRow,
} from '@app/domain/device-schedule'

const now = new Date('2026-08-27T14:00:00-03:00')
const settings = { ...SETTINGS_DEFAULTS }

function row(partial: Partial<EventRow> & Pick<EventRow, 'id' | 'startAt'>): EventRow {
  return {
    title: partial.id,
    endAt: '2026-08-27T15:00:00-03:00',
    allDay: 0,
    ...partial,
  }
}

test('envelope has settings fields and omits source externalId lookaheadDays audit', () => {
  const schedule = toDeviceSchedule({
    now,
    settings,
    rows: [
      {
        id: 'evt_1',
        title: 'Reunião',
        startAt: '2026-08-27T14:00:00-03:00',
        endAt: '2026-08-27T15:00:00-03:00',
        allDay: 0,
      },
    ],
  })
  expect(schedule).toEqual({
    serverTime: '2026-08-27T14:00:00-03:00',
    timezone: 'America/Sao_Paulo',
    reminderMinutes: 30,
    showNextEvents: 2,
    events: [
      {
        id: 'evt_1',
        title: 'Reunião',
        startAt: '2026-08-27T14:00:00-03:00',
        endAt: '2026-08-27T15:00:00-03:00',
        allDay: false,
      },
    ],
  })
  expect(schedule).not.toHaveProperty('lookaheadDays')
  expect(JSON.stringify(schedule)).not.toMatch(/source|externalId|createdAt|updatedAt/)
})

test('empty rows yield events []', () => {
  expect(toDeviceSchedule({ now, settings, rows: [] }).events).toEqual([])
})

test('showNextEvents is present and does not truncate events', () => {
  const rows = ['a', 'b', 'c'].map((id, index) =>
    row({
      id,
      startAt: `2026-08-27T1${5 + index}:00:00-03:00`,
      endAt: `2026-08-27T1${6 + index}:00:00-03:00`,
    }),
  )
  const schedule = toDeviceSchedule({ now, settings, rows })
  expect(schedule.showNextEvents).toBe(2)
  expect(schedule.events.map((event) => event.id)).toEqual(['a', 'b', 'c'])
})

test('half-open horizon includes now and excludes the end instant', () => {
  const atNow = row({ id: 'at-now', startAt: '2026-08-27T14:00:00-03:00' })
  const atHorizon = row({
    id: 'at-horizon',
    startAt: '2026-09-03T14:00:00-03:00',
    endAt: '2026-09-03T15:00:00-03:00',
  })
  const inside = row({
    id: 'inside',
    startAt: '2026-09-03T13:59:59-03:00',
    endAt: '2026-09-03T15:00:00-03:00',
  })
  const ids = toDeviceSchedule({
    now,
    settings,
    rows: [atNow, atHorizon, inside],
  }).events.map((event) => event.id)
  expect(ids).toEqual(['at-now', 'inside'])
  expect(horizonEnd(now, 7).toISOString()).toBe(new Date('2026-09-03T14:00:00-03:00').toISOString())
})

test('in-progress timed events overlap; ended and past point events do not', () => {
  const ids = toDeviceSchedule({
    now,
    settings,
    rows: [
      row({
        id: 'in-progress',
        startAt: '2026-08-27T13:00:00-03:00',
        endAt: '2026-08-27T15:00:00-03:00',
      }),
      row({
        id: 'ended',
        startAt: '2026-08-27T12:00:00-03:00',
        endAt: '2026-08-27T14:00:00-03:00',
      }),
      row({
        id: 'past-point',
        startAt: '2026-08-27T13:59:00-03:00',
        endAt: null,
      }),
      row({
        id: 'future-point',
        startAt: '2026-08-27T16:00:00-03:00',
        endAt: null,
      }),
    ],
  }).events.map((event) => event.id)
  expect(ids).toEqual(['in-progress', 'future-point'])
})

test('all-day times are 00:00 in Settings timezone', () => {
  const event = toDeviceSchedule({
    now,
    settings,
    rows: [
      row({
        id: 'all-day',
        title: 'Feriado',
        startAt: '2026-08-28T00:00:00-03:00',
        endAt: '2026-08-29T00:00:00-03:00',
        allDay: 1,
      }),
    ],
  }).events[0]
  expect(event).toMatchObject({
    allDay: true,
    startAt: '2026-08-28T00:00:00-03:00',
    endAt: '2026-08-29T00:00:00-03:00',
  })
})

test('events sort by startAt ascending', () => {
  const ids = toDeviceSchedule({
    now,
    settings,
    rows: [
      row({ id: 'later', startAt: '2026-08-28T10:00:00-03:00', endAt: '2026-08-28T11:00:00-03:00' }),
      row({ id: 'sooner', startAt: '2026-08-27T16:00:00-03:00', endAt: '2026-08-27T17:00:00-03:00' }),
    ],
  }).events.map((event) => event.id)
  expect(ids).toEqual(['sooner', 'later'])
})

test('ISO strings carry a numeric offset', () => {
  expect(formatIsoWithOffset(now, 'America/Sao_Paulo')).toBe('2026-08-27T14:00:00-03:00')
  expect(formatIsoWithOffset(now, 'UTC')).toBe('2026-08-27T17:00:00+00:00')
})

test('unparseable instants throw for the 503 path', () => {
  expect(() =>
    toDeviceSchedule({
      now,
      settings,
      rows: [row({ id: 'bad', startAt: '2026-08-28T99:00:00-03:00' })],
    }),
  ).toThrow('invalid instant')
})
