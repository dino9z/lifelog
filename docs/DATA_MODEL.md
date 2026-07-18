# Data Model — Lifelog

All data is owned by a single local user and persisted through a `Storage`
interface (see `src/storage/`). The MVP uses `LocalStorageAdapter` (localStorage),
but the shape is designed to drop into IndexedDB or Supabase later.

## Entities

### User (singleton)
```ts
interface User {
  name: string;          // display name, required at first launch
  avatar?: string;       // optional: image URL or emoji
  createdAt: string;     // ISO timestamp
}
```

### DayEntry (one per calendar day)
```ts
interface DayEntry {
  date: string;          // "YYYY-MM-DD" — primary key
  completed: boolean;    // drives the completion dot
  note: string;          // plain-text journal, no markdown
  intensity?: number;    // 0–4 optional richness tier for the dot
  updatedAt: string;     // ISO timestamp, for autosave/undo
}
```

### AppState
```ts
interface AppState {
  user: User | null;
  entries: Record<string, DayEntry>;  // keyed by date
  version: number;                    // schema version for migrations
}
```

## Storage Interface

```ts
interface Storage {
  load(): Promise<AppState>;
  save(state: AppState): Promise<void>;
  // future adapters (IndexedDB/Supabase) implement the same shape
}
```

- The UI never calls `localStorage` directly. It depends only on `Storage`.
- `save()` is debounced by the caller to power the autosave indicator.
- `load()` returns a sensible empty state when nothing is stored.

## Migration Path

- **IndexedDB:** implement `Storage` with idb; swap the adapter in `main.js`.
- **Supabase:** implement `Storage` with `supabase-js`; add a thin sync layer.
- No model changes required — only the adapter behind the interface changes.
