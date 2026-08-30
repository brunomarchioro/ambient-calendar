# ADR 0010: MCP para Lembretes com Autorização MCP (OAuth-only)

Cliente MCP (ChatGPT, Claude) lista e administra Lembretes via rota `/mcp` no mesmo Cloudflare Worker do app, protegida por **Autorização MCP** (`@cloudflare/workers-oauth-provider` + KV). Sem Bearer token alternativo: OAuth 2.1 desde o dia 1 (PKCE, DCR em `/register` para compatibilidade com ChatGPT). Login humano na tela de consent reutiliza as mesmas credenciais do HTTP Basic Auth da UI web. Deploy single-tenant: um humano, um conjunto de Events; vários Clientes MCP podem registrar-se.

**Tools (inglês; descriptions em PT):**

| Tool | Scope | Comportamento |
| --- | --- | --- |
| `list_reminders` | `reminders:read` | Events `source=manual` |
| `list_upcoming_events` | `reminders:read` | Google + manual; `daysAhead` opcional (default = `Settings.lookaheadDays`) |
| `create_reminder`, `update_reminder` | `reminders:write` | Mesmos use-cases da API REST |
| `delete_reminder` | `reminders:write` | Exige `confirm: true`; 409 se não manual |

Handlers chamam use-cases existentes em `src/server/events/use-cases/` — não duplicam lógica. **Alerta** e **Agora** ficam fora do MCP (calculados no ESP32); descriptions deixam claro que Lembrete ≠ Alerta do display.

**Roteamento:** `/mcp` e endpoints OAuth (`/authorize`, `/oauth/token`, `/oauth/register`, `/.well-known/*`) bypassam Basic Auth; resto inalterado (`fetch` → TanStack, `scheduled` → sync Google). **Autorização MCP** é distinta de **Conta Google** (OAuth de espelho de calendário).

**Dev/teste:** lógica via Vitest nos use-cases; integração MCP/OAuth validada em deploy remoto ou `wrangler dev --remote`. Consent uma vez por client registrado; reauth só com token expirado/revogado.

**Considered:** Bearer `MCP_API_TOKEN` para MVP (rejeitado — um caminho só, Q4); tool `list_active_alerts` replicando firmware (rejeitado — viola “ESP32 entende apresentação”); scope único `reminders` (rejeitado — read/write separados para guardrails).
