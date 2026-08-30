import { expect, test } from 'vitest'
import { filterManualReminders } from '@/server/mcp/services/reminder-tool-actions'
import type { EventPublic } from '@/shared/events/types'

const googleEvent: EventPublic = {
  id: 'g1',
  source: 'google',
  externalId: 'ext',
  googleAccountId: 'acc',
  googleCalendarId: 'cal',
  calendarSummary: 'Work',
  title: 'Standup',
  startAt: '2026-08-30T10:00:00-03:00',
  endAt: '2026-08-30T11:00:00-03:00',
  allDay: false,
  timezone: 'America/Sao_Paulo',
  createdAt: '2026-08-30T00:00:00.000Z',
  updatedAt: '2026-08-30T00:00:00.000Z',
}

const manualEvent: EventPublic = {
  id: 'm1',
  source: 'manual',
  externalId: null,
  title: 'Comprar leite',
  startAt: '2026-08-30T18:00:00-03:00',
  endAt: null,
  allDay: false,
  timezone: 'America/Sao_Paulo',
  createdAt: '2026-08-30T00:00:00.000Z',
  updatedAt: '2026-08-30T00:00:00.000Z',
}

test('filterManualReminders keeps only manual Events', () => {
  expect(filterManualReminders([googleEvent, manualEvent])).toEqual([manualEvent])
})
