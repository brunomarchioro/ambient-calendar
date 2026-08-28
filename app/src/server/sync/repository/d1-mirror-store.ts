import { eq } from 'drizzle-orm'
import { createDb } from '@/server/common/infra/db'
import { events } from '@/server/events/repository/schema'
import type { MappedEvent, MirrorStore } from '@/server/sync/types'

export function d1MirrorStore(db: D1Database): MirrorStore {
  const drizzle = createDb(db)
  return {
    async listGoogleExternalIds() {
      const rows = await drizzle
        .select({ externalId: events.externalId })
        .from(events)
        .where(eq(events.source, 'google'))
      return rows.flatMap((row) => (row.externalId ? [row.externalId] : []))
    },
    async upsertGoogle(event: MappedEvent, nowIso: string, newId: () => string) {
      const existing = await drizzle
        .select({ id: events.id })
        .from(events)
        .where(eq(events.externalId, event.externalId))
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
        title: event.title,
        startAt: event.startAt,
        endAt: event.endAt,
        allDay: event.allDay,
        timezone: event.timezone,
        createdAt: nowIso,
        updatedAt: nowIso,
      })
    },
    async deleteGoogleNotIn(keepExternalIds) {
      const existing = await this.listGoogleExternalIds()
      const keep = new Set(keepExternalIds)
      let deleted = 0
      for (const externalId of existing) {
        if (keep.has(externalId)) continue
        await drizzle.delete(events).where(eq(events.externalId, externalId))
        deleted += 1
      }
      return deleted
    },
  }
}
