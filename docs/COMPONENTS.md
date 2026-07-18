# Components — Lifelog

Lifelog is built as small, framework-agnostic ES modules. Each component is a
function that takes state + callbacks and returns/DOM-mutates a node. This keeps
them portable to React/Next.js later (each module maps to a component).

## Component Inventory

### `App` (`src/app.js`)
Top-level orchestrator. Owns `AppState`, wires storage, search, undo, shortcuts.

### `Onboarding` (`src/components/Onboarding.js`)
First-launch prompt: name + optional avatar. Calls `onComplete(user)`.

### `TopBar` (`src/components/TopBar.js`)
Shows user name/avatar, a search trigger, and (optionally) a shortcut hint.
Emits `onSearch`.

### `MonthGrid` (`src/components/MonthGrid.js`)
- Renders the current month as a weeks × weekdays grid.
- Each day cell shows a **completion dot** (filled when `completed`).
- Emits `onSelectDate(date)` when a day is clicked.
- Intensity tiers (0–4) modulate dot opacity for a contribution-graph feel.

### `DayDetail` (`src/components/DayDetail.js`)
- Inline panel/sheet for the selected day.
- Toggle completion (dot) + plain-text `note` textarea.
- Shows autosave status ("Saving…" / "Saved").
- Emits `onChange(entry)` and supports `onUndo`.

### `SearchPalette` (`src/components/SearchPalette.js`)
- `Ctrl/Cmd+K` opens a centered modal.
- Fuzzy search over `entries` by `note` text and `date`.
- Emits `onSelectDate(date)` to jump to a result.

### `ShortcutSheet` (`src/components/ShortcutSheet.js`)
- `?` opens an overlay listing keyboard shortcuts.
- `Esc` closes.

### `EmptyState` (`src/components/EmptyState.js`)
- Reusable friendly empty state for grid/detail/search-no-results.

### Utilities (`src/utils/`)
- `date.js` — date formatting, month matrix builder, "today".
- `debounce.js` — debounce for autosave.
- `shortcuts.js` — global keybinding registry.

## DOM Strategy (MVP)

- Vanilla `document.createElement` / small render helpers. No framework.
- State flows down via callbacks; no global mutation outside `App`.
- Each component file exports a factory: `createX(props) => { el, update }`.

## React Migration Mapping

| Module | React equivalent |
|--------|------------------|
| `createMonthGrid` | `<MonthGrid entries onSelect />` |
| `createDayDetail` | `<DayDetail entry onChange />` |
| `createSearchPalette` | `<SearchPalette />` (cmd palette) |
| `App` | `App` + context/store for `AppState` |

No logic rewrite needed — only the render boundary changes.
