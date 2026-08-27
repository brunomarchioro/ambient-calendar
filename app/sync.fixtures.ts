export const FIXTURE_NOW = new Date('2026-08-27T17:00:00.000Z')

export const FIXTURE_TIMED = {
  id: 'google-timed-1',
  status: 'confirmed',
  summary: 'Reunião',
  start: { dateTime: '2026-08-27T14:00:00-03:00' },
  end: { dateTime: '2026-08-27T15:00:00-03:00' },
}

export const FIXTURE_ALLDAY = {
  id: 'google-allday-1',
  status: 'confirmed',
  summary: 'Feriado',
  start: { date: '2026-08-28' },
  end: { date: '2026-08-29' },
}

export const FIXTURE_INSTANCE = {
  id: 'series_20260827T170000Z',
  status: 'confirmed',
  recurringEventId: 'series',
  summary: 'Standup',
  start: { dateTime: '2026-08-27T14:00:00-03:00' },
  end: { dateTime: '2026-08-27T14:15:00-03:00' },
}

export const FIXTURE_CANCELLED = {
  id: 'google-cancelled',
  status: 'cancelled',
  summary: 'Gone',
  start: { dateTime: '2026-08-27T16:00:00-03:00' },
  end: { dateTime: '2026-08-27T17:00:00-03:00' },
}

export const FIXTURE_GOOGLE_ITEMS = [FIXTURE_TIMED, FIXTURE_ALLDAY, FIXTURE_INSTANCE]

export const TOKEN_OK = { access_token: 'ya29.test-token', expires_in: 3600, token_type: 'Bearer' }

export const TOKEN_INVALID_GRANT = {
  error: 'invalid_grant',
  error_description: 'Token has been expired or revoked.',
}
