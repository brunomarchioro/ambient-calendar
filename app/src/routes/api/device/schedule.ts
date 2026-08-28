import { createFileRoute } from '@tanstack/react-router'
import { env } from 'cloudflare:workers'
import { authorizeDevice } from '@/server/device/infra/authorize-device'
import { unavailable } from '@/server/device/services/to-device-schedule'
import { getDeviceScheduleUseCase } from '@/server/device/use-cases/get-device-schedule'

// GET /api/device/schedule — Bearer auth; JSON: serverUnix, timezone, reminderMinutes, showNextEvents, events[{ id, title, startUnix, endUnix, allDay }]
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
          return Response.json(await getDeviceScheduleUseCase(env.DB, new Date()))
        } catch {
          return unavailable()
        }
      },
    },
  },
})
