import handler from '@tanstack/react-start/server-entry'
import { getOrSeedSettings } from './settings'
import { FIXTURE_GOOGLE_ITEMS } from './sync.fixtures'
import { d1Store, readGoogleSecrets, runScheduledSync } from './sync'

export default {
  fetch: handler.fetch,
  async scheduled(_controller: unknown, env: Env) {
    const settings = await getOrSeedSettings(env.DB)
    const secrets = readGoogleSecrets(env)
    const outcome = await runScheduledSync({
      settings,
      secrets,
      fetch,
      store: d1Store(env.DB),
      now: new Date(),
      log: console,
      items: !secrets && env.SYNC_FIXTURE === '1' ? FIXTURE_GOOGLE_ITEMS : undefined,
    })
    if (outcome.kind !== 'ok') console.error('google_sync:', outcome)
  },
}
