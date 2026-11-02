import { createFileRoute } from '@tanstack/react-router'
import { env } from 'cloudflare:workers'
import { authorizeDevice } from '@/server/device/infra/authorize-device'
import { toDeviceSchedule, unavailable } from '@/server/device/services/to-device-schedule'
import { createDb } from '@/server/common/infra/db'
import { listDeviceEventRows } from '@/server/events/repository/event-queries'
import { listDeviceGoogleTasks } from '@/server/google/repository/google-queries'
import { getOrSeedSettingsUseCase } from '@/server/settings/use-cases/put-settings'

// GET /api/device/schedule — Bearer auth; JSON: serverUnix, timezone, reminderMinutes, showNextEvents, events[{ id, title, startUnix, endUnix, allDay }], tasks[{ id, title, dueUnix }]
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
          const settings = await getOrSeedSettingsUseCase(env.DB)
          const db = createDb(env.DB)
          const rows = await listDeviceEventRows(db)
          const tasks = await listDeviceGoogleTasks(db)
          return Response.json(toDeviceSchedule({ now: new Date(), settings, rows, tasks }))
        } catch {
          return unavailable()
        }
      },
    },
  },
})
