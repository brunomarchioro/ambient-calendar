import { createFileRoute } from '@tanstack/react-router'
import { env } from 'cloudflare:workers'
import { parseDevicePin, toSettingsResponse } from '@/shared/settings/types'
import { putDevicePinUseCase } from '@/server/settings/use-cases/put-settings'

export const Route = createFileRoute('/api/settings/pin')({
  server: {
    handlers: {
      PUT: async ({ request }) => {
        let body: unknown
        try {
          body = await request.json()
        } catch {
          return Response.json({ error: 'invalid json' }, { status: 400 })
        }
        const parsed = parseDevicePin(body && typeof body === 'object' && 'pin' in body ? body.pin : undefined)
        if (!parsed.success) {
          return Response.json({ error: 'invalid PIN' }, { status: 400 })
        }
        return Response.json(toSettingsResponse(await putDevicePinUseCase(env.DB, parsed.data)))
      },
      DELETE: async () => Response.json(toSettingsResponse(await putDevicePinUseCase(env.DB, null))),
    },
  },
})
