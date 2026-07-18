export type IconKey =
  | 'dumbbell'
  | 'book'
  | 'code'
  | 'droplet'
  | 'moon'
  | 'brain'
  | 'sun'
  | 'leaf'
  | 'music'
  | 'pen'
  | 'coffee'
  | 'heart'
  | 'walk'
  | 'food'
  | 'briefcase'
  | 'sparkles'

export interface Habit {
  id: string
  name: string
  icon: IconKey
  color: string // hex from PALETTE
  category: string
  createdAt: string // YYYY-MM-DD
  archived: boolean
  target?: number // target completions per week (optional)
}

export interface HabitEntry {
  id: string
  habitId: string
  date: string // YYYY-MM-DD
  completed: boolean
}

export interface DailyReflection {
  date: string // YYYY-MM-DD
  reflection?: string
  sleep?: number
  studyHours?: number
  water?: number
  mood?: number // 1-5
}

export interface User {
  id: string
  name: string
  createdAt: string
}

export type ThemeName = 'dark' | 'light' | 'forest' | 'ocean' | 'rain' | 'coffee' | 'sakura' | 'future'
export type WeekStart = 0 | 1 // 0 = Sunday, 1 = Monday
export type Period = 'week' | 'month' | 'quarter' | 'year'
export type View = 'dashboard' | 'habits' | 'analytics' | 'settings'

export interface Settings {
  theme: ThemeName
  weekStart: WeekStart
  categories: string[]
  reminder: { enabled: boolean; time: string }
}

export interface LifelogData {
  version: number
  user: User
  habits: Habit[]
  entries: HabitEntry[]
  reflections: DailyReflection[]
  settings: Settings
}
