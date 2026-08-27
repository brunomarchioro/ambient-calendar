# Ambient Calendar Display

## Run

```sh
npm install
npm test
npm run dev
```

`npm run dev` is Vite plus `@cloudflare/vite-plugin` (the Wrangler-equivalent for this stack). Then:

```sh
curl http://127.0.0.1:3000/api/health
```

Expect `{"ok":true}`. After you change `wrangler.jsonc`, run `npm run cf-typegen`.
