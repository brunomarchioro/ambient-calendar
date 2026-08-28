import { index, integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core'

export const events = sqliteTable(
  'Event',
  {
    id: text('id').primaryKey(),
    source: text('source', { enum: ['google', 'manual'] }).notNull(),
    externalId: text('externalId'),
    googleAccountId: text('googleAccountId'),
    googleCalendarId: text('googleCalendarId'),
    title: text('title').notNull(),
    startAt: text('startAt').notNull(),
    endAt: text('endAt'),
    allDay: integer('allDay', { mode: 'boolean' }).notNull(),
    timezone: text('timezone').notNull(),
    createdAt: text('createdAt').notNull(),
    updatedAt: text('updatedAt').notNull(),
  },
  (table) => [
    uniqueIndex('Event_google_mirror_unique').on(
      table.googleAccountId,
      table.googleCalendarId,
      table.externalId,
    ),
    index('Event_googleAccountId_idx').on(table.googleAccountId),
  ],
)

export type EventRow = typeof events.$inferSelect
