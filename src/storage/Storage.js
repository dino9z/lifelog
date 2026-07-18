// Storage interface — the UI depends only on this shape.
// Swap LocalStorageAdapter for IndexedDB/Supabase later without touching UI.

export class Storage {
  /** @returns {Promise<AppState>} */
  async load() { throw new Error("not implemented"); }
  /** @param {AppState} state */
  async save(state) { throw new Error("not implemented"); }
}
