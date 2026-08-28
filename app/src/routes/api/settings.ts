import { createFileRoute } from '@tanstack/react-router'
import { env } from 'cloudflare:workers'
import { parseSettings } from '@/shared/settings/types'
import {
  getOrSeedSettingsUseCase,
  putSettingsUseCase,
} from '@/server/settings/use-cases/put-settings'

export const Route = createFileRoute('/api/settings')({
  server: {
    handlers: {
      GET: async () => Response.json(await getOrSeedSettingsUseCase(env.DB)),
      PUT: async ({ request }) => {
        let body: unknown
        try {
          body = await request.json()
        } catch {
          return Response.json({ error: 'invalid json' }, { status: 400 })
        }
        const parsed = parseSettings(body)
        if (!parsed.success) {
          return Response.json({ error: 'invalid settings' }, { status: 400 })
        }
        return Response.json(await putSettingsUseCase(env.DB, parsed.data))
      },
    },
  },
})
