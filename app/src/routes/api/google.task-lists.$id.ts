import { env } from 'cloudflare:workers'
import { createFileRoute } from '@tanstack/react-router'
import { parsePatchGoogleTaskList } from '@/shared/google/types'
import { patchGoogleTaskListUseCase } from '@/server/google/use-cases/google-connection'

export const Route = createFileRoute('/api/google/task-lists/$id')({ server: { handlers: { PATCH: async ({ params, request }) => {
  const parsed = parsePatchGoogleTaskList(await request.json().catch(() => null))
  if (!parsed.success) return Response.json({ error: 'invalid body' }, { status: 400 })
  const result = await patchGoogleTaskListUseCase({ db: env.DB, taskListRowId: params.id, enabled: parsed.data.enabled })
  return result.ok ? Response.json({ ok: true }) : Response.json({ error: 'not found' }, { status: 404 })
} } } })
