import { env } from 'cloudflare:workers'
import { createFileRoute } from '@tanstack/react-router'
import { handleGoogleOAuthCallbackUseCase } from '@/server/google/use-cases/google-connection'

export const Route = createFileRoute('/api/google/oauth/callback')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url)
        const result = await handleGoogleOAuthCallbackUseCase({
          db: env.DB,
          env,
          origin: url.origin,
          code: url.searchParams.get('code'),
          state: url.searchParams.get('state'),
        })
        if (result.kind === 'error') {
          return Response.json({ error: result.message }, { status: 400 })
        }
        return Response.redirect(result.location, 302)
      },
    },
  },
})
