# vanguarda-fullstack — decision tree

Where to place new code. Start at the top; first match wins.

```
Novo código
│
├─ É vocabulário de produto / regra de negócio nomeada?
│  └─ Leia CONTEXT.md primeiro
│
├─ É rota HTTP pública (REST)?
│  └─ src/routes/api/{resource}.ts
│     └─ handler fino → use-case (Zod em shared/{feature}/types.ts)
│
├─ É página ou layout TanStack Router?
│  └─ src/routes/{path}.tsx
│     └─ loader → web/{feature}/api/ · component → web/{feature}/components/
│
├─ É fetch / queryOptions / mutationOptions para a UI?
│  └─ src/web/{feature}/api/
│
├─ É componente React, hook ou tema?
│  ├─ Usado por 2+ features → src/web/common/
│  └─ Uma feature → src/web/{feature}/
│
├─ Orquestra repository + services + infra para um fluxo?
│  └─ src/server/{feature}/use-cases/
│
├─ Consulta ou grava no banco (Drizzle)?
│  └─ src/server/{feature}/repository/
│
├─ Regra pura, sem I/O?
│  └─ src/server/{feature}/services/
│
├─ Integração externa (HTTP client, broker, cron)?
│  ├─ 2+ features ou fora do ciclo de request → src/server/common/infra/
│  └─ Uma feature → src/server/{feature}/infra/
│
├─ Tipo/DTO usado por web E server?
│  └─ src/shared/{feature}/types.ts
│
├─ Tipo usado por 2+ features?
│  └─ src/shared/common/types.ts
│
└─ Tipo privado de uma camada?
   └─ src/web/{feature}/types.ts ou src/server/{feature}/types.ts
```

## Quick checks

| Sinal | Não colocar em | Colocar em |
| ----- | -------------- | ---------- |
| Importa `drizzle` ou `env.DB` | `services/`, `web/` | `repository/` ou `use-cases/` |
| Importa `react` | `server/` (exceto n/a) | `web/` ou `routes/` (JSX) |
| Chamado só de routes/api | `repository/` direto | `use-cases/` |
| Reutilizado por 2 features | `{feature}/` | `common/` ou `shared/common/` |
