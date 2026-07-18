# UI Guidelines — Lifelog

Lifelog should feel **calm, editorial, and lightweight** — closer to a personal
journal than a productivity dashboard.

## Typography

- **Typeface:** Inter, self-hosted (`fonts/InterVariable.woff2`). No web-font CDN.
- **Scale:** A restrained type scale. Large, quiet headings; comfortable body
  text. Use `rem` and respect `prefers-reduced-motion`.
- **Weights:** Primarily 400 (body) and 600 (emphasis). Avoid heavy 700+ overuse.

## Color

- **Light theme default.** Near-white background (`#fafafa`), near-black text
  (`#1a1a1a`).
- **Accent:** A single, restrained accent for the completion dot (e.g., a muted
  green `#2da44e` or indigo). One accent only.
- **Completion dots:** Filled dot = completed day. Empty cell = no dot. Use
  opacity tiers (like GitHub) for intensity if a day has richer detail.
- **No red / failure colors.** We do not signal "missed" days negatively.

## Layout

- **Month view is home.** A clean monthly grid (weeks × weekdays) is the centerpiece.
- **Day detail:** Opens as an inline panel / side sheet rather than a route
  change. Keep context (the grid) visible.
- **Density:** Generous whitespace. The grid should breathe.
- **Navigation:** Minimal. No Journal tab. Top bar shows name/avatar + search.

## Components & Interaction

- **Completion dots:** Small (≈10–12px), circles, subtle. Hover shows the date.
- **Search palette (`Ctrl/Cmd+K`):** Centered modal, fuzzy search over journal
  text and dates. Esc or click-outside closes.
- **Autosave indicator:** Tiny "Saved" / "Saving…" text near the day detail.
  Non-intrusive.
- **Undo:** After a toggle, briefly show an "Undo" affordance or support
  `Ctrl/Cmd+Z`.
- **Empty states:** Friendly, plain-language copy. "No entries yet — tap a day to
  begin." No error styling.
- **Keyboard shortcuts:** Documented in-app (e.g., `?` opens a shortcut sheet).

## Motion

- Subtle transitions only (≤150ms). Respect `prefers-reduced-motion`.
- No celebratory animations, confetti, or streak fireworks.
