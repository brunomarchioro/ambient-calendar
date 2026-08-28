# vanguarda-fullstack — patterns

Code patterns for the target layout. Read when implementing routes, use-cases, repository, or web/api.

## Shared types (Zod at the boundary)

```typescript
// src/shared/events/types.ts
import { z } from 'zod'

export const eventWriteSchema = z.strictObject({
  title: z.string().trim().min(1),
  startAt: z.iso.datetime({ offset: true }),
  endAt: z.iso.datetime({ offset: true }).nullable().optional(),
  allDay: z.boolean(),
})

export type EventWrite = z.infer<typeof eventWriteSchema>

export function parseEventWrite(input: unknown) {
  return eventWriteSchema.safeParse(input)
}
```

## API route (thin adapter)

```typescript
// src/routes/api/events.ts
import { createFileRoute } from '@tanstack/react-router'
import { env } from 'cloudflare:workers'
import { parseEventWrite } from '@/shared/events/types'
import { createEventUseCase } from '@/server/events/use-cases/create-event'
import { listEventsUseCase } from '@/server/events/use-cases/list-events'

export const Route = createFileRoute('/api/events')({
  server: {
    handlers: {
      GET: async () => Response.json(await listEventsUseCase(env.DB)),
      POST: async ({ request }) => {
        const json = await request.json().catch(() => null)
        if (json === null) return Response.json({ error: 'invalid json' }, { status: 400 })
        const parsed = parseEventWrite(json)
        if (!parsed.success) return Response.json({ error: 'invalid event' }, { status: 400 })
        const result = await createEventUseCase(env.DB, parsed.data)
        if (!result.ok) return Response.json({ error: result.error }, { status: 400 })
        return Response.json(result.event, { status: 201 })
      },
    },
  },
})
```

## Use-case

```typescript
// src/server/events/use-cases/create-event.ts
import type { DrizzleD1Database } from 'drizzle-orm/d1'
import type { EventPublic, EventWrite } from '@/shared/events/types'
import { insertEvent } from '@/server/events/repository/insert-event'
import { validateEventWindow } from '@/server/events/services/validate-event-window'

type CreateEventResult =
  | { ok: true; event: EventPublic }
  | { ok: false; error: string }

export async function createEventUseCase(
  db: DrizzleD1Database,
  input: EventWrite,
): Promise<CreateEventResult> {
  const validation = validateEventWindow(input)
  if (!validation.ok) return validation
  return insertEvent(db, input)
}
```

## Service (pure)

```typescript
// src/server/events/services/validate-event-window.ts
import type { EventWrite } from '@/shared/events/types'

export function validateEventWindow(input: EventWrite) {
  if (input.endAt && input.endAt < input.startAt) {
    return { ok: false as const, error: 'end before start' }
  }
  return { ok: true as const }
}
```

## Repository

```typescript
// src/server/events/repository/insert-event.ts
import type { DrizzleD1Database } from 'drizzle-orm/d1'
import type { EventWrite } from '@/shared/events/types'
import { events } from '@/server/events/repository/schema'

export async function insertEvent(db: DrizzleD1Database, input: EventWrite) {
  const [row] = await db.insert(events).values({ /* … */ }).returning()
  return { ok: true as const, event: row }
}
```

## web/api (TanStack Query)

```typescript
// src/web/events/api/events-query.ts
import { queryOptions } from '@tanstack/react-query'
import type { EventPublic } from '@/shared/events/types'

export const eventsQueryKey = ['events'] as const

export function eventsQueryOptions() {
  return queryOptions({
    queryKey: eventsQueryKey,
    queryFn: (): Promise<EventPublic[]> =>
      fetch('/api/events').then((r) => {
        if (!r.ok) throw new Error('failed to load events')
        return r.json()
      }),
  })
}
```

```typescript
// src/web/events/api/create-event-mutation.ts
import { mutationOptions } from '@tanstack/react-query'
import type { EventWrite } from '@/shared/events/types'
import { eventsQueryKey } from '@/web/events/api/events-query'

export function createEventMutationOptions() {
  return mutationOptions({
    mutationFn: (input: EventWrite) =>
      fetch('/api/events', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(input),
      }).then((r) => {
        if (!r.ok) throw new Error('failed to create event')
        return r.json()
      }),
    meta: { invalidate: eventsQueryKey },
  })
}
```

## Page route (thin)

```typescript
// src/routes/events/index.tsx
import { createFileRoute } from '@tanstack/react-router'
import { eventsQueryOptions } from '@/web/events/api/events-query'
import { EventListPage } from '@/web/events/components/event-list-page'

export const Route = createFileRoute('/events/')({
  loader: ({ context }) =>
    context.queryClient.ensureQueryData(eventsQueryOptions()),
  component: EventListPage,
})
```

## React component (kebab-case file)

```tsx
// src/web/events/components/event-list-page.tsx
import { Stack, Heading } from '@chakra-ui/react'
import { useSuspenseQuery } from '@tanstack/react-query'
import { eventsQueryOptions } from '@/web/events/api/events-query'
import { EventList } from '@/web/events/components/event-list'

export function EventListPage() {
  const { data: events } = useSuspenseQuery(eventsQueryOptions())
  return (
    <Stack gap="6">
      <Heading size="md">Events</Heading>
      <EventList events={events} />
    </Stack>
  )
}
```

```tsx
// src/web/events/components/event-list.tsx
import { Stack, Text } from '@chakra-ui/react'
import type { EventPublic } from '@/shared/events/types'

type EventListProps = {
  events: EventPublic[]
}

export function EventList({ events }: EventListProps) {
  return (
    <Stack gap="2">
      {events.map((event) => (
        <Text key={event.id}>{event.title}</Text>
      ))}
    </Stack>
  )
}
```

## common/infra db client

```typescript
// src/server/common/infra/db/index.ts
import { drizzle } from 'drizzle-orm/d1'

export function createDb(d1: D1Database) {
  return drizzle(d1)
}
```

Only `*/common/infra/*/index.ts` may exist as a connection-point entry — not a re-export barrel.
