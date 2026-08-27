export type Health = { ok: true }

export function getHealth(): Response {
  return Response.json({ ok: true } satisfies Health)
}
