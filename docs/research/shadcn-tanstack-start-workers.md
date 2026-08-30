# shadcn/ui + TanStack Start + Cloudflare Workers (SPA)

Research for wayfinder ticket `02-shadcn-tanstack-start-setup`.  
**Question:** How to initialize and operate shadcn/ui (Tailwind, Radix, `components.json`) in a TanStack Start app with Vite and Cloudflare Workers (`@cloudflare/vite-plugin`), SPA mode (`ssr: false` on routes and/or `spa.enabled` in the Start plugin).

**Date:** 2026-08-30  
**Sources:** shadcn/ui docs, TanStack Start docs, Cloudflare Workers docs (primary only).

---

## Verdict (one line)

**Viable:** use the official shadcn **TanStack Start** path (`init -t start` for greenfield, or Tailwind v4 + `@tailwindcss/vite` + `shadcn init` on an existing Start app), keep `cloudflare()` **before** `tanstackStart()` in `vite.config.ts`, add `tailwindcss()` alongside `react()`, set `rsc: false` in `components.json`, place primitives under `src/web/common/components/ui/` (vanguarda), and treat shadcn as **client static assets** — not Worker script size — when UI routes use `ssr: false` / SPA mode.

---

## 1. `npx shadcn@latest init` with Vite / TanStack Start

### Greenfield (official shadcn CLI template)

shadcn documents a first-class **TanStack Start** template (not the generic Vite template):

```bash
pnpm dlx shadcn@latest init -t start
```

Monorepo variant:

```bash
pnpm dlx shadcn@latest init -t start --monorepo
```

Alternative: `shadcn/create` with `--template start` (preset-driven).

**Citation:** [Installation — shadcn/ui](https://ui.shadcn.com/docs/installation) (supported templates include `start`); [TanStack Start installation — shadcn/ui](https://ui.shadcn.com/docs/installation/tanstack).

### Greenfield via TanStack CLI (then shadcn)

If the app is created with `@tanstack/cli`:

1. `pnpm dlx @tanstack/cli@latest create`
2. Choose **TanStack Start**, React, **recommended defaults** (Tailwind + `@/*` alias).
3. **Do not** select the `shadcn` add-on during TanStack CLI setup — shadcn’s own CLI configures it later.
4. Add Cloudflare per [Hosting → Cloudflare Workers](https://tanstack.com/start/latest/docs/framework/react/guide/hosting) and [TanStack Start · Cloudflare](https://developers.cloudflare.com/workers/framework-guides/web-apps/tanstack-start/).
5. `pnpm dlx shadcn@latest init`

**Citation:** [TanStack Start installation — shadcn/ui](https://ui.shadcn.com/docs/installation/tanstack) (Existing Project → Create Project).

### Existing project (this repo’s `app/` shape)

For an existing TanStack Start app **without** Tailwind yet:

1. **Tailwind v4 + Vite plugin** (shadcn’s current Vite guide):

   ```bash
   pnpm add tailwindcss @tailwindcss/vite
   ```

   Global CSS (minimum):

   ```css
   @import "tailwindcss";
   ```

   `vite.config.ts` — add `tailwindcss()` and keep `@` → `./src` (already present in `app/vite.config.ts`).

2. **Path alias** — `@/*` → `./src/*` in `tsconfig` (vanguarda / this app already use `@/`).

3. **Run shadcn init** (interactive; writes `components.json`, theme CSS, `cn` helper):

   ```bash
   pnpm dlx shadcn@latest init
   ```

4. **Add components** as needed:

   ```bash
   pnpm dlx shadcn@latest add button card
   ```

**Citation:** [Vite installation — shadcn/ui](https://ui.shadcn.com/docs/installation/vite) (Existing Project); [TanStack Start installation — shadcn/ui](https://ui.shadcn.com/docs/installation/tanstack) (Existing Project → Run the CLI).

### Generic Vite-only init (if not using Start template)

For plain Vite + React (not Start), shadcn documents:

```bash
pnpm dlx shadcn@latest init -t vite
```

**Not** the right template once TanStack Start is already in place — prefer `-t start` for new apps or `init` on an existing Start app after Tailwind is configured.

**Citation:** [Installation — shadcn/ui](https://ui.shadcn.com/docs/installation); [Vite installation — shadcn/ui](https://ui.shadcn.com/docs/installation/vite).

---

## 2. Tailwind version, content paths, PostCSS, plugin order

### Tailwind version

Official shadcn **Vite** and **TanStack Start** guides assume **Tailwind CSS v4** with the **`@tailwindcss/vite`** plugin — not a separate PostCSS + `tailwind.config` content array setup.

- Install: `tailwindcss` + `@tailwindcss/vite`
- CSS entry: `@import "tailwindcss";`
- Theming: CSS variables in global CSS (`@theme inline`, `:root`, `.dark`) per [Theming — shadcn/ui](https://ui.shadcn.com/docs/theming); default scaffold also uses `@import "shadcn/tailwind.css";` and `@custom-variant dark (&:is(.dark *));`

**Citation:** [Vite installation — shadcn/ui](https://ui.shadcn.com/docs/installation/vite); [Theming — shadcn/ui](https://ui.shadcn.com/docs/theming).

### Content paths / `tailwind.config`

With **Tailwind v4 + `@tailwindcss/vite`**, shadcn’s Vite guide does **not** require manually maintaining a `content: [...]` array — detection is integrated with the Vite pipeline. `components.json` may leave `"tailwind.config": ""` when using CSS-first v4 setup (see theming defaults).

If the CLI emits a legacy `tailwind.config.js`, follow the paths it writes; for v4 CSS-first, the important surface is the **global CSS file** referenced in `components.json` → `tailwind.css`.

**Citation:** [Vite installation — shadcn/ui](https://ui.shadcn.com/docs/installation/vite); [Theming — shadcn/ui](https://ui.shadcn.com/docs/theming).

### PostCSS

Not required for the documented v4 path (`@tailwindcss/vite` replaces the old PostCSS + `autoprefixer` stack in shadcn’s Vite guide). Do **not** add a parallel PostCSS Tailwind pipeline unless you deliberately choose the v3-style setup (not what current shadcn docs recommend for Vite).

**Citation:** [Vite installation — shadcn/ui](https://ui.shadcn.com/docs/installation/vite).

### Vite plugin order (TanStack Start + Cloudflare + Tailwind)

**Cloudflare + TanStack Start (official):**

```ts
plugins: [
  cloudflare({ viteEnvironment: { name: 'ssr' } }),
  tanstackStart(/* spa, srcDirectory, etc. */),
  viteReact(),
]
```

**Citation:** [Hosting — TanStack Start](https://tanstack.com/start/latest/docs/framework/react/guide/hosting); [TanStack Start · Cloudflare Workers](https://developers.cloudflare.com/workers/framework-guides/web-apps/tanstack-start/).

**shadcn Vite (Tailwind only):**

```ts
plugins: [react(), tailwindcss()]
```

**Citation:** [Vite installation — shadcn/ui](https://ui.shadcn.com/docs/installation/vite).

**Combined recommendation for this stack:**

```ts
plugins: [
  cloudflare({ viteEnvironment: { name: 'ssr' } }),
  tanstackStart({ srcDirectory: 'src', spa: { enabled: true } }),
  tailwindcss(),
  viteReact(),
]
```

- Keep **`cloudflare()` first** — required by Cloudflare and TanStack hosting docs.
- **`tanstackStart()` second** — Start owns routes, SSR/SPA shell, server routes.
- **`tailwindcss()`** before or after `viteReact()` — both orders are used in the wild; shadcn’s minimal example puts `tailwindcss()` after `react()`. No official doc mandates order between Tailwind and React plugins; if styles fail to generate, try swapping those two.
- Import global CSS from the root route / app entry (e.g. `__root.tsx`) so the client bundle and SPA shell include tokens.

**Conflict watch:** Only one Tailwind pipeline. Do not also configure `postcss.config` with `@tailwindcss/postcss` unless you intentionally migrate off `@tailwindcss/vite`.

### `components.json` Tailwind fields

CLI writes paths such as:

```json
{
  "tailwind": {
    "config": "",
    "css": "src/styles/globals.css",
    "baseColor": "neutral",
    "cssVariables": true
  }
}
```

Adjust `css` to match where the root route imports styles (e.g. `src/styles/globals.css` or `src/app.css`). TanStack Start has no `app/` directory convention like Next.js — pick one global CSS file under `src/` and reference it in `components.json`.

**Citation:** [Theming — shadcn/ui](https://ui.shadcn.com/docs/theming); [TanStack Start installation — shadcn/ui](https://ui.shadcn.com/docs/installation/tanstack).

---

## 3. shadcn with SPA / no SSR

### Does shadcn work without SSR?

**Yes.** shadcn/ui components are **copied React + Radix + Tailwind** primitives. They do not depend on React Server Components or server-only APIs.

- Set **`"rsc": false`** in `components.json` for TanStack Start / Vite (the `"rsc": true` default in older examples targets Next.js App Router).
- Import and render from route `component` functions as in shadcn’s TanStack example (`@/components/ui/button`).

**Citation:** [TanStack Start installation — shadcn/ui](https://ui.shadcn.com/docs/installation/tanstack); [Installation — shadcn/ui](https://ui.shadcn.com/docs/installation).

### TanStack SPA mode vs `ssr: false`

Two related knobs:

| Mechanism | What it does | shadcn impact |
| --- | --- | --- |
| **`tanstackStart({ spa: { enabled: true } })`** | After build, prerenders a **shell** (`/_shell.html` by default); client hydrates and loads routes. Server routes / API still work. | Shell must include global CSS (Tailwind + theme variables). Use `router.isShell()` if customizing shell markup. |
| **Per-route `ssr: false`** (or `defaultSsr: false`) | Skips server execution of loaders and **server render of route components** for that route. Root still needs `shellComponent` / document shell SSRed when disabling root SSR. | UI renders on client only — ideal for shadcn; no hydration mismatch from Radix portals if the full tree is client-rendered. |

TanStack explicitly lists **“Client-side Only is simpler — No SSR means less to go wrong with hydration”** as an SPA benefit, while **server routes remain available**.

**Citation:** [SPA mode — TanStack Start](https://tanstack.com/start/latest/docs/framework/react/guide/spa-mode); [Selective SSR — TanStack Start](https://tanstack.com/start/latest/docs/framework/react/guide/selective-ssr).

### Hydration / dark mode caveats

- **Radix portals** (Dialog, Dropdown, etc.) are client-side; CSR/SPA avoids common SSR hydration mismatches.
- **Theme toggle:** shadcn dark mode uses a `.dark` class on an ancestor ([Theming — shadcn/ui](https://ui.shadcn.com/docs/theming)). In SPA, persist theme in `localStorage` and apply class on `document.documentElement` in client code — no server theme flash issue if there is no SSR’d themed markup.
- **Shell flash:** TanStack warns that after shell hydration, `isShell()` becomes false and careless conditional UI can flash ([SPA mode — TanStack Start](https://tanstack.com/start/latest/docs/framework/react/guide/spa-mode)). Keep shell and app chrome consistent (same `bg-background` / layout).

This app already uses `spa: { enabled: true }` and `ssr: false` on `__root.tsx` and pages — compatible with shadcn once Tailwind global CSS is wired.

---

## 4. Bundle implications on Cloudflare Workers

### What gets bundled where

The Cloudflare Vite plugin **builds front-end assets for deployment to Cloudflare** alongside the Worker ([Vite plugin — Cloudflare Workers](https://developers.cloudflare.com/workers/vite-plugin/)). With SPA / client-rendered UI:

| Artifact | Typical contents | shadcn / Tailwind |
| --- | --- | --- |
| **Static assets** (CDN) | JS chunks, CSS, `/_shell.html`, fonts | Tailwind (purged at build), Radix primitives, shadcn component code |
| **Worker script** (`server-entry` or custom `main`) | Start server handler, **server routes**, Cron, bindings | Should stay lean; **no** shadcn UI if routes use `ssr: false` and UI is client-only |

**Citation:** [Vite plugin — Cloudflare Workers](https://developers.cloudflare.com/workers/vite-plugin/); [Static Assets — Cloudflare Workers](https://developers.cloudflare.com/workers/static-assets/); [TanStack Start · Cloudflare Workers](https://developers.cloudflare.com/workers/framework-guides/web-apps/tanstack-start/).

### Tree-shaking and CSS

- **JS:** Vite ESM tree-shaking applies per import. Add only the shadcn components you use (`shadcn add <name>` copies source into the repo).
- **CSS:** Tailwind v4 scans sources linked through the Vite pipeline; unused utilities are dropped at build time.
- **Dependencies:** Each shadcn component pulls only its Radix packages (e.g. `@radix-ui/react-dialog` for Dialog) — not the entire Radix monolith.

**Citation:** [Vite installation — shadcn/ui](https://ui.shadcn.com/docs/installation/vite) (component-per-add model).

### Worker limits (relevant to API, not static UI)

| Limit | Paid (typical) | Relevance |
| --- | --- | --- |
| Worker size (gzip) | 10 MB | Server bundle only — keep API/cron code small |
| Static file size | 25 MiB / file | Client JS/CSS chunks |
| Static files per version | 100,000 | Plenty for SPA assets |
| CPU time / request | Default 30s (configurable) | SSR-heavy pages cost CPU; **SPA + `ssr: false` UI avoids SSR CPU** on page routes |

Measure Worker bundle: `wrangler deploy --outdir bundled/ --dry-run` ([Limits — Cloudflare Workers](https://developers.cloudflare.com/workers/platform/limits/)).

**Practical guidance:** shadcn increases **client** bundle size (Radix + JS), not necessarily Worker script size, when UI is client-rendered. Prefer `shadcn add` only for components in use; avoid importing unused primitives. Server routes (`src/routes/api/*`) should not import `@/web/common/components/ui/*`.

---

## 5. Folder layout (vanguarda-fullstack)

### shadcn default vs vanguarda

| | shadcn default | vanguarda-fullstack |
| --- | --- | --- |
| Primitives | `src/components/ui/*` | Shared UI → `src/web/common/components/` |
| `cn()` helper | `src/lib/utils.ts` | Shared utils → `src/web/common/utils.ts` |
| Feature UI | — | `src/web/{feature}/components/` |
| Path alias | `@/` → `src/` | Same (`@/` → `src/`) |

**Citation:** [TanStack Start installation — shadcn/ui](https://ui.shadcn.com/docs/installation/tanstack) (imports `@/components/ui/...`); vanguarda skill `Directory Structure` / Routes pattern (`web/common/` for layout/auth).

### Recommendation

| Path | Role |
| --- | --- |
| **`src/web/common/components/ui/`** | shadcn primitives (`button.tsx`, `card.tsx`, …) — **preferred** |
| **`src/web/common/components/`** | Composed shared chrome (nav shell, layout wrappers) built from `ui/*` |
| **`src/web/{feature}/components/`** | Feature-specific screens composing `ui/*` |
| **`src/web/common/utils.ts`** | Add `cn()` here; point `components.json` `utils` alias to `@/web/common/utils` |
| **Avoid `src/components/ui/`** | Top-level `src/components/` is outside vanguarda’s `web/` layer and blurs adapter vs UI ownership |

Configure during `shadcn init` prompts (or edit `components.json` after):

```json
{
  "aliases": {
    "components": "@/web/common/components",
    "ui": "@/web/common/components/ui",
    "utils": "@/web/common/utils",
    "lib": "@/web/common",
    "hooks": "@/web/common/hooks"
  }
}
```

Import example in routes:

```tsx
import { Button } from '@/web/common/components/ui/button'
```

Or keep CLI default `@/components/ui` **only** if willing to break vanguarda placement rules — **not recommended** for this monorepo.

**Citation:** [components.json aliases — shadcn/ui](https://ui.shadcn.com/docs/changelog/2023-06-new-cli); vanguarda-fullstack `Directory Structure`, `Routes Pattern` (pages compose from `web/{feature}/components/`, layout from `web/common/`).

### Global CSS / theme infra

- **Global CSS file** (Tailwind + shadcn tokens): e.g. `src/web/common/infra/globals.css` or `src/styles/globals.css`.
- **Theme provider** (dark mode): `src/web/common/infra/theme-provider.tsx` if using `next-themes` or equivalent client provider — fits vanguarda’s “frontend theme/providers → `common/infra/`”.

---

## 6. Checklist for `app/` migration

1. `pnpm add tailwindcss @tailwindcss/vite` (+ shadcn peer deps as prompted by `init`).
2. Create global CSS with `@import "tailwindcss"` + shadcn theme block; import from `__root.tsx`.
3. Update `vite.config.ts`: insert `tailwindcss()`; keep `cloudflare` → `tanstackStart` → `react` order.
4. `pnpm dlx shadcn@latest init` — set aliases to `web/common` paths; `rsc: false`.
5. `pnpm dlx shadcn@latest add …` for required primitives only.
6. Replace Chakra usage in `web/**` and `routes/**`; remove `@chakra-ui/react` when done.
7. `pnpm run build` / `wrangler deploy --dry-run` — verify static asset chunks and Worker script size separately.

---

## Sources (primary)

| Topic | URL |
| --- | --- |
| shadcn Installation | https://ui.shadcn.com/docs/installation |
| shadcn TanStack Start | https://ui.shadcn.com/docs/installation/tanstack |
| shadcn Vite | https://ui.shadcn.com/docs/installation/vite |
| shadcn Theming | https://ui.shadcn.com/docs/theming |
| TanStack SPA mode | https://tanstack.com/start/latest/docs/framework/react/guide/spa-mode |
| TanStack Selective SSR | https://tanstack.com/start/latest/docs/framework/react/guide/selective-ssr |
| TanStack Hosting (Cloudflare) | https://tanstack.com/start/latest/docs/framework/react/guide/hosting |
| Cloudflare TanStack Start | https://developers.cloudflare.com/workers/framework-guides/web-apps/tanstack-start/ |
| Cloudflare Vite plugin | https://developers.cloudflare.com/workers/vite-plugin/ |
| Cloudflare Static Assets | https://developers.cloudflare.com/workers/static-assets/ |
| Cloudflare Limits | https://developers.cloudflare.com/workers/platform/limits/ |
