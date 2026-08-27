import { createFileRoute } from '@tanstack/react-router'
import { env } from 'cloudflare:workers'
import { createManualEvent, listEvents, parseEventWrite, readJsonBody } from '../../event'

export const Route = createFileRoute('/api/events')({
  server: {
    handlers: {
      GET: async () => Response.json(await listEvents(env.DB)),
      POST: async ({ request }) => {
        const json = await readJsonBody(request)
        if (!json.ok) return Response.json({ error: 'invalid json' }, { status: 400 })
        const parsed = parseEventWrite(json.body)
        if (!parsed.success) {
          return Response.json({ error: 'invalid event' }, { status: 400 })
        }
        const created = await createManualEvent(env.DB, parsed.data)
        if (!created.ok) return Response.json({ error: 'invalid event' }, { status: 400 })
        return Response.json(created.event, { status: 201 })
      },
    },
  },
})
