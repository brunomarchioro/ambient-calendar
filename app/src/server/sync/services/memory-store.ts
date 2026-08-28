import type { GoogleMirrorScope, MappedEvent, MirrorStore, SyncEventRow } from '@/server/sync/types'

export function memoryStore(seed: SyncEventRow[] = []): MirrorStore & { rows: SyncEventRow[] } {
  const rows = seed.map((row) => ({ ...row }))
  return {
    rows,
    async upsertGoogle(scope, event, nowIso, newId) {
      const existing = rows.find(
        (row) =>
          row.source === 'google' &&
          row.googleAccountId === scope.googleAccountId &&
          row.googleCalendarId === scope.googleCalendarId &&
          row.externalId === event.externalId,
      )
      if (existing) {
        existing.title = event.title
        existing.startAt = event.startAt
        existing.endAt = event.endAt
        existing.allDay = event.allDay
        existing.timezone = event.timezone
        existing.updatedAt = nowIso
        return
      }
      rows.push({
        id: newId(),
        source: 'google',
        externalId: event.externalId,
        googleAccountId: scope.googleAccountId,
        googleCalendarId: scope.googleCalendarId,
        title: event.title,
        startAt: event.startAt,
        endAt: event.endAt,
        allDay: event.allDay,
        timezone: event.timezone,
        createdAt: nowIso,
        updatedAt: nowIso,
      })
    },
    async deleteGoogleNotIn(scope, keepExternalIds) {
      const keep = new Set(keepExternalIds)
      let deleted = 0
      for (let i = rows.length - 1; i >= 0; i -= 1) {
        const row = rows[i]
        if (
          row &&
          row.source === 'google' &&
          row.googleAccountId === scope.googleAccountId &&
          row.googleCalendarId === scope.googleCalendarId &&
          (row.externalId === null || !keep.has(row.externalId))
        ) {
          rows.splice(i, 1)
          deleted += 1
        }
      }
      return deleted
    },
  }
}

export const FIXTURE_ACCOUNT_ID = 'fixture-account'
export const FIXTURE_CALENDAR_ID = 'primary'

export function fixtureScope(): GoogleMirrorScope {
  return { googleAccountId: FIXTURE_ACCOUNT_ID, googleCalendarId: FIXTURE_CALENDAR_ID }
}

export function mapFixtureItems(
  items: unknown[],
  timezone: string,
  mapGoogleItem: (item: unknown, timezone: string) => MappedEvent | null,
): MappedEvent[] {
  return items.flatMap((item) => {
    const event = mapGoogleItem(item, timezone)
    return event ? [event] : []
  })
}
