import { env } from 'cloudflare:workers'
import { createFileRoute } from '@tanstack/react-router'
import { httpFetch } from '@/server/common/infra/http-fetch'
import { googleSyncResultFromOutcome } from '@/server/google/services/google-sync-result'
import { listEnabledSyncTargets } from '@/server/google/repository/google-queries'
import { readOAuthForSync } from '@/server/google/use-cases/google-connection'
import { getOrSeedSettingsUseCase } from '@/server/settings/use-cases/put-settings'
import { d1MirrorStore } from '@/server/sync/repository/d1-mirror-store'
import { runScheduledSyncUseCase } from '@/server/sync/use-cases/run-scheduled-sync'

export const Route = createFileRoute('/api/google/sync')({
  server: {
    handlers: {
      POST: async () => {
        const settings = await getOrSeedSettingsUseCase(env.DB)
        const outcome = await runScheduledSyncUseCase({
          settings,
          oauth: readOAuthForSync(env),
          targets: await listEnabledSyncTargets(env.DB),
          fetch: httpFetch,
          store: d1MirrorStore(env.DB),
          db: env.DB,
          now: new Date(),
          log: { error: () => {} },
        })
        return Response.json(googleSyncResultFromOutcome(outcome))
      },
    },
  },
})
