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
import {
  signup as apiSignup,
  login as apiLogin,
  logout as apiLogout,
  pullSync,
  pushSync,
  type AuthUser,
} from './lib/api'

type SyncStatus = 'idle' | 'syncing' | 'ok' | 'error'

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
  signup: (email: string, password: string) => Promise<void>
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  syncNow: () => Promise<void>
  _push: () => Promise<void>
  _pullThenPush: () => Promise<void>
}

interface AuthState {
  token: string | null
  account: AuthUser | null
  syncStatus: SyncStatus
  lastSyncedAt: number | null
  updatedAt: number
}

export type Store = LifelogData & Actions & AuthState

const seed = generateSeed()

function toData(s: Store): LifelogData {
  return {
    version: s.version,
    user: s.user,
    habits: s.habits,
    entries: s.entries,
    reflections: s.reflections,
    settings: s.settings,
    updatedAt: s.updatedAt,
  }
}

export const useStore = create<Store>()(
  persist(
    (set, get) => ({
      ...seed,
      token: null,
      account: null,
      syncStatus: 'idle',
      lastSyncedAt: null,
      updatedAt: seed.updatedAt ?? Date.now(),

      toggleEntry: (habitId, date) =>
        set((state) => {
          const existing = state.entries.find((e) => e.habitId === habitId && e.date === date)
          if (existing) {
            return {
              entries: state.entries.map((e) => (e === existing ? { ...e, completed: !e.completed } : e)),
              updatedAt: Date.now(),
            }
          }
          return {
            entries: [...state.entries, { id: `${habitId}-${date}`, habitId, date, completed: true }],
            updatedAt: Date.now(),
          }
        }),

      setEntry: (habitId, date, completed) =>
        set((state) => {
          const existing = state.entries.find((e) => e.habitId === habitId && e.date === date)
          if (existing) {
            return {
              entries: state.entries.map((e) => (e === existing ? { ...e, completed } : e)),
              updatedAt: Date.now(),
            }
          }
          return {
            entries: [...state.entries, { id: `${habitId}-${date}`, habitId, date, completed }],
            updatedAt: Date.now(),
          }
        }),

      addHabit: (input) =>
        set((state) => ({
          habits: [
            ...state.habits,
            { ...input, archived: input.archived ?? false, id: `h_${Math.random().toString(36).slice(2, 10)}` },
          ],
          updatedAt: Date.now(),
        })),

      updateHabit: (habit) =>
        set((state) => ({ habits: state.habits.map((h) => (h.id === habit.id ? habit : h)), updatedAt: Date.now() })),

      deleteHabit: (id) =>
        set((state) => ({
          habits: state.habits.filter((h) => h.id !== id),
          entries: state.entries.filter((e) => e.habitId !== id),
          updatedAt: Date.now(),
        })),

      setReflection: (date, patch) =>
        set((state) => {
          const existing = state.reflections.find((r) => r.date === date)
          if (existing) {
            return {
              reflections: state.reflections.map((r) => (r.date === date ? { ...r, ...patch } : r)),
              updatedAt: Date.now(),
            }
          }
          return { reflections: [...state.reflections, { date, ...patch }], updatedAt: Date.now() }
        }),

      setTheme: (theme) => set((state) => ({ settings: { ...state.settings, theme }, updatedAt: Date.now() })),
      setWeekStart: (w) => set((state) => ({ settings: { ...state.settings, weekStart: w }, updatedAt: Date.now() })),
      setReminder: (r) => set((state) => ({ settings: { ...state.settings, reminder: r }, updatedAt: Date.now() })),

      addCategory: (cat) =>
        set((state) =>
          state.settings.categories.includes(cat)
            ? { updatedAt: Date.now() }
            : { settings: { ...state.settings, categories: [...state.settings.categories, cat] }, updatedAt: Date.now() },
        ),

      importData: (data) =>
        set((s) => ({
          ...s,
          ...data,
          updatedAt: data.updatedAt ?? s.updatedAt,
          lastSyncedAt: Date.now(),
        })),

      resetAll: () => set(() => ({ ...generateSeed(), updatedAt: Date.now() })),

      _push: async () => {
        const { token, updatedAt } = get()
        if (!token) return
        try {
          const res = await pushSync(token, toData(get()), updatedAt || Date.now())
          set({ updatedAt: res.updatedAt, lastSyncedAt: Date.now() })
        } catch (e) {
          console.error('Lifelog sync push failed', e)
        }
      },

      _pullThenPush: async () => {
        const { token } = get()
        if (!token) return
        try {
          const { snapshot, updatedAt: remoteTs } = await pullSync(token)
          const localTs = get().updatedAt || 0
          const neverSynced = get().lastSyncedAt == null
          if (snapshot && (neverSynced || remoteTs > localTs)) {
            get().importData(snapshot)
          }
          await get()._push()
        } catch (e) {
          console.error('Lifelog sync pull failed', e)
        }
      },

      signup: async (email, password) => {
        set({ syncStatus: 'syncing' })
        try {
          const { token, user } = await apiSignup(email, password)
          set({ token, account: user, syncStatus: 'ok', lastSyncedAt: Date.now() })
          await get()._push()
        } catch (e) {
          set({ syncStatus: 'error' })
          throw e
        }
      },

      login: async (email, password) => {
        set({ syncStatus: 'syncing' })
        try {
          const { token, user } = await apiLogin(email, password)
          set({ token, account: user, syncStatus: 'ok', lastSyncedAt: Date.now() })
          await get()._pullThenPush()
        } catch (e) {
          set({ syncStatus: 'error' })
          throw e
        }
      },

      logout: async () => {
        const token = get().token
        if (token) {
          try {
            await apiLogout(token)
          } catch {
            /* ignore */
          }
        }
        set({ token: null, account: null, syncStatus: 'idle' })
      },

      syncNow: async () => {
        const { token } = get()
        if (!token) return
        set({ syncStatus: 'syncing' })
        try {
          await get()._pullThenPush()
          set({ syncStatus: 'ok', lastSyncedAt: Date.now() })
        } catch (e) {
          set({ syncStatus: 'error' })
          throw e
        }
      },
    }),
    {
      name: 'lifelog-v1',
      storage: createJSONStorage(() => idbStorage),
      partialize: (state): LifelogData & Partial<AuthState> => ({
        version: state.version,
        user: state.user,
        habits: state.habits,
        entries: state.entries,
        reflections: state.reflections,
        settings: state.settings,
        updatedAt: state.updatedAt,
        token: state.token,
        account: state.account,
        lastSyncedAt: state.lastSyncedAt,
      }),
    },
  ),
)

// Auto-push: whenever local data changes (updatedAt moves), sync to the server.
let pushing = false
useStore.subscribe((state, prev) => {
  if (!state.token || pushing) return
  if (state.updatedAt !== prev.updatedAt && state.updatedAt) {
    pushing = true
    state._push().finally(() => {
      pushing = false
    })
  }
})

export function useSettings(): Settings {
  return useStore((s) => s.settings)
}

export { toKey }
