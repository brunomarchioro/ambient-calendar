import handler from '@tanstack/react-start/server-entry'
import { d1MirrorStore } from '@/server/sync/repository/d1-mirror-store'
import { FIXTURE_GOOGLE_ITEMS } from '@/server/sync/sync.fixtures'
import { readGoogleSecrets } from '@/server/sync/types'
import { runScheduledSyncUseCase } from '@/server/sync/use-cases/run-scheduled-sync'
import { getOrSeedSettingsUseCase } from '@/server/settings/use-cases/put-settings'

export default {
  fetch: handler.fetch,
  async scheduled(_controller: unknown, env: Env) {
    const settings = await getOrSeedSettingsUseCase(env.DB)
    const secrets = readGoogleSecrets(env)
    const outcome = await runScheduledSyncUseCase({
      settings,
      secrets,
      fetch,
      store: d1MirrorStore(env.DB),
      now: new Date(),
      log: console,
      items: !secrets && env.SYNC_FIXTURE === '1' ? FIXTURE_GOOGLE_ITEMS : undefined,
    })
    if (outcome.kind !== 'ok') console.error('google_sync:', outcome)
  },
}
