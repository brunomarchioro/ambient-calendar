import { createDb } from '@/server/common/infra/db'
import { listDeviceEventRows } from '@/server/events/repository/event-queries'
import { toDeviceSchedule } from '@/server/device/services/to-device-schedule'
import type { DeviceSchedule } from '@/server/device/types'
import type { Settings } from '@/shared/settings/types'

export async function getDeviceScheduleUseCase(
  db: D1Database,
  now: Date,
  settings: Settings,
): Promise<DeviceSchedule> {
  const drizzle = createDb(db)
  const rows = await listDeviceEventRows(drizzle)
  return toDeviceSchedule({ now, settings, rows })
}
