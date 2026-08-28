/** Matches firmware `ALERTS_ISO_LEN` — offset ISO without millis must fit. */
export const DEVICE_ISO_MAX_LEN = 40

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

function timeZoneOffsetMs(utcMs: number, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(utcMs))
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value)
  const asUtc = Date.UTC(
    value('year'),
    value('month') - 1,
    value('day'),
    value('hour'),
    value('minute'),
    value('second'),
  )
  return asUtc - utcMs
}

function formatOffset(offsetMs: number): string {
  const sign = offsetMs >= 0 ? '+' : '-'
  const abs = Math.abs(offsetMs)
  return `${sign}${pad(Math.floor(abs / 3_600_000))}:${pad(Math.floor((abs % 3_600_000) / 60_000))}`
}

/** Instant → `YYYY-MM-DDTHH:MM:SS±HH:MM` in the given IANA timezone (no millis). */
export function formatInTimeZone(instant: Date, timeZone: string): string {
  const offsetMs = timeZoneOffsetMs(instant.getTime(), timeZone)
  const local = new Date(instant.getTime() + offsetMs)
  const iso = `${local.getUTCFullYear()}-${pad(local.getUTCMonth() + 1)}-${pad(local.getUTCDate())}T${pad(local.getUTCHours())}:${pad(local.getUTCMinutes())}:${pad(local.getUTCSeconds())}${formatOffset(offsetMs)}`
  if (iso.length > DEVICE_ISO_MAX_LEN) {
    throw new Error('device iso too long')
  }
  return iso
}

export function instantFromWallClock(wall: string, timeZone: string): Date {
  const withSeconds = wall.length === 16 ? `${wall}:00` : wall
  const [ymd, hms = '00:00:00'] = withSeconds.split('T')
  const [year, month, day] = ymd.split('-').map(Number)
  const [hour, minute, second] = hms.split(':').map(Number)
  const utcGuess = Date.UTC(year, month - 1, day, hour, minute, second ?? 0)
  const offset = timeZoneOffsetMs(utcGuess, timeZone)
  let instantMs = utcGuess - offset
  const offset2 = timeZoneOffsetMs(instantMs, timeZone)
  if (offset2 !== offset) instantMs = utcGuess - offset2
  return new Date(instantMs)
}

export function zonedMidnight(ymd: string, timeZone: string): string {
  return formatInTimeZone(instantFromWallClock(`${ymd}T00:00:00`, timeZone), timeZone)
}

/** Google `dateTime` with or without offset → device offset ISO. */
export function formatGoogleDateTime(dateTime: string, timeZone: string): string {
  if (/[zZ]$/.test(dateTime) || /[+-]\d{2}:\d{2}$/.test(dateTime)) {
    const instant = new Date(dateTime)
    if (Number.isNaN(instant.getTime())) return dateTime
    return formatInTimeZone(instant, timeZone)
  }
  return formatInTimeZone(instantFromWallClock(dateTime, timeZone), timeZone)
}

export function toUnixSeconds(instant: Date): number {
  return Math.floor(instant.getTime() / 1000)
}
