import { env } from 'cloudflare:workers'
import { createFileRoute } from '@tanstack/react-router'
import { listGoogleAccountsUseCase } from '@/server/google/use-cases/google-connection'

export const Route = createFileRoute('/api/google/accounts')({
  server: {
    handlers: {
      GET: async () => Response.json(await listGoogleAccountsUseCase(env.DB)),
    },
  },
})
