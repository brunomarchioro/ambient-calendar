# ADR 0012: Auth web via HTTP Basic no Worker (MVP pessoal)

A spec MVP original previa **Cloudflare Access na borda** para a UI admin e APIs de gestão. O deploy pessoal single-tenant usa **HTTP Basic Auth no Worker** (`authorizeWebBasic` em `worker.ts`), com credenciais em secrets `WEB_BASIC_AUTH_USER` / `WEB_BASIC_AUTH_PASSWORD`.

**Decidido (estado atual):**

- Basic Auth aplica-se a rotas não listadas em `PUBLIC_PATHS` (`authorize-web-basic.ts`): UI SPA, `/api/events`, `/api/settings`, sync manual Google, etc.
- **Sem Basic:** `/api/health`, `/api/device/schedule` (Bearer device), fluxo OAuth Google Calendar, endpoints **Autorização MCP** (`/mcp`, `/authorize`, `/oauth/*`, `/.well-known/*`).
- Se secrets Basic estiverem **ausentes**, o guard retorna `null` (pass-through) — útil só em dev local consciente; produção exige secrets.
- Header **`X-TSS_SHELL: true`:** TanStack Start envia na requisição do shell SPA (`ssr: false`). Bypass de Basic **só** nesse request inicial de HTML/assets do shell — o browser ainda precisa de credenciais nas chamadas `fetch` à API. Seguro porque o shell não expõe dados; APIs permanecem protegidas.

**Cloudflare Access:** adiado. Basic Auth no Worker é suficiente para MVP pessoal (um operador, Worker já atrás de DNS próprio). Migrar para Access quando houver multi-usuário ou política Zero Trust formal — substituir ou complementar Basic na borda, mantendo allowlist device/MCP/OAuth.

**Considered:** Access desde o dia 1 (rejeitado — setup extra sem ganho no single-tenant atual); Basic só na UI sem APIs (rejeitado — APIs REST ficariam abertas).

**Consequences:** documentar credenciais em onboarding (`app/README.md`); não prometer Access no `docs/index.md` como implementado.
