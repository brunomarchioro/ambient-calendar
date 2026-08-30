import { expect, test } from 'vitest'
import {
  assertDeleteConfirmed,
  grantMcpScopes,
  hasMcpScope,
  MCP_SCOPE_READ,
  MCP_SCOPE_WRITE,
} from '@/server/mcp/services/mcp-scopes'

test('hasMcpScope accepts granted scope', () => {
  expect(hasMcpScope(['reminders:read'], MCP_SCOPE_READ)).toBe(true)
  expect(hasMcpScope(['reminders:write'], MCP_SCOPE_WRITE)).toBe(true)
})

test('hasMcpScope rejects missing scope', () => {
  expect(hasMcpScope(['reminders:read'], MCP_SCOPE_WRITE)).toBe(false)
  expect(hasMcpScope(undefined, MCP_SCOPE_READ)).toBe(false)
})

test('grantMcpScopes keeps only supported scopes', () => {
  expect(grantMcpScopes(['reminders:read', 'admin', 'reminders:write'])).toEqual([
    'reminders:read',
    'reminders:write',
  ])
})

test('assertDeleteConfirmed requires explicit confirm', () => {
  expect(assertDeleteConfirmed(false).ok).toBe(false)
  expect(assertDeleteConfirmed(true)).toEqual({ ok: true })
})
