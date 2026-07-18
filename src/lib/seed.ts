import { addDays } from 'date-fns'
import type { Habit, HabitEntry, DailyReflection, LifelogData, User, Settings } from '../types'
import { toKey, eachDay, fromKey } from './date'

function uid(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`
}

const REFLECTIONS = [
  'Today felt productive.',
  'Slow start but finished strong.',
  'Skipped the workout — tired.',
  'Deep focus on the physics problem set.',
  'Read more than planned. Good day.',
  'Quiet, steady day.',
  'Streaky week so far.',
]

export function generateSeed(): LifelogData {
  const today = new Date()

  const habits: Habit[] = [
    { id: 'h_workout', name: 'Workout', icon: 'dumbbell', color: '#fb923c', category: 'Fitness', createdAt: toKey(addDays(today, -200)), archived: false, target: 5 },
    { id: 'h_physics', name: 'Physics', icon: 'brain', color: '#a78bfa', category: 'Study', createdAt: toKey(addDays(today, -260)), archived: false },
    { id: 'h_coding', name: 'Coding', icon: 'code', color: '#38bdf8', category: 'Study', createdAt: toKey(addDays(today, -230)), archived: false },
    { id: 'h_reading', name: 'Reading', icon: 'book', color: '#34d399', category: 'Reading', createdAt: toKey(addDays(today, -150)), archived: false },
    { id: 'h_water', name: 'Water', icon: 'droplet', color: '#2dd4bf', category: 'Health', createdAt: toKey(addDays(today, -210)), archived: false },
  ]

  const entries: HabitEntry[] = []
  const dowBias: Record<string, number> = {
    h_workout: 0.8,
    h_physics: 0.85,
    h_coding: 0.82,
    h_reading: 0.7,
    h_water: 0.9,
  }

  for (const h of habits) {
    const days = eachDay(fromKey(h.createdAt), today)
    for (const day of days) {
      const dow = day.getDay() // 0 Sun .. 6 Sat
      // weekends slightly lower for some habits
      let p = dowBias[h.id] ?? 0.8
      if ((dow === 0 || dow === 6) && h.category === 'Fitness') p -= 0.2
      if ((dow === 1 || dow === 2 || dow === 3) && h.category === 'Study') p += 0.05
      // recent gentle ramp so streaks look alive
      if (Math.random() < p) {
        entries.push({ id: `${h.id}-${toKey(day)}`, habitId: h.id, date: toKey(day), completed: true })
      }
    }
  }

  const reflections: DailyReflection[] = []
  for (let i = 0; i < 10; i++) {
    const d = addDays(today, -i)
    if (i % 2 === 0) {
      reflections.push({
        date: toKey(d),
        reflection: REFLECTIONS[i % REFLECTIONS.length],
        sleep: 6 + Math.round(Math.random() * 3),
        studyHours: Math.round(Math.random() * 6),
        water: 4 + Math.round(Math.random() * 5),
        mood: 3 + Math.round(Math.random() * 2),
      })
    }
  }

  const user: User = {
    id: uid('user'),
    name: 'You',
    createdAt: toKey(addDays(today, -300)),
  }

  const settings: Settings = {
    theme: 'dark',
    weekStart: 1,
    categories: ['Health', 'Fitness', 'Study', 'Reading', 'Personal'],
    reminder: { enabled: false, time: '20:00' },
  }

  return { version: 1, user, habits, entries, reflections, settings, updatedAt: Date.now() }
}
