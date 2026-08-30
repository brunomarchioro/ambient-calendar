import handler from '@tanstack/react-start/server-entry'
import { authorizeWebBasic } from '@/server/common/infra/authorize-web-basic'
import { httpFetch } from '@/server/common/infra/http-fetch'
import { listEnabledSyncTargets } from '@/server/google/repository/google-queries'
import { readOAuthForSync } from '@/server/google/use-cases/google-connection'
import { handleMcpAuthorize } from '@/server/mcp/infra/mcp-auth-handler'
import { getMcpOAuthProvider } from '@/server/mcp/infra/mcp-oauth-provider'
import { d1MirrorStore } from '@/server/sync/repository/d1-mirror-store'
import { fixtureScope } from '@/server/sync/services/memory-store'
import { FIXTURE_GOOGLE_ITEMS } from '@/server/sync/sync.fixtures'
import { runScheduledSyncUseCase } from '@/server/sync/use-cases/run-scheduled-sync'
import { getOrSeedSettingsUseCase } from '@/server/settings/use-cases/put-settings'

type McpAuthorizeEnv = Parameters<typeof handleMcpAuthorize>[1]
type TanStackWorkerFetch = (
  request: Request,
  env: Env,
  ctx: ExecutionContext,
) => Response | Promise<Response>

const defaultHandler = {
  fetch(request: Request, env: Env, ctx: ExecutionContext) {
    const url = new URL(request.url)
    if (url.pathname === '/authorize') {
      return handleMcpAuthorize(request, env as unknown as McpAuthorizeEnv)
    }
    const denied = authorizeWebBasic(request, env.WEB_BASIC_AUTH_USER, env.WEB_BASIC_AUTH_PASSWORD)
    if (denied) return denied
    return (handler.fetch as TanStackWorkerFetch)(request, env, ctx)
  },
}

export default {
  fetch(request: Request, env: Env, ctx: ExecutionContext) {
    return getMcpOAuthProvider(request, defaultHandler).fetch(request, env, ctx)
  },
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
      fetch: httpFetch,
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
