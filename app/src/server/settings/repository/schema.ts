import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'

export const settings = sqliteTable('Settings', {
  id: integer('id').primaryKey(),
  timezone: text('timezone').notNull(),
  reminderMinutes: integer('reminderMinutes').notNull(),
  lookaheadDays: integer('lookaheadDays').notNull(),
  showNextEvents: integer('showNextEvents').notNull(),
})

export type SettingsRow = typeof settings.$inferSelect
