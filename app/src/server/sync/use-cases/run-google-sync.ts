import { httpFetch } from '@/server/common/infra/http-fetch'
import { decryptSecret } from '@/server/google/infra/token-crypto'
import { refreshAccessToken, type OAuthClientConfig } from '@/server/google/infra/google-oauth'
import { fetchGoogleTaskLists, fetchOpenGoogleTasks } from '@/server/google/infra/google-tasks-api'
import { listEnabledSyncTargets, listEnabledTaskTargets, listTaskAuthorizedAccounts, replaceAccountTaskLists, replaceOpenGoogleTasks } from '@/server/google/repository/google-queries'
import { d1MirrorStore } from '@/server/sync/repository/d1-mirror-store'
import { runScheduledSyncUseCase } from '@/server/sync/use-cases/run-scheduled-sync'
import type { Settings } from '@/shared/settings/types'

export async function runGoogleSyncUseCase(input: { db: D1Database; settings: Settings; oauth: OAuthClientConfig | null; log: { error: (...args: unknown[]) => void }; now: Date; items?: unknown[]; fixtureScope?: { googleAccountId: string; googleCalendarId: string } }) {
  const targets = await listEnabledSyncTargets(input.db)
  const outcome = await runScheduledSyncUseCase({ settings: input.settings, oauth: input.oauth, targets, fetch: httpFetch, store: d1MirrorStore(input.db), db: input.db, now: input.now, log: input.log, items: input.items && targets.length === 0 ? input.items : undefined, fixtureScope: input.items && targets.length === 0 ? input.fixtureScope : undefined })
  if (!input.oauth) return outcome

  const errors: string[] = []
  const nowIso = input.now.toISOString()
  for (const account of await listTaskAuthorizedAccounts(input.db)) {
    try {
      const refreshed = await refreshAccessToken({ clientId: input.oauth.clientId, clientSecret: input.oauth.clientSecret, refreshToken: await decryptSecret(account.refreshTokenEnc, input.oauth.encryptionKey), fetchImpl: httpFetch })
      if (!refreshed.ok) throw new Error(`token: ${refreshed.message}`)
      const lists = await fetchGoogleTaskLists(refreshed.accessToken, httpFetch)
      await replaceAccountTaskLists(input.db, account.id, lists.map((list) => ({ taskListId: list.id, title: list.title })), nowIso, () => crypto.randomUUID())
      for (const target of (await listEnabledTaskTargets(input.db)).filter((target) => target.googleAccountId === account.id)) {
        await replaceOpenGoogleTasks(input.db, target, await fetchOpenGoogleTasks({ accessToken: refreshed.accessToken, taskListId: target.googleTaskListId, fetchImpl: httpFetch }), nowIso, () => crypto.randomUUID())
      }
    } catch (error) {
      input.log.error('google_tasks_sync:', account.email, error)
      errors.push(`${account.email}/Tasks: ${error instanceof Error ? error.message : String(error)}`)
    }
  }
  if (errors.length === 0) {
    return outcome.kind === 'skipped' && outcome.reason === 'no_accounts' && (await listTaskAuthorizedAccounts(input.db)).length > 0
      ? { kind: 'ok' as const, upserted: 0, deleted: 0 }
      : outcome
  }
  if (outcome.kind === 'ok' || outcome.kind === 'partial') return { kind: 'partial' as const, upserted: outcome.upserted, deleted: outcome.deleted, errors: [...(outcome.kind === 'partial' ? outcome.errors : []), ...errors] }
  if (outcome.kind === 'skipped' && outcome.reason === 'no_accounts') return { kind: 'error' as const, message: errors.join('; ') }
  return outcome.kind === 'error' ? { kind: 'error' as const, message: `${outcome.message}; ${errors.join('; ')}` } : outcome
}
