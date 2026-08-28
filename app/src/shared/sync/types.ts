import { z } from 'zod'

export const googleConnectionTestSchema = z.object({
  ok: z.boolean(),
  message: z.string(),
  eventCount: z.number().int().nonnegative().optional(),
})

export type GoogleConnectionTest = z.infer<typeof googleConnectionTestSchema>

export function parseGoogleConnectionTest(input: unknown) {
  return googleConnectionTestSchema.safeParse(input)
}
