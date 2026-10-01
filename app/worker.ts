import handler from '@tanstack/react-start/server-entry'
import { authorizeWebBasic } from '@/server/common/infra/authorize-web-basic'
import { readOAuthForSync } from '@/server/google/use-cases/google-connection'
import { handleMcpAuthorize } from '@/server/mcp/infra/mcp-auth-handler'
import { getMcpOAuthProvider } from '@/server/mcp/infra/mcp-oauth-provider'
import { runGoogleSyncUseCase } from '@/server/sync/use-cases/run-google-sync'
import { fixtureScope } from '@/server/sync/services/memory-store'
import { FIXTURE_GOOGLE_ITEMS } from '@/server/sync/sync.fixtures'
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
    const useFixture = (env.GOOGLE_SYNC_FIXTURE === '1' || env.SYNC_FIXTURE === '1')
    const outcome = await runGoogleSyncUseCase({ db: env.DB, settings, oauth, now: new Date(), log: console, items: useFixture ? FIXTURE_GOOGLE_ITEMS : undefined, fixtureScope: useFixture ? fixtureScope() : undefined })
    if (outcome.kind !== 'ok' && outcome.kind !== 'partial') console.error('google_sync:', outcome)
  },
}
