import { McpServer } from '@modelcontextprotocol/server'
import { env } from 'cloudflare:workers'
import { z } from 'zod'
import {
  createReminderAction,
  deleteReminderAction,
  listRemindersAction,
  listUpcomingEventsAction,
  updateReminderAction,
} from '@/server/mcp/infra/reminder-tools'
import { eventWriteSchema } from '@/shared/events/types'

const REMINDER_NOTE =
  'Lembrete = Event manual (source=manual). Não confundir com Alerta do display ESP32 (estado de apresentação).'

const daysAheadSchema = z.number().int().min(1).max(90).optional()

function toolScopes(context: { http?: { authInfo?: { scopes?: string[] } } }) {
  return context.http?.authInfo?.scopes
}

export function buildAlertsMcpServer() {
  const server = new McpServer({ name: 'ambient-calendar', version: '1.0.0' })

  server.registerTool(
    'list_reminders',
    {
      description: `Lista Lembretes (Events manuais). ${REMINDER_NOTE}`,
      inputSchema: z.object({ daysAhead: daysAheadSchema }),
    },
    async ({ daysAhead }, context) =>
      listRemindersAction(env.DB, toolScopes(context), daysAhead),
  )

  server.registerTool(
    'list_upcoming_events',
    {
      description: `Lista Events no horizonte (Google + manual, read-only). ${REMINDER_NOTE}`,
      inputSchema: z.object({ daysAhead: daysAheadSchema }),
    },
    async ({ daysAhead }, context) =>
      listUpcomingEventsAction(env.DB, toolScopes(context), daysAhead),
  )

  server.registerTool(
    'create_reminder',
    {
      description: `Cria um Lembrete manual. ${REMINDER_NOTE}`,
      inputSchema: eventWriteSchema,
    },
    async (write, context) => createReminderAction(env.DB, toolScopes(context), write),
  )

  server.registerTool(
    'update_reminder',
    {
      description: `Atualiza um Lembrete manual por id. ${REMINDER_NOTE}`,
      inputSchema: eventWriteSchema.extend({ id: z.string().min(1) }),
    },
    async ({ id, ...write }, context) =>
      updateReminderAction(env.DB, toolScopes(context), id, write),
  )

  server.registerTool(
    'delete_reminder',
    {
      description: `Remove um Lembrete manual por id. Exige confirm: true. ${REMINDER_NOTE}`,
      inputSchema: z.object({
        id: z.string().min(1),
        confirm: z.literal(true),
      }),
    },
    async ({ id, confirm }, context) =>
      deleteReminderAction(env.DB, toolScopes(context), id, confirm),
  )

  return server
}
