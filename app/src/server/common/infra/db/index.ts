import { drizzle } from 'drizzle-orm/d1'
import { events } from '@/server/events/repository/schema'
import { settings } from '@/server/settings/repository/schema'

export function createDb(d1: D1Database) {
  return drizzle(d1, { schema: { events, settings } })
}

export type AppDb = ReturnType<typeof createDb>
