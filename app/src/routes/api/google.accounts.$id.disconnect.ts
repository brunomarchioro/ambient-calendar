import { env } from 'cloudflare:workers'
import { createFileRoute } from '@tanstack/react-router'
import { disconnectGoogleAccountUseCase } from '@/server/google/use-cases/google-connection'

export const Route = createFileRoute('/api/google/accounts/$id/disconnect')({
  server: {
    handlers: {
      POST: async ({ params }) => {
        const result = await disconnectGoogleAccountUseCase({
          db: env.DB,
          env,
          accountId: params.id,
        })
        if (!result.ok) return Response.json({ error: 'not found' }, { status: 404 })
        return Response.json({ ok: true })
      },
    },
  },
})
