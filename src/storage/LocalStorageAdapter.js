import { Storage } from "./Storage.js";

const KEY = "lifelog:state:v1";

function emptyState() {
  return { user: null, entries: {}, version: 1 };
}

// localStorage-backed implementation of the Storage interface.
export class LocalStorageAdapter extends Storage {
  async load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return emptyState();
      const parsed = JSON.parse(raw);
      return { ...emptyState(), ...parsed };
    } catch {
      return emptyState();
    }
  }

  async save(state) {
    localStorage.setItem(KEY, JSON.stringify(state));
  }
}
