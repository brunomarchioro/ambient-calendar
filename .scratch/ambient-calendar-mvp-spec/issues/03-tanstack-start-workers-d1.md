# TanStack Start HTTP-only no Workers + D1

Type: research
Status: resolved
Blocked by:

## Question

Quais constraints oficiais (TanStack Start, Cloudflare Workers, D1, Wrangler) a spec deve respeitar para um app **HTTP-only** (sem Server Components / Server Functions), com rotas API, Cron Triggers, e D1 — alinhado ao stack do rascunho (`docs/index.md`)?

Capturar: shape de projeto viável hoje, limites de CPU/tempo, padrão de acesso D1, cron, e o que a spec não deve prometer.

## Answer

Viável hoje: um Worker com `@cloudflare/vite-plugin`, entry custom (`fetch` → Start, `scheduled` → sync), D1 por binding/`cloudflare:workers` `env`, HTTP só via **server routes** (+ SPA/selective SSR), Cron em Wrangler (UTC). Planejar **Workers Paid** (Free = 10 ms CPU). Não prometer Server Functions/RSC, Node fs, D1 multi-writer, nem Cron com wall time acima de 15 min.

Findings: [docs/research/tanstack-start-workers-d1.md](../../../docs/research/tanstack-start-workers-d1.md)
