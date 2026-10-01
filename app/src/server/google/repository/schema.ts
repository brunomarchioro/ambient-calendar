import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'

export const googleAccounts = sqliteTable('GoogleAccount', {
  id: text('id').primaryKey(),
  email: text('email').notNull(),
  refreshTokenEnc: text('refreshTokenEnc').notNull(),
  status: text('status', { enum: ['active', 'needs_reconnect'] }).notNull(),
  tasksAuthorized: integer('tasksAuthorized', { mode: 'boolean' }).notNull().default(false),
  connectedAt: text('connectedAt').notNull(),
  updatedAt: text('updatedAt').notNull(),
})

export const googleCalendars = sqliteTable('GoogleCalendar', {
  id: text('id').primaryKey(),
  googleAccountId: text('googleAccountId').notNull(),
  calendarId: text('calendarId').notNull(),
  summary: text('summary').notNull(),
  enabled: integer('enabled', { mode: 'boolean' }).notNull(),
  updatedAt: text('updatedAt').notNull(),
})

export const googleTaskLists = sqliteTable('GoogleTaskList', {
  id: text('id').primaryKey(),
  googleAccountId: text('googleAccountId').notNull(),
  taskListId: text('taskListId').notNull(),
  title: text('title').notNull(),
  enabled: integer('enabled', { mode: 'boolean' }).notNull(),
  updatedAt: text('updatedAt').notNull(),
})

export const googleTasks = sqliteTable('GoogleTask', {
  id: text('id').primaryKey(),
  googleAccountId: text('googleAccountId').notNull(),
  googleTaskListId: text('googleTaskListId').notNull(),
  externalId: text('externalId').notNull(),
  title: text('title').notNull(),
  due: text('due'),
  updatedAt: text('updatedAt').notNull(),
})

export const oauthStates = sqliteTable('OAuthState', {
  nonce: text('nonce').primaryKey(),
  mode: text('mode', { enum: ['connect', 'reconnect', 'connect_tasks'] }).notNull(),
  googleAccountId: text('googleAccountId'),
  createdAt: text('createdAt').notNull(),
})

export type GoogleAccountRow = typeof googleAccounts.$inferSelect
export type GoogleCalendarRow = typeof googleCalendars.$inferSelect
