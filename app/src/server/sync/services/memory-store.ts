import type { MappedEvent, MirrorStore, SyncEventRow } from '@/server/sync/types'

export function memoryStore(seed: SyncEventRow[] = []): MirrorStore & { rows: SyncEventRow[] } {
  const rows = seed.map((row) => ({ ...row }))
  return {
    rows,
    async listGoogleExternalIds() {
      const ids: string[] = []
      for (const row of rows) {
        if (row.source === 'google' && row.externalId !== null) ids.push(row.externalId)
      }
      return ids
    },
    async upsertGoogle(event, nowIso, newId) {
      const existing = rows.find(
        (row) => row.source === 'google' && row.externalId === event.externalId,
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
      const keep = new Set(keepExternalIds)
      let deleted = 0
      for (let i = rows.length - 1; i >= 0; i -= 1) {
        const row = rows[i]
        if (row && row.source === 'google' && (row.externalId === null || !keep.has(row.externalId))) {
          rows.splice(i, 1)
          deleted += 1
        }
      }
      return deleted
    },
  }
}
