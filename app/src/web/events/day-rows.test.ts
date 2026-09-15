import { expect, test } from 'vitest'
import { formatDayHeader, planDayRows } from '@/web/events/day-rows'

const TZ = 'America/Sao_Paulo'
const TODAY = new Date('2026-09-15T12:00:00-03:00')

function event(id: string, startAt: string) {
  return { id, startAt }
}

function rowShape(row: ReturnType<typeof planDayRows<{ id: string; startAt: string }>>[number]): string {
  if (row.kind === 'header') return `H:${row.label}`
  return `E:${row.event.id}`
}

test('today-only item has no header', () => {
  const rows = planDayRows([event('a', '2026-09-15T14:00:00-03:00')], { now: TODAY, timeZone: TZ })
  expect(rows.map(rowShape)).toEqual(['E:a'])
})

test('first item tomorrow gets header', () => {
  const rows = planDayRows([event('a', '2026-09-16T09:00:00-03:00')], { now: TODAY, timeZone: TZ })
  expect(rows.map(rowShape)).toEqual(['H:QUA 16', 'E:a'])
})

test('multi-day list mirrors host fixture', () => {
  const rows = planDayRows(
    [
      event('a', '2026-09-15T14:00:00-03:00'),
      event('b', '2026-09-16T09:00:00-03:00'),
      event('c', '2026-09-16T15:00:00-03:00'),
      event('d', '2026-09-17T10:00:00-03:00'),
    ],
    { now: TODAY, timeZone: TZ },
  )
  expect(rows.map(rowShape)).toEqual(['E:a', 'H:QUA 16', 'E:b', 'E:c', 'H:QUI 17', 'E:d'])
})

test('all-day on non-today day gets header from zoned midnight startAt', () => {
  const rows = planDayRows([event('a', '2026-09-16T00:00:00-03:00')], { now: TODAY, timeZone: TZ })
  expect(rows.map(rowShape)).toEqual(['H:QUA 16', 'E:a'])
})

test('near-midnight rollover uses settings timezone', () => {
  const nearMidnight = new Date('2026-09-15T23:59:00-03:00')
  const nextMorning = event('a', '2026-09-16T00:30:00-03:00')
  const sp = planDayRows([nextMorning], { now: nearMidnight, timeZone: TZ })
  expect(sp.map(rowShape)).toEqual(['H:QUA 16', 'E:a'])

  const utc = planDayRows([nextMorning], { now: nearMidnight, timeZone: 'UTC' })
  expect(utc.map(rowShape)).toEqual(['E:a'])
})

test('formatDayHeader has no zero-pad', () => {
  expect(formatDayHeader('2026-09-16')).toBe('QUA 16')
  expect(formatDayHeader('2026-09-06')).toBe('DOM 6')
})
