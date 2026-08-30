import { createFileRoute } from '@tanstack/react-router'
import { env } from 'cloudflare:workers'
import { parseEventWrite } from '@/shared/events/types'
import {
  deleteEventUseCase,
  updateEventUseCase,
} from '@/server/events/use-cases/event-mutations'
import { getOrSeedSettingsUseCase } from '@/server/settings/use-cases/put-settings'

export const Route = createFileRoute('/api/events/$id')({
  server: {
    handlers: {
      PUT: async ({ params, request }) => {
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
        const updated = await updateEventUseCase(env.DB, params.id, parsed.data, settings)
        if (!updated.ok) {
          const error = updated.status === 404 ? 'not found' : updated.status === 409 ? 'not manual' : 'invalid event'
          return Response.json({ error }, { status: updated.status })
        }
        return Response.json(updated.event)
      },
      DELETE: async ({ params }) => {
        const deleted = await deleteEventUseCase(env.DB, params.id)
        if (!deleted.ok) {
          const error = deleted.status === 404 ? 'not found' : 'not manual'
          return Response.json({ error }, { status: deleted.status })
        }
        return new Response(null, { status: 204 })
      },
    },
  },
})
