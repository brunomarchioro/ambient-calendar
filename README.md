# Ambient Calendar Display

Repositório multi-artefato: aplicação Node/Worker em `app/`, firmware ESP32 em `firmware/`, spec em `docs/`.

## Quick start

```sh
cd app && npm install && npm run db:migrate:local && npm run dev
```

Detalhes (secrets, D1, migrations, scripts): **[`app/README.md`](app/README.md)**.

Simulador HMI (firmware): [`firmware/simulator/README.md`](firmware/simulator/README.md).

## Google Calendar API

O sync usa **uma conta Google** via refresh token offline. O Worker lê o calendário `primary` com scope de leitura de eventos. Spec: [`docs/index.md`](docs/index.md) §10; detalhes de sync: [`docs/research/google-calendar-sync-model.md`](docs/research/google-calendar-sync-model.md).

### 1. Projeto e API no Google Cloud

1. Abra o [Google Cloud Console](https://console.cloud.google.com/).
2. Crie um projeto (ou escolha um existente).
3. **APIs e serviços → Biblioteca** → busque **Google Calendar API** → **Ativar**.

### 2. Tela de consentimento OAuth

1. **APIs e serviços → Tela de consentimento OAuth**.
2. Tipo **Externo** (uso pessoal).
3. Em **Escopos**, adicione:
   `https://www.googleapis.com/auth/calendar.events.readonly`
4. Em **Usuários de teste**, inclua a conta Google cujo calendário será espelhado (obrigatório enquanto o app estiver em **Testing**).

### 3. Credenciais OAuth (client ID + secret)

1. **APIs e serviços → Credenciais → Criar credenciais → ID do cliente OAuth**.
2. Tipo **Aplicativo da Web**.
3. Em **URIs de redirecionamento autorizados**, adicione:
   `https://developers.google.com/oauthplayground`
4. Anote **Client ID** e **Client secret**.

### 4. Obter o refresh token (OAuth 2.0 Playground)

1. Abra o [OAuth 2.0 Playground](https://developers.google.com/oauthplayground/).
2. Ícone de engrenagem → marque **Use your own OAuth credentials** → cole Client ID e secret.
3. **Step 1:** em **Calendar API v3**, selecione  
   `https://www.googleapis.com/auth/calendar.events.readonly` → **Authorize APIs** → faça login com a conta de teste.
4. **Step 2:** **Exchange authorization code for tokens**.
5. Copie o **`refresh_token`** da resposta (guarde em local seguro; não commite).

Se não aparecer `refresh_token`, revogue o acesso em [Conta Google → Segurança → Acesso de terceiros](https://myaccount.google.com/permissions) e repita o fluxo.

### 5. Configurar no projeto

**Local** — em `app/.dev.vars`:

```text
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_REFRESH_TOKEN=...
GOOGLE_SYNC_FIXTURE=0
```

Com as três variáveis preenchidas, o Cron local passa a chamar a API real. Deixe `GOOGLE_SYNC_FIXTURE=1` (default em `.dev.vars.example`) para usar dados fixture sem Google.

**Produção** — secrets do Worker (a partir de `app/`):

```sh
npx wrangler secret put GOOGLE_CLIENT_ID
npx wrangler secret put GOOGLE_CLIENT_SECRET
npx wrangler secret put GOOGLE_REFRESH_TOKEN
```

### Limitações e rotação

| Situação | O que fazer |
| -------- | ----------- |
| App OAuth em **Testing** | Refresh token de apps externos costuma expirar em **~7 dias** — refaça o passo 4 ou publique o app OAuth. |
| Log `invalid_grant` | Token revogado ou expirado — novo consent + refresh token. |
| Trocar conta Google | Repita o fluxo OAuth com a outra conta e atualize os secrets. |

Não há OAuth interativo no app (fora do escopo MVP): obter e rotacionar tokens é passo manual de ops.
