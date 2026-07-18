import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type {
  Habit,
  DailyReflection,
  LifelogData,
  Settings,
  ThemeName,
  WeekStart,
} from './types'
import { generateSeed } from './lib/seed'
import { idbStorage } from './lib/idbStorage'
import { toKey } from './lib/date'

interface Actions {
  toggleEntry: (habitId: string, date: string) => void
  setEntry: (habitId: string, date: string, completed: boolean) => void
  addHabit: (habit: Omit<Habit, 'id' | 'archived'> & { archived?: boolean }) => void
  updateHabit: (habit: Habit) => void
  deleteHabit: (id: string) => void
  setReflection: (date: string, patch: Partial<DailyReflection>) => void
  setTheme: (theme: ThemeName) => void
  setWeekStart: (w: WeekStart) => void
  setReminder: (r: { enabled: boolean; time: string }) => void
  addCategory: (cat: string) => void
  importData: (data: LifelogData) => void
  resetAll: () => void
}

export type Store = LifelogData & Actions

const seed = generateSeed()

export const useStore = create<Store>()(
  persist(
    (set) => ({
      ...seed,

      toggleEntry: (habitId, date) =>
        set((state) => {
          const existing = state.entries.find((e) => e.habitId === habitId && e.date === date)
          if (existing) {
            return {
              entries: state.entries.map((e) =>
                e === existing ? { ...e, completed: !e.completed } : e,
              ),
            }
          }
          return {
            entries: [...state.entries, { id: `${habitId}-${date}`, habitId, date, completed: true }],
          }
        }),

      setEntry: (habitId, date, completed) =>
        set((state) => {
          const existing = state.entries.find((e) => e.habitId === habitId && e.date === date)
          if (existing) {
            return { entries: state.entries.map((e) => (e === existing ? { ...e, completed } : e)) }
          }
          return { entries: [...state.entries, { id: `${habitId}-${date}`, habitId, date, completed }] }
        }),

      addHabit: (input) =>
        set((state) => ({
          habits: [
            ...state.habits,
            { ...input, archived: input.archived ?? false, id: `h_${Math.random().toString(36).slice(2, 10)}` },
          ],
        })),

      updateHabit: (habit) =>
        set((state) => ({ habits: state.habits.map((h) => (h.id === habit.id ? habit : h)) })),

      deleteHabit: (id) =>
        set((state) => ({
          habits: state.habits.filter((h) => h.id !== id),
          entries: state.entries.filter((e) => e.habitId !== id),
        })),

      setReflection: (date, patch) =>
        set((state) => {
          const existing = state.reflections.find((r) => r.date === date)
          if (existing) {
            return {
              reflections: state.reflections.map((r) => (r.date === date ? { ...r, ...patch } : r)),
            }
          }
          return { reflections: [...state.reflections, { date, ...patch }] }
        }),

      setTheme: (theme) => set((state) => ({ settings: { ...state.settings, theme } })),
      setWeekStart: (w) => set((state) => ({ settings: { ...state.settings, weekStart: w } })),
      setReminder: (r) => set((state) => ({ settings: { ...state.settings, reminder: r } })),

      addCategory: (cat) =>
        set((state) =>
          state.settings.categories.includes(cat)
            ? {}
            : { settings: { ...state.settings, categories: [...state.settings.categories, cat] } },
        ),

      importData: (data) => set(() => ({ ...data })),

      resetAll: () => set(() => ({ ...generateSeed() })),
    }),
    {
      name: 'lifelog-v1',
      storage: createJSONStorage(() => idbStorage),
      partialize: (state): LifelogData => ({
        version: state.version,
        user: state.user,
        habits: state.habits,
        entries: state.entries,
        reflections: state.reflections,
        settings: state.settings,
      }),
    },
  ),
)

export function useSettings(): Settings {
  return useStore((s) => s.settings)
}

export { toKey }
