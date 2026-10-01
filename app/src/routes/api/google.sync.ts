import { env } from 'cloudflare:workers'
import { createFileRoute } from '@tanstack/react-router'
import { googleSyncResultFromOutcome } from '@/server/google/services/google-sync-result'
import { readOAuthForSync } from '@/server/google/use-cases/google-connection'
import { getOrSeedSettingsUseCase } from '@/server/settings/use-cases/put-settings'
import { runGoogleSyncUseCase } from '@/server/sync/use-cases/run-google-sync'

export const Route = createFileRoute('/api/google/sync')({
  server: {
    handlers: {
      POST: async () => {
        const settings = await getOrSeedSettingsUseCase(env.DB)
        const outcome = await runGoogleSyncUseCase({ db: env.DB, settings, oauth: readOAuthForSync(env), now: new Date(), log: console })
        return Response.json(googleSyncResultFromOutcome(outcome))
      },
    },
  },
})
