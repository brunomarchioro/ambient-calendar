import { OAuthProvider } from '@cloudflare/workers-oauth-provider'
import { createMcpHandler } from 'agents/mcp/server'
import { buildAlertsMcpServer } from '@/server/mcp/build-mcp-server'
import { MCP_SCOPES_SUPPORTED } from '@/server/mcp/services/mcp-scopes'

const mcpHandler = createMcpHandler(buildAlertsMcpServer, { route: '/mcp' })

const mcpApiHandler = {
  fetch(request: Request, env: Env, ctx: ExecutionContext) {
    return mcpHandler(request, env, ctx)
  },
}

function mcpResourceMetadata(origin: string) {
  if (!origin.startsWith('https://')) return undefined
  return {
    resource: `${origin}/mcp`,
    authorization_servers: [origin],
    scopes_supported: [...MCP_SCOPES_SUPPORTED],
    resource_name: 'Ambient Calendar Display MCP',
  }
}

type DefaultHandler = {
  fetch(request: Request, env: Env, ctx: ExecutionContext): Response | Promise<Response>
}

let cachedOrigin: string | undefined
let cachedProvider: OAuthProvider | undefined

// ponytail: single-tenant — one OAuthProvider per origin per isolate; OK for personal deploy
export function getMcpOAuthProvider(request: Request, defaultHandler: DefaultHandler): OAuthProvider {
  const origin = new URL(request.url).origin
  if (cachedProvider && cachedOrigin === origin) return cachedProvider
  cachedOrigin = origin
  const resourceMetadata = mcpResourceMetadata(origin)
  cachedProvider = new OAuthProvider({
    apiRoute: '/mcp',
    apiHandler: mcpApiHandler,
    defaultHandler,
    authorizeEndpoint: '/authorize',
    tokenEndpoint: '/oauth/token',
    clientRegistrationEndpoint: '/oauth/register',
    scopesSupported: [...MCP_SCOPES_SUPPORTED],
    clientIdMetadataDocumentEnabled: true,
    allowPlainPKCE: false,
    ...(resourceMetadata ? { resourceMetadata } : {}),
  })
  return cachedProvider
}

export { mcpHandler }
