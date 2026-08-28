import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'

export const events = sqliteTable('Event', {
  id: text('id').primaryKey(),
  source: text('source', { enum: ['google', 'manual'] }).notNull(),
  externalId: text('externalId').unique(),
  title: text('title').notNull(),
  startAt: text('startAt').notNull(),
  endAt: text('endAt'),
  allDay: integer('allDay', { mode: 'boolean' }).notNull(),
  timezone: text('timezone').notNull(),
  createdAt: text('createdAt').notNull(),
  updatedAt: text('updatedAt').notNull(),
})

export type EventRow = typeof events.$inferSelect
