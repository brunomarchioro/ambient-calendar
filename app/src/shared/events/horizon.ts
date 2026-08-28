const MS_PER_DAY = 86_400_000

export function horizonEnd(now: Date, lookaheadDays: number): Date {
  return new Date(now.getTime() + lookaheadDays * MS_PER_DAY)
}

export type EventInstant = {
  startAt: string
  endAt: string | null
}

export function parseEventInstant(iso: string): Date {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) throw new Error('invalid instant')
  return date
}

type ParsedEvent<T> = {
  event: T
  start: Date
  end: Date | null
}

function overlapsHorizon(start: Date, end: Date | null, now: Date, horizon: Date): boolean {
  if (!(start.getTime() < horizon.getTime())) return false
  if (end === null) return start.getTime() >= now.getTime()
  return end.getTime() > now.getTime()
}

function parseEventRow<T extends EventInstant>(event: T): ParsedEvent<T> {
  return {
    event,
    start: parseEventInstant(event.startAt),
    end: event.endAt === null ? null : parseEventInstant(event.endAt),
  }
}

export type SelectEventsInHorizonOptions = {
  now: Date
  lookaheadDays: number
  showNextEvents?: number
}

export function selectParsedEventsInHorizon<T extends EventInstant>(
  events: readonly T[],
  options: SelectEventsInHorizonOptions,
): ParsedEvent<T>[] {
  const horizon = horizonEnd(options.now, options.lookaheadDays)
  const selected = events
    .map(parseEventRow)
    .filter(({ start, end }) => overlapsHorizon(start, end, options.now, horizon))
    .sort((a, b) => a.start.getTime() - b.start.getTime())
  if (options.showNextEvents === undefined) return selected
  return selected.slice(0, options.showNextEvents)
}

export function selectEventsInHorizon<T extends EventInstant>(
  events: readonly T[],
  options: SelectEventsInHorizonOptions,
): T[] {
  return selectParsedEventsInHorizon(events, options).map(({ event }) => event)
}
