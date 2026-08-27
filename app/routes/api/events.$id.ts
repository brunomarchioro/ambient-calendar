import { createFileRoute } from '@tanstack/react-router'
import { env } from 'cloudflare:workers'
import { deleteManualEvent, parseEventWrite, readJsonBody, updateManualEvent } from '../../event'

export const Route = createFileRoute('/api/events/$id')({
  server: {
    handlers: {
      PUT: async ({ params, request }) => {
        const json = await readJsonBody(request)
        if (!json.ok) return Response.json({ error: 'invalid json' }, { status: 400 })
        const parsed = parseEventWrite(json.body)
        if (!parsed.success) {
          return Response.json({ error: 'invalid event' }, { status: 400 })
        }
        const updated = await updateManualEvent(env.DB, params.id, parsed.data)
        if (!updated.ok) {
          const error = updated.status === 404 ? 'not found' : updated.status === 409 ? 'not manual' : 'invalid event'
          return Response.json({ error }, { status: updated.status })
        }
        return Response.json(updated.event)
      },
      DELETE: async ({ params }) => {
        const deleted = await deleteManualEvent(env.DB, params.id)
        if (!deleted.ok) {
          const error = deleted.status === 404 ? 'not found' : 'not manual'
          return Response.json({ error }, { status: deleted.status })
        }
        return new Response(null, { status: 204 })
      },
    },
  },
})
