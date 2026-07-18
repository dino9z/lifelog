import { get, set, del } from 'idb-keyval'
import type { StateStorage } from 'zustand/middleware'

/**
 * Zustand `persist` storage backed by IndexedDB (via idb-keyval).
 * Async, so hydration happens after first paint — the seed state is shown
 * immediately, then replaced once the stored snapshot loads.
 */
export const idbStorage: StateStorage = {
  getItem: async (name) => {
    const value = await get(name)
    return value ?? null
  },
  setItem: async (name, value) => {
    await set(name, value)
  },
  removeItem: async (name) => {
    await del(name)
  },
}
