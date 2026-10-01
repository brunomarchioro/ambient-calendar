import { z } from 'zod'

export const GOOGLE_CALENDAR_OAUTH_SCOPES = [
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/calendar.events.readonly',
  'https://www.googleapis.com/auth/calendar.calendarlist.readonly',
] as const

export const GOOGLE_TASKS_OAUTH_SCOPES = ['https://www.googleapis.com/auth/tasks.readonly'] as const

export const MAX_GOOGLE_ACCOUNTS = 5

export const googleAccountStatusSchema = z.enum(['active', 'needs_reconnect'])

export const googleCalendarPublicSchema = z.object({
  id: z.string().min(1),
  calendarId: z.string().min(1),
  summary: z.string(),
  enabled: z.boolean(),
})
export const googleTaskListPublicSchema = z.object({ id: z.string().min(1), taskListId: z.string().min(1), title: z.string(), enabled: z.boolean() })

export const googleAccountPublicSchema = z.object({
  id: z.string().min(1),
  email: z.string().email(),
  status: googleAccountStatusSchema,
  tasksAuthorized: z.boolean(),
  calendars: z.array(googleCalendarPublicSchema),
  taskLists: z.array(googleTaskListPublicSchema),
})

export const googleAccountsResponseSchema = z.object({
  accounts: z.array(googleAccountPublicSchema),
})

export type GoogleCalendarPublic = z.infer<typeof googleCalendarPublicSchema>
export type GoogleAccountPublic = z.infer<typeof googleAccountPublicSchema>

export function parseGoogleAccountsResponse(input: unknown) {
  return googleAccountsResponseSchema.safeParse(input)
}

export const googleSyncResultSchema = z.object({
  ok: z.boolean(),
  message: z.string(),
  eventCount: z.number().int().nonnegative().optional(),
})

export type GoogleSyncResult = z.infer<typeof googleSyncResultSchema>

export function parseGoogleSyncResult(input: unknown) {
  return googleSyncResultSchema.safeParse(input)
}

export const patchGoogleCalendarSchema = z.strictObject({
  enabled: z.boolean(),
})
export const patchGoogleTaskListSchema = patchGoogleCalendarSchema

export function parsePatchGoogleCalendar(input: unknown) {
  return patchGoogleCalendarSchema.safeParse(input)
}
export function parsePatchGoogleTaskList(input: unknown) { return patchGoogleTaskListSchema.safeParse(input) }
