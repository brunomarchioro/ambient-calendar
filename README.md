# Ambient Calendar Display

Repositório multi-artefato: aplicação Node/Worker em `app/`, firmware ESP32 em `firmware/`, spec em `docs/`.

## Run

```sh
cd app
npm install
npm test
npm run dev
```

`npm run dev` is Vite plus `@cloudflare/vite-plugin` (the Wrangler-equivalent for this stack). Then:

```sh
curl http://127.0.0.1:3000/api/health
```

Expect `{"ok":true}`. After you change `wrangler.jsonc`, run `npm run cf-typegen`.

## Device token (local)

From `app/`, copy `.dev.vars.example` to `.dev.vars` and set `DEVICE_API_TOKEN` to a long random value. Wrangler loads that file for local secrets. Do not commit `.dev.vars`.

```sh
curl -sS -D - -H "Authorization: Bearer $DEVICE_API_TOKEN" \
  http://127.0.0.1:3000/api/device/schedule
```

A missing or wrong Bearer returns 401. A valid token returns the §6 schedule envelope.
