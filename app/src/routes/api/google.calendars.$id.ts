import { env } from 'cloudflare:workers'
import { createFileRoute } from '@tanstack/react-router'
import { parsePatchGoogleCalendar } from '@/shared/google/types'
import { patchGoogleCalendarUseCase } from '@/server/google/use-cases/google-connection'

export const Route = createFileRoute('/api/google/calendars/$id')({
  server: {
    handlers: {
      PATCH: async ({ params, request }) => {
        let body: unknown
        try {
          body = await request.json()
        } catch {
          return Response.json({ error: 'invalid json' }, { status: 400 })
        }
        const parsed = parsePatchGoogleCalendar(body)
        if (!parsed.success) return Response.json({ error: 'invalid body' }, { status: 400 })
        const result = await patchGoogleCalendarUseCase({
          db: env.DB,
          calendarRowId: params.id,
          enabled: parsed.data.enabled,
        })
        if (!result.ok) return Response.json({ error: 'not found' }, { status: 404 })
        return Response.json({ ok: true })
      },
    },
  },
})
