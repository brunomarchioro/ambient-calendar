import { z } from 'zod'

const listSchema = z.object({ items: z.array(z.object({ id: z.string(), title: z.string().optional() })).optional(), nextPageToken: z.string().optional() })
const tasksSchema = z.object({
  items: z.array(z.object({ id: z.string(), title: z.string().optional(), due: z.string().optional(), status: z.string().optional(), parent: z.string().optional() })).optional(),
  nextPageToken: z.string().optional(),
})

export type GoogleTaskList = { id: string; title: string }
export type GoogleTaskItem = { id: string; title: string; due: string | null }

export async function fetchGoogleTaskLists(accessToken: string, fetchImpl: typeof fetch): Promise<GoogleTaskList[]> {
  const lists: GoogleTaskList[] = []
  let pageToken: string | undefined
  for (let page = 0; page < 20; page += 1) {
    const url = new URL('https://tasks.googleapis.com/tasks/v1/users/@me/lists')
    url.searchParams.set('maxResults', '100')
    if (pageToken) url.searchParams.set('pageToken', pageToken)
    const response = await fetchImpl(url, { headers: { authorization: `Bearer ${accessToken}` } })
    if (!response.ok) throw new Error(`tasklists ${response.status}`)
    const parsed = listSchema.safeParse(await response.json().catch(() => null))
    if (!parsed.success) throw new Error('tasklists_shape')
    lists.push(...(parsed.data.items ?? []).map((item) => ({ id: item.id, title: item.title ?? item.id })))
    pageToken = parsed.data.nextPageToken
    if (!pageToken) return lists
  }
  throw new Error('too_many_tasklist_pages')
}

export async function fetchOpenGoogleTasks(input: { accessToken: string; taskListId: string; fetchImpl: typeof fetch }): Promise<GoogleTaskItem[]> {
  const items: GoogleTaskItem[] = []
  let pageToken: string | undefined
  for (let page = 0; page < 20; page += 1) {
    const url = new URL(`https://tasks.googleapis.com/tasks/v1/lists/${encodeURIComponent(input.taskListId)}/tasks`)
    url.searchParams.set('showCompleted', 'false')
    url.searchParams.set('showHidden', 'false')
    url.searchParams.set('showAssigned', 'true')
    url.searchParams.set('maxResults', '100')
    if (pageToken) url.searchParams.set('pageToken', pageToken)
    const response = await input.fetchImpl(url, { headers: { authorization: `Bearer ${input.accessToken}` } })
    if (!response.ok) throw new Error(`tasks ${response.status}`)
    const parsed = tasksSchema.safeParse(await response.json().catch(() => null))
    if (!parsed.success) throw new Error('tasks_shape')
    items.push(...(parsed.data.items ?? []).flatMap((task) => task.status === 'needsAction' && !task.parent ? [{ id: task.id, title: task.title ?? '', due: task.due ?? null }] : []))
    pageToken = parsed.data.nextPageToken
    if (!pageToken) return items
  }
  throw new Error('too_many_task_pages')
}
