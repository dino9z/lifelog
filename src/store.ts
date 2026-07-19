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
  refreshAuth as apiRefresh,
  pullSync,
  pushSync,
  getMe,
  registerAuthRefresh,
  type AuthUser,
} from './lib/api'
import { deriveKey, encrypt, decrypt, randomKey } from './lib/crypto'

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
  refresh: () => Promise<void>
  oauthConsume: () => Promise<void>
  applySyncKey: (key: string) => Promise<void>
  syncNow: () => Promise<void>
  _push: () => Promise<void>
  _pullThenPush: () => Promise<void>
}

interface AuthState {
  token: string | null
  refreshToken: string | null
  encKey: string | null
  account: AuthUser | null
  syncStatus: SyncStatus
  needsSyncKey: boolean
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
      refreshToken: null,
      encKey: null,
      account: null,
      syncStatus: 'idle',
      needsSyncKey: false,
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

      resetAll: () =>
        set((state) => ({
          ...state,
          habits: [],
          entries: [],
          reflections: [],
          updatedAt: Date.now(),
        })),

      _push: async () => {
        const { token, encKey, updatedAt } = get()
        if (!token) return
        try {
          const data = encKey ? await encrypt(encKey, toData(get())) : toData(get())
          const res = await pushSync(token, data, updatedAt || Date.now())
          set({ updatedAt: res.updatedAt, lastSyncedAt: Date.now() })
        } catch (e) {
          console.error('Lifelog sync push failed', e)
        }
      },

      _pullThenPush: async () => {
        const { token, encKey } = get()
        if (!token) return
        try {
          const { snapshot, updatedAt: remoteTs } = await pullSync(token)
          const localTs = get().updatedAt || 0
          const neverSynced = get().lastSyncedAt == null
          if (snapshot && (neverSynced || remoteTs > localTs)) {
            if (encKey) {
              try {
                const data = (await decrypt(encKey, snapshot)) as LifelogData
                get().importData(data)
              } catch {
                // Can't decrypt (e.g. social login on a new device without the sync key).
                set({ needsSyncKey: true, syncStatus: 'error' })
                return
              }
            } else {
              get().importData(snapshot as unknown as LifelogData)
            }
          }
          await get()._push()
        } catch (e) {
          console.error('Lifelog sync pull failed', e)
        }
      },

      signup: async (email, password) => {
        set({ syncStatus: 'syncing' })
        try {
          const { token, refreshToken, user, salt } = await apiSignup(email, password)
          const encKey = salt ? await deriveKey(password, salt) : randomKey()
          set({ token, refreshToken, encKey, account: user, syncStatus: 'ok' })
          await get()._push()
        } catch (e) {
          set({ syncStatus: 'error' })
          throw e
        }
      },

      login: async (email, password) => {
        set({ syncStatus: 'syncing' })
        try {
          const { token, refreshToken, user, salt } = await apiLogin(email, password)
          const encKey = salt ? await deriveKey(password, salt) : randomKey()
          // Do NOT set lastSyncedAt here: a fresh device must import the server
          // snapshot (neverSynced), a returning device keeps its value for LWW.
          set({ token, refreshToken, encKey, account: user, syncStatus: 'ok' })
          await get()._pullThenPush()
        } catch (e) {
          set({ syncStatus: 'error' })
          throw e
        }
      },

      refresh: async () => {
        const rt = get().refreshToken
        if (!rt) throw new Error('No refresh token')
        const { token, refreshToken } = await apiRefresh(rt)
        set({ token, refreshToken })
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
        set({ token: null, refreshToken: null, encKey: null, account: null, syncStatus: 'idle' })
      },

      oauthConsume: async () => {
        if (typeof window === 'undefined') return
        const hash = window.location.hash
        const m = hash.match(/accessToken=([^&]+)&?refreshToken=([^&]+)/)
        if (!m) return
        const token = decodeURIComponent(m[1])
        const refreshToken = decodeURIComponent(m[2])
        history.replaceState(null, '', window.location.pathname + window.location.search)
        try {
          const { user } = await getMe(token)
          // Social logins have no password: generate a device-bound key for E2E.
          set({ token, refreshToken, encKey: randomKey(), account: user, syncStatus: 'ok', lastSyncedAt: null })
          await get()._pullThenPush()
        } catch (e) {
          set({ syncStatus: 'error' })
          throw e
        }
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

      applySyncKey: async (key) => {
        set({ encKey: key, needsSyncKey: false })
        await get()._pullThenPush()
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
        refreshToken: state.refreshToken,
        encKey: state.encKey,
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

// Wire the API's transparent 401 -> refresh retry to the store.
registerAuthRefresh(async () => {
  await useStore.getState().refresh()
  const s = useStore.getState()
  return { token: s.token as string, refreshToken: s.refreshToken as string }
})

// On startup, consume OAuth tokens if we were redirected back from a provider.
if (typeof window !== 'undefined') {
  useStore.getState().oauthConsume().catch(() => {})
}

export function useSettings(): Settings {
  return useStore((s) => s.settings)
}

export { toKey }
