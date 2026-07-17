export function toISODate(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

export function nextSevenDays(from = new Date()): Date[] {
  const start = new Date(from)
  start.setHours(0, 0, 0, 0)
  return Array.from({ length: 7 }, (_, i) => addDays(start, i))
}

export function formatDayLabel(date: Date): string {
  return date
    .toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' })
    .toUpperCase()
}

export function formatRangeLabel(dates: Date[]): string {
  if (dates.length === 0) return ''
  const start = dates[0]
  const end = dates[dates.length - 1]
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }
  return `${start.toLocaleDateString('en-US', opts)} – ${end.toLocaleDateString('en-US', opts)}`
}

export function isSameDay(a: Date, b: Date): boolean {
  return toISODate(a) === toISODate(b)
}
