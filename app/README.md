# Ambient Calendar Display — `app/`

Pacote `@app/alerts`: TanStack Start (UI + rotas HTTP) + Cloudflare Workers + D1 (SQLite).

Monorepo: firmware em `firmware/`, spec em `docs/`, visão geral em [`../README.md`](../README.md).

## Pré-requisitos

- Node.js 20+
- npm

## Primeira execução

```sh
cd app
npm install
cp .dev.vars.example .dev.vars   # edite DEVICE_API_TOKEN (e Google, se for usar sync)
npm run db:migrate:local         # cria o D1 local e aplica migrations
npm test
npm run dev
```

`npm run dev` sobe Vite com `@cloudflare/vite-plugin` em **`http://127.0.0.1:3000`**.

Health check:

```sh
curl http://127.0.0.1:3000/api/health
```

Esperado: `{"ok":true}`.

Após alterar `wrangler.jsonc`, regenere tipos:

```sh
npm run cf-typegen
```

## Secrets locais (`.dev.vars`)

Wrangler carrega `app/.dev.vars` em dev. **Não commite** esse arquivo.

| Variável | Uso |
| -------- | --- |
| `DEVICE_API_TOKEN` | Bearer para `GET /api/device/schedule` (firmware/simulador) |
| `WEB_BASIC_AUTH_USER`, `WEB_BASIC_AUTH_PASSWORD` | Basic Auth para UI e APIs de gestão (ver abaixo) |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | OAuth Google (bootstrap do projeto GCP) |
| `ENCRYPTION_KEY` | Chave AES-256 (base64, 32 bytes) para refresh tokens no D1 |
| `GOOGLE_SYNC_FIXTURE=1` | Cron usa fixture quando não há contas vinculadas |

Contas Google são vinculadas em **Configurações** (`/settings`), não via refresh token em env. Ver [como configurar Google](../README.md#google-calendar-api).

Teste do device:

```sh
curl -sS -D - -H "Authorization: Bearer $DEVICE_API_TOKEN" \
  http://127.0.0.1:3000/api/device/schedule
```

Token ausente ou inválido → **401**. Token válido → envelope de schedule (spec §6).

## Proteção web (Basic Auth)

Com `WEB_BASIC_AUTH_USER` e `WEB_BASIC_AUTH_PASSWORD` definidos, a UI (`/events`, `/settings`) e as APIs de gestão exigem HTTP Basic Auth. O browser pede credenciais na primeira visita e reenvia em navegação e `fetch` same-origin.

**Sem exigir auth** (allowlist):

- `GET /api/health`
- `GET /api/device/schedule` (Bearer próprio)
- `GET /api/google/oauth/start` e `/api/google/oauth/callback`

Se **qualquer** uma das duas vars estiver ausente, a proteção fica desligada (útil só para debug local).

Dev local: copie os valores de `.dev.vars.example` para `.dev.vars`.

Produção (Wrangler):

```sh
npx wrangler secret put WEB_BASIC_AUTH_USER
npx wrangler secret put WEB_BASIC_AUTH_PASSWORD
```

Teste:

```sh
curl -sS -u "$WEB_BASIC_AUTH_USER:$WEB_BASIC_AUTH_PASSWORD" http://127.0.0.1:3000/api/settings
curl -sS http://127.0.0.1:3000/api/settings   # → 401
```

## Banco de dados (Cloudflare D1)

ORM: **Drizzle**. Schemas em `src/server/*/repository/schema.ts`. SQL versionado em `db/migrations/`.

Configuração Wrangler: binding `DB`, database name `alerts`, pasta `db/migrations/` (`wrangler.jsonc`).

### Inicializar e aplicar migrations (local)

Na **primeira vez** (ou após puxar migrations novas):

```sh
npm run db:migrate:local
```

Equivalente a:

```sh
npx wrangler d1 migrations apply alerts --local
```

Isso cria/atualiza o SQLite local do D1 (estado em `.wrangler/state/`) e registra migrations aplicadas na tabela `d1_migrations`.

A migration inicial (`0000_oval_iron_man.sql`) cria as tabelas `Event` e `Settings` e faz seed idempotente de Settings (`INSERT OR IGNORE`, defaults: `America/Sao_Paulo`, reminder 30 min, lookahead 7 dias, showNextEvents 2).

**Ordem recomendada:** migrations **antes** de `npm run dev` na primeira vez. Rodar de novo é idempotente.

### Aplicar migrations (produção)

Com Wrangler autenticado na conta Cloudflare:

```sh
npx wrangler d1 migrations apply alerts --remote
```

### Criar uma nova migration

1. Altere os schemas Drizzle em `src/server/events/repository/schema.ts` e/ou `src/server/settings/repository/schema.ts`.
2. Gere o SQL:

```sh
npm run db:generate
```

3. Revise o arquivo em `db/migrations/`.
4. Aplique localmente (`npm run db:migrate:local`) e teste.
5. Commit do `.sql` + `db/migrations/meta/`.

### Inspecionar dados

```sh
npm run db:studio
```

Abre Drizzle Studio contra o schema definido em `drizzle.config.ts`.

### Consulta SQL direta (local)

```sh
npx wrangler d1 execute alerts --local --command "SELECT * FROM Settings"
```

## Scripts úteis

| Script | Descrição |
| ------ | --------- |
| `npm run dev` | Dev server (Vite + Worker) em `:3000` |
| `npm test` | Vitest |
| `npm run build` | Build de produção |
| `npm run db:migrate:local` | Aplica migrations no D1 local |
| `npm run db:generate` | Gera migration a partir dos schemas Drizzle |
| `npm run db:studio` | Drizzle Studio |
| `npm run cf-typegen` | Tipos TypeScript do binding Cloudflare |

## Firmware local

O ESP32-C6 consome `GET /api/device/schedule` deste Worker. Secrets de flash local ficam em `firmware/.dev.vars`; `ALERTS_DEVICE_API_TOKEN` deve coincidir com `DEVICE_API_TOKEN` deste Worker. Veja [`../firmware/esp32-c6/README.md`](../firmware/esp32-c6/README.md) e ADR 0008.
