import { and, asc, count, eq, inArray } from 'drizzle-orm'
import { createDb, type AppDb } from '@/server/common/infra/db'
import { events } from '@/server/events/repository/schema'
import {
  googleAccounts,
  googleCalendars,
  googleTaskLists,
  googleTasks,
  oauthStates,
  type GoogleAccountRow,
  type GoogleCalendarRow,
} from '@/server/google/repository/schema'
import type { GoogleAccountPublic } from '@/shared/google/types'

function dbOrCreate(d1: D1Database | AppDb) {
  return typeof d1 === 'object' && 'select' in d1 ? d1 : createDb(d1)
}

export async function countGoogleAccounts(db: D1Database | AppDb): Promise<number> {
  const drizzle = dbOrCreate(db)
  const rows = await drizzle.select({ id: googleAccounts.id }).from(googleAccounts)
  return rows.length
}

export async function listGoogleAccountsWithCalendars(
  db: D1Database | AppDb,
): Promise<GoogleAccountPublic[]> {
  const drizzle = dbOrCreate(db)
  const accounts = await drizzle
    .select()
    .from(googleAccounts)
    .orderBy(asc(googleAccounts.email))
  if (accounts.length === 0) return []
  const accountIds = accounts.map((a) => a.id)
  const calendars = await drizzle
    .select()
    .from(googleCalendars)
    .where(inArray(googleCalendars.googleAccountId, accountIds))
    .orderBy(asc(googleCalendars.summary))
  const taskLists = await drizzle.select().from(googleTaskLists)
  const byAccount = new Map<string, GoogleCalendarRow[]>()
  for (const cal of calendars) {
    const list = byAccount.get(cal.googleAccountId) ?? []
    list.push(cal)
    byAccount.set(cal.googleAccountId, list)
  }
  return accounts.map((account) => ({
    id: account.id,
    email: account.email,
    status: account.status,
    tasksAuthorized: account.tasksAuthorized,
    calendars: (byAccount.get(account.id) ?? []).map((cal) => ({
      id: cal.id,
      calendarId: cal.calendarId,
      summary: cal.summary,
      enabled: cal.enabled,
    })),
    taskLists: taskLists.filter((list) => list.googleAccountId === account.id).map((list) => ({ id: list.id, taskListId: list.taskListId, title: list.title, enabled: list.enabled })),
  }))
}

export async function setGoogleTaskListEnabled(db: D1Database | AppDb, id: string, enabled: boolean, updatedAt: string): Promise<boolean> {
  const drizzle = dbOrCreate(db)
  const [list] = await drizzle.select().from(googleTaskLists).where(eq(googleTaskLists.id, id)).limit(1)
  if (!list || !(await getGoogleAccount(db, list.googleAccountId))?.tasksAuthorized) return false
  await drizzle.update(googleTaskLists).set({ enabled, updatedAt }).where(eq(googleTaskLists.id, id))
  if (!enabled) await drizzle.delete(googleTasks).where(and(eq(googleTasks.googleAccountId, list.googleAccountId), eq(googleTasks.googleTaskListId, list.taskListId)))
  return true
}

export async function countAccountCalendars(
  db: D1Database | AppDb,
  googleAccountId: string,
): Promise<number> {
  const drizzle = dbOrCreate(db)
  const [row] = await drizzle
    .select({ value: count() })
    .from(googleCalendars)
    .where(eq(googleCalendars.googleAccountId, googleAccountId))
  return row?.value ?? 0
}

export async function getGoogleAccount(
  db: D1Database | AppDb,
  id: string,
): Promise<GoogleAccountRow | null> {
  const drizzle = dbOrCreate(db)
  const [row] = await drizzle.select().from(googleAccounts).where(eq(googleAccounts.id, id)).limit(1)
  return row ?? null
}

export async function getGoogleAccountByEmail(
  db: D1Database | AppDb,
  email: string,
): Promise<GoogleAccountRow | null> {
  const drizzle = dbOrCreate(db)
  const [row] = await drizzle
    .select()
    .from(googleAccounts)
    .where(eq(googleAccounts.email, email))
    .limit(1)
  return row ?? null
}

export async function updateGoogleAccountTokens(
  db: D1Database | AppDb,
  id: string,
  refreshTokenEnc: string,
  updatedAt: string,
): Promise<void> {
  const drizzle = dbOrCreate(db)
  await drizzle
    .update(googleAccounts)
    .set({ refreshTokenEnc, status: 'active', updatedAt })
    .where(eq(googleAccounts.id, id))
}

export async function setGoogleAccountTasksAuthorized(
  db: D1Database | AppDb,
  id: string,
  tasksAuthorized: boolean,
  updatedAt: string,
): Promise<void> {
  const drizzle = dbOrCreate(db)
  await drizzle.update(googleAccounts).set({ tasksAuthorized, updatedAt }).where(eq(googleAccounts.id, id))
}

export async function saveGoogleAccountTokens(
  db: D1Database | AppDb,
  row: {
    id: string
    email: string
    refreshTokenEnc: string
    status: 'active' | 'needs_reconnect'
    connectedAt: string
    updatedAt: string
    tasksAuthorized?: boolean
  },
): Promise<string> {
  const drizzle = dbOrCreate(db)
  const existing = await getGoogleAccountByEmail(db, row.email)
  if (existing) {
    await drizzle
      .update(googleAccounts)
      .set({
        refreshTokenEnc: row.refreshTokenEnc,
        status: 'active',
        updatedAt: row.updatedAt,
      })
      .where(eq(googleAccounts.id, existing.id))
    return existing.id
  }
  await drizzle.insert(googleAccounts).values({ ...row, status: 'active', tasksAuthorized: row.tasksAuthorized ?? false })
  return row.id
}

export async function updateGoogleAccountStatus(
  db: D1Database | AppDb,
  id: string,
  status: 'active' | 'needs_reconnect',
  updatedAt: string,
): Promise<void> {
  const drizzle = dbOrCreate(db)
  await drizzle
    .update(googleAccounts)
    .set({ status, updatedAt })
    .where(eq(googleAccounts.id, id))
}

export async function deleteGoogleAccount(db: D1Database | AppDb, id: string): Promise<void> {
  const drizzle = dbOrCreate(db)
  await drizzle.delete(events).where(eq(events.googleAccountId, id))
  await drizzle.delete(googleTasks).where(eq(googleTasks.googleAccountId, id))
  await drizzle.delete(googleTaskLists).where(eq(googleTaskLists.googleAccountId, id))
  await drizzle.delete(googleCalendars).where(eq(googleCalendars.googleAccountId, id))
  await drizzle.delete(googleAccounts).where(eq(googleAccounts.id, id))
}

export async function replaceAccountTaskLists(db: D1Database | AppDb, accountId: string, lists: { taskListId: string; title: string }[], nowIso: string, newId: () => string) {
  const drizzle = dbOrCreate(db)
  const existing = await drizzle.select().from(googleTaskLists).where(eq(googleTaskLists.googleAccountId, accountId))
  const byId = new Map(existing.map((list) => [list.taskListId, list]))
  for (const list of lists) {
    const previous = byId.get(list.taskListId)
    if (previous) await drizzle.update(googleTaskLists).set({ title: list.title, updatedAt: nowIso }).where(eq(googleTaskLists.id, previous.id))
    else await drizzle.insert(googleTaskLists).values({ id: newId(), googleAccountId: accountId, taskListId: list.taskListId, title: list.title, enabled: true, updatedAt: nowIso })
    byId.delete(list.taskListId)
  }
  for (const removed of byId.values()) {
    await drizzle.delete(googleTasks).where(and(eq(googleTasks.googleAccountId, accountId), eq(googleTasks.googleTaskListId, removed.taskListId)))
    await drizzle.delete(googleTaskLists).where(eq(googleTaskLists.id, removed.id))
  }
}

export async function listEnabledTaskTargets(db: D1Database | AppDb) {
  const drizzle = dbOrCreate(db)
  return drizzle.select({ googleAccountId: googleTaskLists.googleAccountId, googleTaskListId: googleTaskLists.taskListId, refreshTokenEnc: googleAccounts.refreshTokenEnc }).from(googleTaskLists).innerJoin(googleAccounts, eq(googleTaskLists.googleAccountId, googleAccounts.id)).where(and(eq(googleTaskLists.enabled, true), eq(googleAccounts.status, 'active'), eq(googleAccounts.tasksAuthorized, true)))
}

export async function listTaskAuthorizedAccounts(db: D1Database | AppDb) {
  const drizzle = dbOrCreate(db)
  return drizzle
    .select({ id: googleAccounts.id, email: googleAccounts.email, refreshTokenEnc: googleAccounts.refreshTokenEnc })
    .from(googleAccounts)
    .where(and(eq(googleAccounts.status, 'active'), eq(googleAccounts.tasksAuthorized, true)))
}

export async function replaceOpenGoogleTasks(db: D1Database | AppDb, scope: { googleAccountId: string; googleTaskListId: string }, items: { id: string; title: string; due: string | null }[], nowIso: string, newId: () => string) {
  const drizzle = dbOrCreate(db)
  const existing = await drizzle.select().from(googleTasks).where(and(eq(googleTasks.googleAccountId, scope.googleAccountId), eq(googleTasks.googleTaskListId, scope.googleTaskListId)))
  const byId = new Map(existing.map((task) => [task.externalId, task]))
  for (const task of items) {
    const previous = byId.get(task.id)
    if (previous) await drizzle.update(googleTasks).set({ title: task.title, due: task.due, updatedAt: nowIso }).where(eq(googleTasks.id, previous.id))
    else await drizzle.insert(googleTasks).values({ id: newId(), googleAccountId: scope.googleAccountId, googleTaskListId: scope.googleTaskListId, externalId: task.id, title: task.title, due: task.due, updatedAt: nowIso })
    byId.delete(task.id)
  }
  for (const removed of byId.values()) await drizzle.delete(googleTasks).where(eq(googleTasks.id, removed.id))
}

export async function listDeviceGoogleTasks(db: D1Database | AppDb) {
  const drizzle = dbOrCreate(db)
  return drizzle.select({ id: googleTasks.id, title: googleTasks.title, due: googleTasks.due }).from(googleTasks).innerJoin(googleTaskLists, and(eq(googleTasks.googleAccountId, googleTaskLists.googleAccountId), eq(googleTasks.googleTaskListId, googleTaskLists.taskListId))).where(eq(googleTaskLists.enabled, true)).orderBy(asc(googleTasks.due), asc(googleTasks.title))
}

export async function replaceAccountCalendars(
  db: D1Database | AppDb,
  googleAccountId: string,
  calendars: { calendarId: string; summary: string; enabled: boolean }[],
  nowIso: string,
  newId: () => string,
): Promise<void> {
  const drizzle = dbOrCreate(db)
  const existing = await drizzle
    .select()
    .from(googleCalendars)
    .where(eq(googleCalendars.googleAccountId, googleAccountId))
  const existingByApiId = new Map(existing.map((c) => [c.calendarId, c]))
  const seen = new Set<string>()
  for (const cal of calendars) {
    seen.add(cal.calendarId)
    const prev = existingByApiId.get(cal.calendarId)
    if (prev) {
      await drizzle
        .update(googleCalendars)
        .set({ summary: cal.summary, enabled: cal.enabled, updatedAt: nowIso })
        .where(eq(googleCalendars.id, prev.id))
    } else {
      await drizzle.insert(googleCalendars).values({
        id: newId(),
        googleAccountId,
        calendarId: cal.calendarId,
        summary: cal.summary,
        enabled: cal.enabled,
        updatedAt: nowIso,
      })
    }
  }
  for (const cal of existing) {
    if (!seen.has(cal.calendarId)) {
      await drizzle.delete(events).where(
        and(eq(events.googleAccountId, googleAccountId), eq(events.googleCalendarId, cal.calendarId)),
      )
      await drizzle.delete(googleCalendars).where(eq(googleCalendars.id, cal.id))
    }
  }
}

export async function getGoogleCalendar(
  db: D1Database | AppDb,
  id: string,
): Promise<GoogleCalendarRow | null> {
  const drizzle = dbOrCreate(db)
  const [row] = await drizzle.select().from(googleCalendars).where(eq(googleCalendars.id, id)).limit(1)
  return row ?? null
}

export async function setGoogleCalendarEnabled(
  db: D1Database | AppDb,
  id: string,
  enabled: boolean,
  updatedAt: string,
): Promise<void> {
  const drizzle = dbOrCreate(db)
  await drizzle
    .update(googleCalendars)
    .set({ enabled, updatedAt })
    .where(eq(googleCalendars.id, id))
  if (!enabled) {
    const cal = await getGoogleCalendar(db, id)
    if (cal) {
      await drizzle.delete(events).where(
        and(
          eq(events.googleAccountId, cal.googleAccountId),
          eq(events.googleCalendarId, cal.calendarId),
        ),
      )
    }
  }
}

export async function listEnabledSyncTargets(db: D1Database | AppDb) {
  const drizzle = dbOrCreate(db)
  const accounts = await drizzle
    .select()
    .from(googleAccounts)
    .where(eq(googleAccounts.status, 'active'))
  if (accounts.length === 0) return []
  const accountIds = accounts.map((a) => a.id)
  const calendars = await drizzle
    .select()
    .from(googleCalendars)
    .where(and(inArray(googleCalendars.googleAccountId, accountIds), eq(googleCalendars.enabled, true)))
  const accountById = new Map(accounts.map((a) => [a.id, a]))
  return calendars.flatMap((cal) => {
    const account = accountById.get(cal.googleAccountId)
    if (!account) return []
    return [
      {
        googleAccountId: account.id,
        googleCalendarId: cal.calendarId,
        refreshTokenEnc: account.refreshTokenEnc,
        email: account.email,
      },
    ]
  })
}

export async function insertOAuthState(
  db: D1Database | AppDb,
  row: { nonce: string; mode: 'connect' | 'reconnect' | 'connect_tasks'; googleAccountId: string | null; createdAt: string },
): Promise<void> {
  const drizzle = dbOrCreate(db)
  await drizzle.insert(oauthStates).values(row)
}

export async function consumeOAuthState(
  db: D1Database | AppDb,
  nonce: string,
): Promise<{ mode: 'connect' | 'reconnect' | 'connect_tasks'; googleAccountId: string | null } | null> {
  const drizzle = dbOrCreate(db)
  const [row] = await drizzle.select().from(oauthStates).where(eq(oauthStates.nonce, nonce)).limit(1)
  if (!row) return null
  await drizzle.delete(oauthStates).where(eq(oauthStates.nonce, nonce))
  const ageMs = Date.now() - new Date(row.createdAt).getTime()
  if (ageMs > 10 * 60 * 1000) return null
  return { mode: row.mode, googleAccountId: row.googleAccountId }
}

export async function calendarSummaryByEventKeys(db: D1Database | AppDb) {
  const drizzle = dbOrCreate(db)
  const rows = await drizzle.select().from(googleCalendars)
  const map = new Map<string, string>()
  for (const row of rows) {
    map.set(`${row.googleAccountId}:${row.calendarId}`, row.summary)
  }
  return map
}
