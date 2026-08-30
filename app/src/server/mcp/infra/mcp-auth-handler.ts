import {
  AuthorizationError,
  type AuthRequest,
  type OAuthHelpers,
} from '@cloudflare/workers-oauth-provider'
import { verifyWebBasicLogin } from '@/server/common/infra/authorize-web-basic'
import { grantMcpScopes, MCP_SCOPES_SUPPORTED } from '@/server/mcp/services/mcp-scopes'

type McpAuthEnv = {
  OAUTH_PROVIDER: OAuthHelpers
  WEB_BASIC_AUTH_USER?: string
  WEB_BASIC_AUTH_PASSWORD?: string
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

function oauthErrorResponse(error: AuthorizationError): Response {
  if (!error.redirectUri) {
    return new Response(error.description, { status: 400 })
  }
  const redirect = new URL(error.redirectUri)
  redirect.searchParams.set('error', error.code)
  redirect.searchParams.set('error_description', error.description)
  if (error.state) redirect.searchParams.set('state', error.state)
  if (error.issuer) redirect.searchParams.set('iss', error.issuer)
  return Response.redirect(redirect.toString(), 302)
}

function consentPage(clientName: string, clientId: string, scopes: readonly string[], state: string) {
  const scopeList = scopes.length > 0 ? scopes.join(', ') : MCP_SCOPES_SUPPORTED.join(', ')
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <title>Autorização MCP — Ambient Calendar Display</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 32rem; margin: 3rem auto; padding: 0 1rem; line-height: 1.5; }
    .card { border: 1px solid #ddd; border-radius: 8px; padding: 1.5rem; }
    label { display: block; margin-top: 0.75rem; }
    input[type=text], input[type=password] { width: 100%; padding: 0.5rem; box-sizing: border-box; }
    button { margin-top: 1rem; padding: 0.6rem 1rem; cursor: pointer; }
    .primary { background: #2563eb; color: #fff; border: none; border-radius: 4px; }
    .meta { background: #f4f4f5; padding: 0.75rem; border-radius: 4px; font-size: 0.9rem; }
  </style>
</head>
<body>
  <div class="card">
    <h1>Autorizar Cliente MCP</h1>
    <p class="meta"><strong>${escapeHtml(clientName)}</strong><br />Client ID: ${escapeHtml(clientId)}<br />Scopes: ${escapeHtml(scopeList)}</p>
    <p>Use as mesmas credenciais da UI web para permitir que este Cliente MCP liste ou administre Lembretes.</p>
    <form method="post" action="/authorize">
      <input type="hidden" name="oauth_state" value="${escapeHtml(state)}" />
      <label>Usuário<input type="text" name="username" autocomplete="username" required /></label>
      <label>Senha<input type="password" name="password" autocomplete="current-password" required /></label>
      <button class="primary" type="submit">Autorizar</button>
    </form>
  </div>
</body>
</html>`
}

function encodeOAuthState(request: AuthRequest): string {
  return btoa(JSON.stringify(request))
}

function decodeOAuthState(encoded: string): AuthRequest | null {
  try {
    return JSON.parse(atob(encoded)) as AuthRequest
  } catch {
    return null
  }
}

async function handleAuthorizeGet(request: Request, env: McpAuthEnv): Promise<Response> {
  let oauthRequest: AuthRequest
  try {
    oauthRequest = await env.OAUTH_PROVIDER.parseAuthRequest(request)
  } catch (error) {
    if (error instanceof AuthorizationError) return oauthErrorResponse(error)
    throw error
  }

  const client = await env.OAUTH_PROVIDER.lookupClient(oauthRequest.clientId)
  if (!client) return new Response('Cliente OAuth desconhecido', { status: 400 })

  const scopes =
    oauthRequest.scope.length > 0 ? oauthRequest.scope : [...MCP_SCOPES_SUPPORTED]

  return new Response(
    consentPage(client.clientName ?? 'Cliente MCP', client.clientId, scopes, encodeOAuthState(oauthRequest)),
    { headers: { 'Content-Type': 'text/html; charset=utf-8' } },
  )
}

async function handleAuthorizePost(request: Request, env: McpAuthEnv): Promise<Response> {
  const form = await request.formData()
  const encoded = form.get('oauth_state')
  const username = form.get('username')
  const password = form.get('password')

  if (typeof encoded !== 'string' || typeof username !== 'string' || typeof password !== 'string') {
    return new Response('Formulário inválido', { status: 400 })
  }

  if (!verifyWebBasicLogin(username, password, env.WEB_BASIC_AUTH_USER, env.WEB_BASIC_AUTH_PASSWORD)) {
    return new Response('Credenciais inválidas', { status: 401 })
  }

  const oauthRequest = decodeOAuthState(encoded)
  if (!oauthRequest) return new Response('Estado OAuth inválido', { status: 400 })

  const client = await env.OAUTH_PROVIDER.lookupClient(oauthRequest.clientId)
  const grantedScopes = grantMcpScopes(
    oauthRequest.scope.length > 0 ? oauthRequest.scope : [...MCP_SCOPES_SUPPORTED],
  )

  const { redirectTo } = await env.OAUTH_PROVIDER.completeAuthorization({
    request: oauthRequest,
    userId: username,
    metadata: { clientName: client?.clientName ?? oauthRequest.clientId },
    scope: grantedScopes,
    props: { userId: username },
  })

  return Response.redirect(redirectTo, 302)
}

export async function handleMcpAuthorize(request: Request, env: McpAuthEnv): Promise<Response> {
  if (request.method === 'GET') return handleAuthorizeGet(request, env)
  if (request.method === 'POST') return handleAuthorizePost(request, env)
  return new Response('Method Not Allowed', { status: 405 })
}
