import { and, eq } from 'drizzle-orm'
import { createDb } from '@/server/common/infra/db'
import { events } from '@/server/events/repository/schema'
import type { GoogleMirrorScope, MappedEvent, MirrorStore } from '@/server/sync/types'

export function d1MirrorStore(db: D1Database): MirrorStore {
  const drizzle = createDb(db)
  return {
    async upsertGoogle(scope, event, nowIso, newId) {
      const existing = await drizzle
        .select({ id: events.id })
        .from(events)
        .where(
          and(
            eq(events.source, 'google'),
            eq(events.googleAccountId, scope.googleAccountId),
            eq(events.googleCalendarId, scope.googleCalendarId),
            eq(events.externalId, event.externalId),
          ),
        )
        .limit(1)
      if (existing[0]) {
        await drizzle
          .update(events)
          .set({
            title: event.title,
            startAt: event.startAt,
            endAt: event.endAt,
            allDay: event.allDay,
            timezone: event.timezone,
            updatedAt: nowIso,
          })
          .where(eq(events.id, existing[0].id))
        return
      }
      await drizzle.insert(events).values({
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
      const rows = await drizzle
        .select({ externalId: events.externalId })
        .from(events)
        .where(
          and(
            eq(events.source, 'google'),
            eq(events.googleAccountId, scope.googleAccountId),
            eq(events.googleCalendarId, scope.googleCalendarId),
          ),
        )
      const keep = new Set(keepExternalIds)
      let deleted = 0
      for (const row of rows) {
        if (row.externalId === null || keep.has(row.externalId)) continue
        await drizzle.delete(events).where(
          and(
            eq(events.source, 'google'),
            eq(events.googleAccountId, scope.googleAccountId),
            eq(events.googleCalendarId, scope.googleCalendarId),
            eq(events.externalId, row.externalId),
          ),
        )
        deleted += 1
      }
      return deleted
    },
  }
}
