import { createFileRoute } from '@tanstack/react-router'
import { env } from 'cloudflare:workers'
import { authorizeDevice } from '../../../device-auth'
import { loadDeviceSchedule, unavailable } from '../../../device-schedule'

export const Route = createFileRoute('/api/device/schedule')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const denied = authorizeDevice(
          request.headers.get('Authorization'),
          env.DEVICE_API_TOKEN,
        )
        if (denied) return denied
        try {
          return Response.json(await loadDeviceSchedule(env.DB, new Date()))
        } catch {
          return unavailable()
        }
      },
    },
  },
})
