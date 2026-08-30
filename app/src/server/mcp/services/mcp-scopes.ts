export const MCP_SCOPE_READ = 'reminders:read' as const
export const MCP_SCOPE_WRITE = 'reminders:write' as const

export type McpScope = typeof MCP_SCOPE_READ | typeof MCP_SCOPE_WRITE

export const MCP_SCOPES_SUPPORTED: readonly McpScope[] = [MCP_SCOPE_READ, MCP_SCOPE_WRITE]

export function hasMcpScope(scopes: readonly string[] | undefined, required: McpScope): boolean {
  return scopes?.includes(required) ?? false
}

export function grantMcpScopes(requested: readonly string[]): McpScope[] {
  const allowed = new Set<string>(MCP_SCOPES_SUPPORTED)
  return requested.filter((scope): scope is McpScope => allowed.has(scope))
}

export function assertDeleteConfirmed(confirm: boolean): { ok: true } | { ok: false; message: string } {
  if (!confirm) {
    return { ok: false, message: 'delete_reminder exige confirm: true' }
  }
  return { ok: true }
}
