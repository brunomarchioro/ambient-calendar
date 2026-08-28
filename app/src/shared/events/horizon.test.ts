import { expect, test } from 'vitest'
import { horizonEnd, selectEventsInHorizon } from '@/shared/events/horizon'

const now = new Date('2026-08-27T14:00:00-03:00')

function row(partial: { id: string; startAt: string; endAt?: string | null }) {
  return {
    id: partial.id,
    title: partial.id,
    startAt: partial.startAt,
    endAt: partial.endAt !== undefined ? partial.endAt : '2026-08-27T15:00:00-03:00',
    allDay: false,
  }
}

test('horizonEnd adds lookaheadDays in local ms', () => {
  expect(horizonEnd(now, 7).toISOString()).toBe(new Date('2026-09-03T14:00:00-03:00').toISOString())
})

test('selectEventsInHorizon keeps overlap in the lookahead window', () => {
  const google = row({ id: 'g1', startAt: '2026-08-27T14:00:00-03:00' })
  const lembrete = row({ id: 'm1', startAt: '2026-08-27T16:00:00-03:00', endAt: null })
  const atNow = new Date('2026-08-27T13:00:00-03:00')
  expect(selectEventsInHorizon([google, lembrete], { now: atNow, lookaheadDays: 7 }).map((e) => e.id)).toEqual([
    'g1',
    'm1',
  ])
  const later = new Date('2026-08-27T15:00:00-03:00')
  expect(selectEventsInHorizon([google, lembrete], { now: later, lookaheadDays: 7 }).map((e) => e.id)).toEqual(['m1'])
})

test('selectEventsInHorizon drops Events past the lookahead horizon', () => {
  const early = new Date('2026-08-20T12:00:00-03:00')
  expect(
    selectEventsInHorizon([row({ id: 'g1', startAt: '2026-08-27T14:00:00-03:00' })], {
      now: early,
      lookaheadDays: 1,
    }),
  ).toEqual([])
})

test('showNextEvents truncates after sort', () => {
  const rows = ['a', 'b', 'c'].map((id, index) =>
    row({
      id,
      startAt: `2026-08-27T1${5 + index}:00:00-03:00`,
      endAt: `2026-08-27T1${6 + index}:00:00-03:00`,
    }),
  )
  expect(
    selectEventsInHorizon(rows, { now, lookaheadDays: 7, showNextEvents: 2 }).map((event) => event.id),
  ).toEqual(['a', 'b'])
})

test('half-open horizon includes now and excludes the end instant', () => {
  const ids = selectEventsInHorizon(
    [
      row({ id: 'at-now', startAt: '2026-08-27T14:00:00-03:00' }),
      row({
        id: 'at-horizon',
        startAt: '2026-09-03T14:00:00-03:00',
        endAt: '2026-09-03T15:00:00-03:00',
      }),
      row({
        id: 'inside',
        startAt: '2026-09-03T13:59:59-03:00',
        endAt: '2026-09-03T15:00:00-03:00',
      }),
    ],
    { now, lookaheadDays: 7 },
  ).map((event) => event.id)
  expect(ids).toEqual(['at-now', 'inside'])
})

test('in-progress timed events overlap; ended and past point events do not', () => {
  const ids = selectEventsInHorizon(
    [
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
    { now, lookaheadDays: 7 },
  ).map((event) => event.id)
  expect(ids).toEqual(['in-progress', 'future-point'])
})

test('events sort by startAt ascending', () => {
  const ids = selectEventsInHorizon(
    [
      row({ id: 'later', startAt: '2026-08-28T10:00:00-03:00', endAt: '2026-08-28T11:00:00-03:00' }),
      row({ id: 'sooner', startAt: '2026-08-27T16:00:00-03:00', endAt: '2026-08-27T17:00:00-03:00' }),
    ],
    { now, lookaheadDays: 7 },
  ).map((event) => event.id)
  expect(ids).toEqual(['sooner', 'later'])
})

test('unparseable instants throw', () => {
  expect(() =>
    selectEventsInHorizon([row({ id: 'bad', startAt: '2026-08-28T99:00:00-03:00' })], {
      now,
      lookaheadDays: 7,
    }),
  ).toThrow('invalid instant')
})
