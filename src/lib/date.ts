import {
  addDays,
  startOfWeek,
  startOfMonth,
  endOfMonth,
  startOfQuarter,
  endOfQuarter,
  startOfYear,
  endOfYear,
  format,
  isSameMonth,
  isBefore,
  differenceInCalendarDays,
} from 'date-fns'
import type { Period, WeekStart } from '../types'

export const toKey = (d: Date): string => format(d, 'yyyy-MM-dd')
export const fromKey = (key: string): Date => {
  const [y, m, day] = key.split('-').map(Number)
  return new Date(y, m - 1, day)
}
export const todayKey = (): string => toKey(new Date())

export function periodRange(
  period: Period,
  weekStart: WeekStart,
  ref: Date = new Date(),
): { start: Date; end: Date } {
  switch (period) {
    case 'week':
      return { start: startOfWeek(ref, { weekStartsOn: weekStart }), end: addDays(startOfWeek(ref, { weekStartsOn: weekStart }), 6) }
    case 'month':
      return { start: startOfMonth(ref), end: endOfMonth(ref) }
    case 'quarter':
      return { start: startOfQuarter(ref), end: endOfQuarter(ref) }
    case 'year':
      return { start: startOfYear(ref), end: endOfYear(ref) }
  }
}

export function eachDay(start: Date, end: Date): Date[] {
  const out: Date[] = []
  let cur = start
  while (!isBefore(end, cur)) {
    out.push(cur)
    cur = addDays(cur, 1)
  }
  return out
}

/**
 * Build calendar weeks (columns of 7) covering [start, end], aligned to
 * weekStart. Leading/trailing days fall outside the range and are flagged
 * so callers can render them as inert fillers (GitHub-style heatmap).
 */
export function buildWeeks(
  start: Date,
  end: Date,
  weekStart: WeekStart,
): { date: Date; inRange: boolean }[][] {
  const gridStart = startOfWeek(start, { weekStartsOn: weekStart })
  const gridEnd = startOfWeek(end, { weekStartsOn: weekStart })
  const weeks: { date: Date; inRange: boolean }[][] = []
  let cur = gridStart
  while (!isBefore(gridEnd, cur)) {
    const week: { date: Date; inRange: boolean }[] = []
    for (let i = 0; i < 7; i++) {
      week.push({ date: cur, inRange: !isBefore(cur, start) && !isBefore(end, cur) })
      cur = addDays(cur, 1)
    }
    weeks.push(week)
  }
  return weeks
}

export function rangeLength(start: Date, end: Date): number {
  return differenceInCalendarDays(end, start) + 1
}

export { isSameMonth, addDays }
