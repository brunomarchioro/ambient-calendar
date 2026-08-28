# Ambient Calendar Display

Repositório multi-artefato: aplicação Node/Worker em `app/`, firmware ESP32 em `firmware/`, spec em `docs/`.

## Quick start

```sh
cd app && npm install && npm run db:migrate:local && npm run dev
```

Detalhes (secrets, D1, migrations, scripts): **[`app/README.md`](app/README.md)**.

Simulador HMI (firmware): [`firmware/simulator/README.md`](firmware/simulator/README.md) — secrets em `firmware/.dev.vars` (template: [`firmware/.dev.vars.example`](firmware/.dev.vars.example)).

## Google Calendar API

O sync espelha **várias contas Google** e os **Calendários Google** habilitados na web. Contas são vinculadas por OAuth em **Configurações** (`/settings`); refresh tokens ficam no D1 criptografados — **não** há mais `GOOGLE_REFRESH_TOKEN` em `.dev.vars`.

Spec: [`docs/index.md`](docs/index.md) · ADR: [`docs/adr/0006-google-multi-account-oauth.md`](docs/adr/0006-google-multi-account-oauth.md)

### 1. Projeto e API no Google Cloud

1. Abra o [Google Cloud Console](https://console.google.com/).
2. Crie um projeto (ou escolha um existente).
3. **APIs e serviços → Biblioteca** → busque **Google Calendar API** → **Ativar**.

### 2. Tela de consentimento OAuth

1. **APIs e serviços → Tela de consentimento OAuth**.
2. Tipo **Externo** (uso pessoal).
3. Em **Escopos**, adicione os dois:
   - `https://www.googleapis.com/auth/calendar.events.readonly`
   - `https://www.googleapis.com/auth/calendar.calendarlist.readonly` ← necessário para listar calendários na Settings
4. Em **Usuários de teste**, inclua **cada** conta Google que será vinculada (obrigatório enquanto o app estiver em **Testing**).

### 3. Credenciais OAuth (client ID + secret)

1. **APIs e serviços → Credenciais** → abra o cliente OAuth existente ou **Criar credenciais → ID do cliente OAuth**.
2. Tipo **Aplicativo da Web**.
3. Em **URIs de redirecionamento autorizados**, use o callback do app (não o OAuth Playground):

   | Ambiente | URI |
   | -------- | --- |
   | Dev local | `http://127.0.0.1:3000/api/google/oauth/callback` |
   | Produção | `https://<seu-dominio>/api/google/oauth/callback` |

   Use `127.0.0.1`, não `localhost`, se o dev server sobe em `http://127.0.0.1:3000`. Pode remover `https://developers.google.com/oauthplayground` se não for mais usar o fluxo manual.

4. Anote **Client ID** e **Client secret**.

### 4. Configurar no projeto

**Local** — copie o exemplo e preencha `app/.dev.vars`:

```sh
cp app/.dev.vars.example app/.dev.vars
```

```text
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
ENCRYPTION_KEY=<32 bytes em base64>
GOOGLE_SYNC_FIXTURE=0
DEVICE_API_TOKEN=local-dev-token-change-me
```

Gere a chave de criptografia:

```sh
openssl rand -base64 32
```

Com `GOOGLE_SYNC_FIXTURE=1` (padrão em `.dev.vars.example`), o Cron usa dados fixture quando **nenhuma** conta está vinculada — útil para dev sem Google.

**Produção** — secrets do Worker (a partir de `app/`):

```sh
npx wrangler secret put GOOGLE_CLIENT_ID
npx wrangler secret put GOOGLE_CLIENT_SECRET
npx wrangler secret put ENCRYPTION_KEY
npx wrangler secret put DEVICE_API_TOKEN
```

Registre o mesmo redirect de produção no cliente OAuth do GCP.

### 5. Vincular contas na web

1. Aplique migrations (`npm run db:migrate:local` na primeira vez após atualizar o repo).
2. Suba o app (`npm run dev`) e abra `http://127.0.0.1:3000/settings`.
3. **Adicionar conta Google** → conclua o consent na Google.
4. Na primeira ligação, entram calendários com `selected=true` no Google Calendar; ligue/desligue cada um e use **Sincronizar agora** (ou aguarde o Cron a cada 15 min).

Até **5 contas** por deploy. Para trocar de conta, **Desconectar** e vincule outra.

### Troubleshooting

| Sintoma | Causa provável | O que fazer |
| ------- | -------------- | ----------- |
| `redirect_uri_mismatch` | URI no GCP ≠ URL do app | Confira host (`127.0.0.1` vs `localhost`), porta `3000` e path `/api/google/oauth/callback` |
| Lista de calendários vazia após vincular | Falta escopo `calendar.calendarlist.readonly` | Adicione na tela de consentimento e **Reconectar** a conta |
| `access_denied` / login bloqueado | App em **Testing** | Adicione o e-mail em **Usuários de teste** |
| Mensagem `no_refresh` na Settings | Google não devolveu refresh token | **Reconectar** (força novo consent) |
| Badge **Reconectar** na conta | `invalid_grant` (token revogado ou expirado) | **Reconectar**; em Testing, tokens costumam durar ~7 dias |
| OAuth não configurado | Faltam vars no Worker / `.dev.vars` | Preencha `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `ENCRYPTION_KEY` |

### Limitações

| Situação | O que fazer |
| -------- | ----------- |
| App OAuth em **Testing** | Refresh token de apps externos costuma expirar em **~7 dias** — **Reconectar** ou publique o app OAuth |
| Eventos privados em calendário compartilhado | Aparecem como **Ocupado** na agenda web |
| Contrato do ESP32 | Inalterado — `GET /api/device/schedule` não expõe conta/calendário de origem |
