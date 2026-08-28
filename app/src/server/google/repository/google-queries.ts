import { and, asc, count, eq, inArray } from 'drizzle-orm'
import { createDb, type AppDb } from '@/server/common/infra/db'
import { events } from '@/server/events/repository/schema'
import {
  googleAccounts,
  googleCalendars,
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
    calendars: (byAccount.get(account.id) ?? []).map((cal) => ({
      id: cal.id,
      calendarId: cal.calendarId,
      summary: cal.summary,
      enabled: cal.enabled,
    })),
  }))
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

export async function saveGoogleAccountTokens(
  db: D1Database | AppDb,
  row: {
    id: string
    email: string
    refreshTokenEnc: string
    status: 'active' | 'needs_reconnect'
    connectedAt: string
    updatedAt: string
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
  await drizzle.insert(googleAccounts).values({ ...row, status: 'active' })
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
  await drizzle.delete(googleCalendars).where(eq(googleCalendars.googleAccountId, id))
  await drizzle.delete(googleAccounts).where(eq(googleAccounts.id, id))
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
  row: { nonce: string; mode: 'connect' | 'reconnect'; googleAccountId: string | null; createdAt: string },
): Promise<void> {
  const drizzle = dbOrCreate(db)
  await drizzle.insert(oauthStates).values(row)
}

export async function consumeOAuthState(
  db: D1Database | AppDb,
  nonce: string,
): Promise<{ mode: 'connect' | 'reconnect'; googleAccountId: string | null } | null> {
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
