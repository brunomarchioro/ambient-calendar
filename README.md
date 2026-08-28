# Ambient Calendar Display

Repositório multi-artefato: aplicação Node/Worker em `app/`, firmware ESP32 em `firmware/`, spec em `docs/`.

## Quick start

```sh
cd app && npm install && npm run db:migrate:local && npm run dev
```

Detalhes (secrets, D1, migrations, scripts): **[`app/README.md`](app/README.md)**.

Simulador HMI (firmware): [`firmware/simulator/README.md`](firmware/simulator/README.md).

## Google Calendar API

O sync espelha **várias contas Google** e os **Calendários Google** habilitados na web. Contas são vinculadas por OAuth na página **Configurações** (`/settings`); refresh tokens ficam no D1 criptografados. Spec: [`docs/index.md`](docs/index.md); ADR: [`docs/adr/0006-google-multi-account-oauth.md`](docs/adr/0006-google-multi-account-oauth.md).

### 1. Projeto e API no Google Cloud

1. Abra o [Google Cloud Console](https://console.cloud.google.com/).
2. Crie um projeto (ou escolha um existente).
3. **APIs e serviços → Biblioteca** → busque **Google Calendar API** → **Ativar**.

### 2. Tela de consentimento OAuth

1. **APIs e serviços → Tela de consentimento OAuth**.
2. Tipo **Externo** (uso pessoal).
3. Em **Escopos**, adicione:
   - `https://www.googleapis.com/auth/calendar.events.readonly`
   - `https://www.googleapis.com/auth/calendar.calendarlist.readonly`
4. Em **Usuários de teste**, inclua as contas Google que serão vinculadas (obrigatório enquanto o app estiver em **Testing**).

### 3. Credenciais OAuth (client ID + secret)

1. **APIs e serviços → Credenciais → Criar credenciais → ID do cliente OAuth**.
2. Tipo **Aplicativo da Web**.
3. Em **URIs de redirecionamento autorizados**, adicione:
   - `http://127.0.0.1:3000/api/google/oauth/callback` (dev)
   - `https://<seu-dominio>/api/google/oauth/callback` (produção)
4. Anote **Client ID** e **Client secret**.

### 4. Configurar no projeto

**Local** — em `app/.dev.vars`:

```text
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
ENCRYPTION_KEY=<32 bytes em base64>
GOOGLE_SYNC_FIXTURE=0
```

Gere `ENCRYPTION_KEY` com, por exemplo: `openssl rand -base64 32`.

Com `GOOGLE_SYNC_FIXTURE=1` (default em `.dev.vars.example`), o Cron usa fixture sem contas vinculadas.

**Produção** — secrets do Worker (a partir de `app/`):

```sh
npx wrangler secret put GOOGLE_CLIENT_ID
npx wrangler secret put GOOGLE_CLIENT_SECRET
npx wrangler secret put ENCRYPTION_KEY
```

### 5. Vincular contas na web

1. Suba o app (`npm run dev`) e abra `/settings`.
2. Clique em **Adicionar conta Google** e conclua o consent.
3. Marque/desmarque calendários e use **Sincronizar agora** (ou aguarde o Cron a cada 15 min).

### Limitações

| Situação | O que fazer |
| -------- | ----------- |
| App OAuth em **Testing** | Refresh token costuma expirar em **~7 dias** — use **Reconectar** na Settings ou publique o app OAuth. |
| Conta com badge **Reconectar** | `invalid_grant` — refaça OAuth para essa conta. |
| Até **5 contas** por deploy | Remova uma conta antes de adicionar outra. |
