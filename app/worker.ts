import handler from '@tanstack/react-start/server-entry'
import { listEnabledSyncTargets } from '@/server/google/repository/google-queries'
import { readOAuthForSync } from '@/server/google/use-cases/google-connection'
import { d1MirrorStore } from '@/server/sync/repository/d1-mirror-store'
import { fixtureScope } from '@/server/sync/services/memory-store'
import { FIXTURE_GOOGLE_ITEMS } from '@/server/sync/sync.fixtures'
import { runScheduledSyncUseCase } from '@/server/sync/use-cases/run-scheduled-sync'
import { getOrSeedSettingsUseCase } from '@/server/settings/use-cases/put-settings'

export default {
  fetch: handler.fetch,
  async scheduled(_controller: unknown, env: Env) {
    const settings = await getOrSeedSettingsUseCase(env.DB)
    const oauth = readOAuthForSync(env)
    const targets = await listEnabledSyncTargets(env.DB)
    const useFixture =
      (env.GOOGLE_SYNC_FIXTURE === '1' || env.SYNC_FIXTURE === '1') && targets.length === 0
    const outcome = await runScheduledSyncUseCase({
      settings,
      oauth,
      targets,
      fetch,
      store: d1MirrorStore(env.DB),
      db: env.DB,
      now: new Date(),
      log: console,
      items: useFixture ? FIXTURE_GOOGLE_ITEMS : undefined,
      fixtureScope: useFixture ? fixtureScope() : undefined,
    })
    if (outcome.kind !== 'ok' && outcome.kind !== 'partial') console.error('google_sync:', outcome)
  },
}
