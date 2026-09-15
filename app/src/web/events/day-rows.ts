export type AgendaRow<T> =
  | { kind: 'header'; dayKey: string; label: string }
  | { kind: 'event'; event: T }

export type DayRowsOptions = {
  now: Date
  timeZone: string
}

function calendarDayKey(instant: Date, timeZone: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(instant)
}

const WEEKDAY_PT = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB'] as const

export function formatDayHeader(dayKey: string): string {
  const [year, month, day] = dayKey.split('-').map(Number)
  const wday = new Date(Date.UTC(year, month - 1, day)).getUTCDay()
  return `${WEEKDAY_PT[wday]} ${day}`
}

export function planDayRows<T extends { startAt: string }>(
  events: readonly T[],
  options: DayRowsOptions,
): AgendaRow<T>[] {
  const rows: AgendaRow<T>[] = []
  let previousDay = calendarDayKey(options.now, options.timeZone)

  for (const event of events) {
    const dayKey = calendarDayKey(new Date(event.startAt), options.timeZone)
    if (dayKey !== previousDay) {
      rows.push({ kind: 'header', dayKey, label: formatDayHeader(dayKey) })
      previousDay = dayKey
    }
    rows.push({ kind: 'event', event })
  }

  return rows
}
