import {
  addDays,
  startOfMonth,
  endOfMonth,
  isBefore,
  startOfWeek,
  subMonths,
  format,
} from 'date-fns'
import { eachDay, fromKey, toKey, todayKey } from './date'
import type { Habit, HabitEntry, WeekStart } from '../types'

export function isDone(entries: HabitEntry[], habitId: string, key: string): boolean {
  for (const e of entries) {
    if (e.habitId === habitId && e.date === key && e.completed) return true
  }
  return false
}

export function todayProgress(habits: Habit[], entries: HabitEntry[]): { done: number; total: number } {
  const key = todayKey()
  const active = habits.filter((h) => !h.archived && h.createdAt <= key)
  const done = active.filter((h) => isDone(entries, h.id, key)).length
  return { done, total: active.length }
}

export function monthProgress(
  habits: Habit[],
  entries: HabitEntry[],
  ref: Date = new Date(),
): { done: number; total: number } {
  const start = startOfMonth(ref)
  const end = endOfMonth(ref)
  const today = new Date()
  const e = isBefore(end, today) ? end : today
  let total = 0
  let done = 0
  for (const h of habits.filter((h) => !h.archived)) {
    const s = isBefore(start, fromKey(h.createdAt)) ? fromKey(h.createdAt) : start
    for (const day of eachDay(s, e)) {
      total++
      if (isDone(entries, h.id, toKey(day))) done++
    }
  }
  return { done, total }
}

export function currentStreak(habit: Habit, entries: HabitEntry[], today: Date = new Date()): number {
  let streak = 0
  let d = today
  if (!isDone(entries, habit.id, toKey(d))) d = addDays(d, -1)
  const created = fromKey(habit.createdAt)
  while (isDone(entries, habit.id, toKey(d)) && !isBefore(d, created)) {
    streak++
    d = addDays(d, -1)
  }
  return streak
}

export function longestStreak(habit: Habit, entries: HabitEntry[], today: Date = new Date()): number {
  const days = eachDay(fromKey(habit.createdAt), today)
  let best = 0
  let run = 0
  for (const day of days) {
    if (isDone(entries, habit.id, toKey(day))) {
      run++
      best = Math.max(best, run)
    } else {
      run = 0
    }
  }
  return best
}

/** Completion % over [start, end], clamped to the habit's life and to today. */
export function completionRate(
  habit: Habit,
  entries: HabitEntry[],
  start: Date,
  end: Date,
  today: Date = new Date(),
): number {
  const created = fromKey(habit.createdAt)
  const s = isBefore(start, created) ? created : start
  const e = isBefore(end, today) ? end : today
  if (isBefore(e, s)) return 0
  let total = 0
  let done = 0
  for (const day of eachDay(s, e)) {
    total++
    if (isDone(entries, habit.id, toKey(day))) done++
  }
  return total ? Math.round((done / total) * 100) : 0
}

export function overallConsistency(habits: Habit[], entries: HabitEntry[], today: Date = new Date()): number {
  const active = habits.filter((h) => !h.archived)
  if (!active.length) return 0
  let total = 0
  let done = 0
  for (const h of active) {
    for (const day of eachDay(fromKey(h.createdAt), today)) {
      total++
      if (isDone(entries, h.id, toKey(day))) done++
    }
  }
  return total ? Math.round((done / total) * 100) : 0
}

/** Completion % across all active habits for a single day (0–100). */
export function dailyCompletion(habits: Habit[], entries: HabitEntry[], key: string): number {
  const active = habits.filter((h) => !h.archived && h.createdAt <= key)
  const total = active.length
  if (!total) return 0
  const done = active.filter((h) => isDone(entries, h.id, key)).length
  return Math.round((done / total) * 100)
}

export function dailyCompletionSeries(habits: Habit[], entries: HabitEntry[], days: Date[]): number[] {
  return days.map((d) => dailyCompletion(habits, entries, toKey(d)))
}

function mean(xs: number[]): number {
  if (!xs.length) return 0
  return xs.reduce((a, b) => a + b, 0) / xs.length
}

/** `count` most recent weeks, oldest first. Each value is the week's average daily completion. */
export function weeklyAverages(
  habits: Habit[],
  entries: HabitEntry[],
  count: number,
  weekStart: WeekStart,
  ref: Date = new Date(),
): { label: string; value: number }[] {
  const today = new Date()
  const cur = startOfWeek(ref, { weekStartsOn: weekStart })
  const out: { label: string; value: number }[] = []
  for (let i = 0; i < count; i++) {
    const ws = addDays(cur, -7 * i)
    const we = addDays(ws, 6)
    const end = isBefore(we, today) ? we : today
    const days = eachDay(ws, end)
    out.unshift({ label: format(ws, 'MMM d'), value: Math.round(mean(dailyCompletionSeries(habits, entries, days))) })
  }
  return out
}

/** `count` most recent months, oldest first. */
export function monthlyAverages(
  habits: Habit[],
  entries: HabitEntry[],
  count: number,
  ref: Date = new Date(),
): { label: string; value: number }[] {
  const today = new Date()
  let cur = startOfMonth(ref)
  const out: { label: string; value: number }[] = []
  for (let i = 0; i < count; i++) {
    const ms = cur
    const me = endOfMonth(cur)
    const end = isBefore(me, today) ? me : today
    const days = eachDay(ms, end)
    out.unshift({ label: format(ms, 'MMM'), value: Math.round(mean(dailyCompletionSeries(habits, entries, days))) })
    cur = subMonths(cur, 1)
  }
  return out
}

/** Average completion % per weekday (0=Sun…6=Sat) over the last `windowDays`. */
export function weekdayAverages(habits: Habit[], entries: HabitEntry[], windowDays = 90): number[] {
  const today = new Date()
  const start = addDays(today, -windowDays)
  const sums = new Array(7).fill(0)
  const counts = new Array(7).fill(0)
  for (const day of eachDay(start, today)) {
    const dow = day.getDay()
    sums[dow] += dailyCompletion(habits, entries, toKey(day))
    counts[dow]++
  }
  return sums.map((s, i) => (counts[i] ? Math.round(s / counts[i]) : 0))
}

export function categoryBreakdown(habits: Habit[], entries: HabitEntry[]): { category: string; value: number }[] {
  const cats = Array.from(new Set(habits.filter((h) => !h.archived).map((h) => h.category)))
  const today = new Date()
  return cats
    .map((category) => {
      const hs = habits.filter((h) => !h.archived && h.category === category)
      let total = 0
      let done = 0
      for (const h of hs) {
        for (const day of eachDay(fromKey(h.createdAt), today)) {
          total++
          if (isDone(entries, h.id, toKey(day))) done++
        }
      }
      return { category, value: total ? Math.round((done / total) * 100) : 0 }
    })
    .sort((a, b) => b.value - a.value)
}

const WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

/** Pure, non-judgemental observations about the data. */
export function insights(habits: Habit[], entries: HabitEntry[], weekStart: WeekStart): string[] {
  const out: string[] = []
  const active = habits.filter((h) => !h.archived)
  if (!active.length) return out

  const wa = weekdayAverages(active, entries, 90)
  const weekend = (wa[0] + wa[6]) / 2
  const weekday = (wa[1] + wa[2] + wa[3] + wa[4] + wa[5]) / 5
  if (weekend < weekday - 8) out.push(`Completion dips on weekends — ${weekend}% vs ${weekday}% on weekdays.`)
  else if (weekend > weekday + 8) out.push(`You do better on weekends — ${weekend}% vs ${weekday}% on weekdays.`)

  let maxI = 0
  wa.forEach((v, i) => {
    if (v > wa[maxI]) maxI = i
  })
  out.push(`${WEEKDAY_NAMES[maxI]} is your strongest day at ${wa[maxI]}%.`)

  const weeks = weeklyAverages(active, entries, 8, weekStart)
  const recent = mean(weeks.slice(-4).map((w) => w.value))
  const prior = mean(weeks.slice(0, 4).map((w) => w.value))
  if (recent - prior > 5) out.push(`Your consistency has improved over the last month (+${Math.round(recent - prior)}%).`)
  else if (prior - recent > 5) out.push(`Your consistency has slipped recently (−${Math.round(prior - recent)}%).`)

  const best = active
    .map((h) => ({ name: h.name, v: completionRate(h, entries, fromKey(h.createdAt), new Date()) }))
    .sort((a, b) => b.v - a.v)[0]
  if (best) out.push(`${best.name} is your most consistent habit at ${best.v}%.`)

  const cats = categoryBreakdown(active, entries)
  if (cats.length > 1) {
    const top = cats[0]
    const bottom = cats[cats.length - 1]
    out.push(`${top.category} is your strongest category at ${top.value}%.`)
    if (bottom.category !== top.category) out.push(`${bottom.category} is your weakest at ${bottom.value}%.`)
  }

  const streakHabit = active
    .map((h) => ({ name: h.name, s: currentStreak(h, entries) }))
    .sort((a, b) => b.s - a.s)[0]
  if (streakHabit && streakHabit.s > 1) out.push(`${streakHabit.name} holds your longest active streak: ${streakHabit.s} days.`)

  return out
}
