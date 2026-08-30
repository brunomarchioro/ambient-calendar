import { createFileRoute } from '@tanstack/react-router'
import { env } from 'cloudflare:workers'
import { parseEventWrite } from '@/shared/events/types'
import {
  createEventUseCase,
  listEventsUseCase,
} from '@/server/events/use-cases/event-mutations'
import { getOrSeedSettingsUseCase } from '@/server/settings/use-cases/put-settings'

export const Route = createFileRoute('/api/events')({
  server: {
    handlers: {
      GET: async () => Response.json(await listEventsUseCase(env.DB)),
      POST: async ({ request }) => {
        let body: unknown
        try {
          body = await request.json()
        } catch {
          return Response.json({ error: 'invalid json' }, { status: 400 })
        }
        const parsed = parseEventWrite(body)
        if (!parsed.success) {
          return Response.json({ error: 'invalid event' }, { status: 400 })
        }
        const settings = await getOrSeedSettingsUseCase(env.DB)
        const created = await createEventUseCase(env.DB, parsed.data, settings)
        if (!created.ok) return Response.json({ error: 'invalid event' }, { status: 400 })
        return Response.json(created.event, { status: 201 })
      },
    },
  },
})
