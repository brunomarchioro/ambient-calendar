export function unauthorized(): Response {
  return Response.json({ error: 'unauthorized' }, { status: 401 })
}

export function authorizeDevice(header: string | null, token: string | undefined): Response | null {
  if (!token || !header?.startsWith('Bearer ')) return unauthorized()
  if (header.slice('Bearer '.length) !== token) return unauthorized()
  return null
}
