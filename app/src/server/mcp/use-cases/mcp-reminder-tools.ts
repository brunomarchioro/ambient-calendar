import { selectEventsInHorizon } from '@/shared/events/horizon'
import type { EventWrite } from '@/shared/events/types'
import {
  createEventUseCase,
  deleteEventUseCase,
  listEventsUseCase,
  updateEventUseCase,
} from '@/server/events/use-cases/event-mutations'
import {
  filterManualReminders,
  mcpScopeDenied,
  mcpTextResult,
} from '@/server/mcp/services/reminder-tool-actions'
import { hasMcpScope, MCP_SCOPE_READ, MCP_SCOPE_WRITE, assertDeleteConfirmed } from '@/server/mcp/services/mcp-scopes'
import { getOrSeedSettingsUseCase } from '@/server/settings/use-cases/put-settings'

export async function listRemindersAction(
  db: D1Database,
  scopes: readonly string[] | undefined,
  daysAhead?: number,
) {
  if (!hasMcpScope(scopes, MCP_SCOPE_READ)) return mcpScopeDenied(MCP_SCOPE_READ)
  const all = await listEventsUseCase(db)
  let manual = filterManualReminders(all)
  if (daysAhead !== undefined) {
    manual = selectEventsInHorizon(manual, { now: new Date(), lookaheadDays: daysAhead })
  }
  return mcpTextResult(manual)
}

export async function listUpcomingEventsAction(
  db: D1Database,
  scopes: readonly string[] | undefined,
  daysAhead?: number,
) {
  if (!hasMcpScope(scopes, MCP_SCOPE_READ)) return mcpScopeDenied(MCP_SCOPE_READ)
  const settings = await getOrSeedSettingsUseCase(db)
  const lookaheadDays = daysAhead ?? settings.lookaheadDays
  const events = selectEventsInHorizon(await listEventsUseCase(db), {
    now: new Date(),
    lookaheadDays,
  })
  return mcpTextResult(events)
}

export async function createReminderAction(
  db: D1Database,
  scopes: readonly string[] | undefined,
  write: EventWrite,
) {
  if (!hasMcpScope(scopes, MCP_SCOPE_WRITE)) return mcpScopeDenied(MCP_SCOPE_WRITE)
  const created = await createEventUseCase(db, write)
  if (!created.ok) return mcpTextResult({ error: 'invalid event' }, true)
  return mcpTextResult(created.event)
}

export async function updateReminderAction(
  db: D1Database,
  scopes: readonly string[] | undefined,
  id: string,
  write: EventWrite,
) {
  if (!hasMcpScope(scopes, MCP_SCOPE_WRITE)) return mcpScopeDenied(MCP_SCOPE_WRITE)
  const updated = await updateEventUseCase(db, id, write)
  if (!updated.ok) {
    const error =
      updated.status === 404 ? 'not found' : updated.status === 409 ? 'not manual' : 'invalid event'
    return mcpTextResult({ error }, true)
  }
  return mcpTextResult(updated.event)
}

export async function deleteReminderAction(
  db: D1Database,
  scopes: readonly string[] | undefined,
  id: string,
  confirm: boolean,
) {
  if (!hasMcpScope(scopes, MCP_SCOPE_WRITE)) return mcpScopeDenied(MCP_SCOPE_WRITE)
  const confirmed = assertDeleteConfirmed(confirm)
  if (!confirmed.ok) return mcpTextResult({ error: confirmed.message }, true)
  const deleted = await deleteEventUseCase(db, id)
  if (!deleted.ok) {
    const error = deleted.status === 404 ? 'not found' : 'not manual'
    return mcpTextResult({ error }, true)
  }
  return mcpTextResult({ deleted: id })
}
