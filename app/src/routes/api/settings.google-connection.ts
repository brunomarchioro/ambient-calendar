import { createFileRoute } from '@tanstack/react-router'
import { env } from 'cloudflare:workers'
import { getOrSeedSettingsUseCase } from '@/server/settings/use-cases/put-settings'
import { d1MirrorStore } from '@/server/sync/repository/d1-mirror-store'
import { readGoogleSecrets } from '@/server/sync/types'
import { testGoogleConnectionUseCase } from '@/server/sync/use-cases/test-google-connection'

export const Route = createFileRoute('/api/settings/google-connection')({
  server: {
    handlers: {
      POST: async () =>
        Response.json(
          await testGoogleConnectionUseCase({
            settings: await getOrSeedSettingsUseCase(env.DB),
            secrets: readGoogleSecrets(env),
            fetch,
            store: d1MirrorStore(env.DB),
            now: new Date(),
          }),
        ),
    },
  },
})
