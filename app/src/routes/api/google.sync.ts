import { env } from 'cloudflare:workers'
import { createFileRoute } from '@tanstack/react-router'
import { getOrSeedSettingsUseCase } from '@/server/settings/use-cases/put-settings'
import { runGoogleSyncUseCase } from '@/server/google/use-cases/google-connection'

export const Route = createFileRoute('/api/google/sync')({
  server: {
    handlers: {
      POST: async () =>
        Response.json(
          await runGoogleSyncUseCase({
            db: env.DB,
            settings: await getOrSeedSettingsUseCase(env.DB),
            env,
          }),
        ),
    },
  },
})
