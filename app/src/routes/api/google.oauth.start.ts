import { env } from 'cloudflare:workers'
import { createFileRoute } from '@tanstack/react-router'
import { startGoogleOAuthUseCase } from '@/server/google/use-cases/google-connection'

export const Route = createFileRoute('/api/google/oauth/start')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url)
        const requestedMode = url.searchParams.get('mode')
        const mode = requestedMode === 'reconnect' || requestedMode === 'connect_tasks' ? requestedMode : 'connect'
        const googleAccountId = url.searchParams.get('accountId') ?? undefined
        const result = await startGoogleOAuthUseCase({
          db: env.DB,
          env,
          origin: url.origin,
          mode,
          googleAccountId,
        })
        if (result.kind === 'error') {
          return Response.json({ error: result.message }, { status: 400 })
        }
        return Response.redirect(result.url, 302)
      },
    },
  },
})
