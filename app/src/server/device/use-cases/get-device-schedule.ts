import { createDb } from '@/server/common/infra/db'
import { listDeviceEventRows } from '@/server/events/repository/event-queries'
import { toDeviceSchedule } from '@/server/device/services/to-device-schedule'
import { getOrSeedSettingsUseCase } from '@/server/settings/use-cases/put-settings'
import type { DeviceSchedule } from '@/server/device/types'

export async function getDeviceScheduleUseCase(db: D1Database, now: Date): Promise<DeviceSchedule> {
  const drizzle = createDb(db)
  const settings = await getOrSeedSettingsUseCase(drizzle)
  const rows = await listDeviceEventRows(drizzle)
  return toDeviceSchedule({ now, settings, rows })
}
