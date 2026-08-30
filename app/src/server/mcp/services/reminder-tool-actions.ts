import type { EventPublic, ManualEvent } from '@/shared/events/types'
import { MCP_SCOPE_READ, MCP_SCOPE_WRITE } from '@/server/mcp/services/mcp-scopes'

export function filterManualReminders(events: readonly EventPublic[]): ManualEvent[] {
  return events.filter((event): event is ManualEvent => event.source === 'manual')
}

export function mcpTextResult(payload: unknown, isError = false) {
  return {
    content: [{ type: 'text' as const, text: JSON.stringify(payload, null, 2) }],
    ...(isError ? { isError: true as const } : {}),
  }
}

export function mcpScopeDenied(required: typeof MCP_SCOPE_READ | typeof MCP_SCOPE_WRITE) {
  return mcpTextResult({ error: `scope ${required} required` }, true)
}
