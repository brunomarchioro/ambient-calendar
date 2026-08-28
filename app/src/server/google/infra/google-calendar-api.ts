import { z } from 'zod'

const calendarListSchema = z.object({
  items: z
    .array(
      z.object({
        id: z.string().min(1),
        summary: z.string().optional(),
        summaryOverride: z.string().optional(),
        selected: z.boolean().optional(),
      }),
    )
    .optional(),
})

const listEventsSchema = z.object({
  items: z.array(z.unknown()).optional(),
  nextPageToken: z.string().optional(),
})

export type CalendarListEntry = {
  calendarId: string
  summary: string
  selected: boolean
}

export async function fetchCalendarList(
  accessToken: string,
  fetchImpl: typeof fetch,
): Promise<CalendarListEntry[]> {
  const response = await fetchImpl(
    'https://www.googleapis.com/calendar/v3/users/me/calendarList?minAccessRole=reader',
    { headers: { authorization: `Bearer ${accessToken}` } },
  )
  if (!response.ok) throw new Error(`calendar_list ${response.status}`)
  const parsed = calendarListSchema.safeParse(await response.json().catch(() => null))
  if (!parsed.success) throw new Error('calendar_list_shape')
  return (parsed.data.items ?? []).map((item) => ({
    calendarId: item.id,
    summary: item.summaryOverride ?? item.summary ?? item.id,
    selected: item.selected ?? false,
  }))
}

const MAX_PAGES = 20

export async function fetchCalendarEvents(input: {
  accessToken: string
  calendarId: string
  timeMin: string
  timeMax: string
  timeZone: string
  fetchImpl: typeof fetch
}): Promise<unknown[]> {
  const items: unknown[] = []
  let pageToken: string | undefined
  for (let page = 0; page < MAX_PAGES; page += 1) {
    const url = new URL(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(input.calendarId)}/events`,
    )
    url.searchParams.set('singleEvents', 'true')
    url.searchParams.set('orderBy', 'startTime')
    url.searchParams.set('eventTypes', 'default')
    url.searchParams.set('timeMin', input.timeMin)
    url.searchParams.set('timeMax', input.timeMax)
    url.searchParams.set('timeZone', input.timeZone)
    if (pageToken) url.searchParams.set('pageToken', pageToken)
    const response = await input.fetchImpl(url, {
      headers: { authorization: `Bearer ${input.accessToken}` },
    })
    if (!response.ok) throw new Error(`list ${response.status}`)
    const parsed = listEventsSchema.safeParse(await response.json().catch(() => null))
    if (!parsed.success) throw new Error('list_shape')
    if (parsed.data.items) items.push(...parsed.data.items)
    pageToken = parsed.data.nextPageToken
    if (!pageToken) return items
  }
  throw new Error('too many pages')
}
