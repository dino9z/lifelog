# Roadmap — Lifelog

Phased, shipped-in-order plan. Each phase is independently usable.

## Phase 0 — Scaffold & Docs
- Project structure (`src/`, `styles/`, `docs/`).
- `docs/` (PRD, UI Guidelines, Data Model, Components, Roadmap).
- `index.html`, base CSS, local Inter `@font-face`.
- **Done in this pass.**

## Phase 1 — Storage & Models
- `Storage` interface + `LocalStorageAdapter`.
- `User`, `DayEntry`, `AppState` shapes + load/save.
- First-launch onboarding (name + optional avatar).

## Phase 2 — Month View (core)
- `MonthGrid` with completion dots + intensity tiers.
- Month navigation (prev/next/today).
- GitHub-style contribution emphasis (dots, not checks).

## Phase 3 — Day Detail (merged journal)
- Inline `DayDetail` panel; toggle completion + plain-text note.
- Autosave indicator; debounced saves through `Storage`.

## Phase 4 — Search, Undo, Shortcuts
- `Ctrl/Cmd+K` global search palette over notes/dates.
- Undo after toggle (`Ctrl/Cmd+Z` + brief Undo affordance).
- `?` shortcut sheet; polished empty states.

## Phase 5 — Polish & Hardening
- Empty states, reduced-motion, a11y (roles, focus, aria).
- Light/dark toggle (optional).
- Final pass: remove any auth/markdown/gamification leftovers.

## Future (post-MVP)
- IndexedDB adapter behind `Storage`.
- Multiple habit dimensions (optional richer model).
- React/Next.js migration using the component map in `COMPONENTS.md`.
- Optional Supabase sync (self-hosted, still single-user friendly).
