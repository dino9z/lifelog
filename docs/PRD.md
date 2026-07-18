# PRD — Lifelog (Life Contributions)

> A minimalist, GitHub-style "life contributions" tracker. Instead of a gamified
> habit app, Lifelog emphasizes a calm, long-term view of your life as a mosaic
> of days. Each day can be marked complete (a dot) and carry a short plain-text
> journal entry.

## Vision

Lifelog reframes habit tracking around a **contribution graph** — the satisfying,
low-pressure grid of dots you know from GitHub. The goal is reflection, not
streak anxiety. No XP, no achievements, no leaderboards.

## MVP Decisions (locked)

1. **No authentication.** First launch collects only a display name and an
   optional avatar (image URL or emoji). No accounts, no passwords, no backend
   auth. Everything is local.
2. **Plain-text journal.** The day detail journal is plain text only. No Markdown
   rendering, no rich text. What you type is what you get.
3. **Inter bundled locally.** The Inter typeface is self-hosted under `fonts/`
   and loaded via `@font-face`. No requests to Google Fonts or any CDN.
4. **Storage behind an interface.** All persistence goes through a `Storage`
   interface. The MVP ships a `LocalStorageAdapter`. IndexedDB or Supabase can
   replace it later without touching the UI.
5. **Completion dots, not checks/crosses.** The monthly grid shows a minimalist
   dot for completed days. No red crosses, no failure imagery.
6. **Journal merged into Month view.** There is no separate Journal page or nav
   item. Clicking a day opens its detail (journal + completion toggle) inline.
7. **Productivity polish.** Global search (`Ctrl/Cmd+K`), Undo after a habit
   toggle, an autosave indicator, keyboard shortcuts, and polished empty states.
8. **Life-contributions first.** The default home emphasizes the contribution
   grid / heatmap over lists of habits.
9. **No gamification leftovers.** Zero references to authentication, markdown,
   achievements, XP, streaks-as-pressure, or gamification anywhere in code or copy.
10. **Modular & migration-ready.** Code is split into small ES modules with clear
    boundaries (storage, models, components, utils) so it can move to
    React/Next.js with minimal rework.

## Users & Flows

- **First run:** Name + optional avatar prompt → saved → empty-state month view.
- **Daily:** Open month → click a day → toggle completion (dot appears) → write
  plain-text journal → autosaves.
- **Recall:** `Ctrl/Cmd+K` → search days by journal text or date → jump to day.
- **Undo:** Accidental toggle → `Ctrl/Cmd+Z` reverts the last change.

## Out of Scope (MVP)

- Multi-user / sync / cloud accounts
- Markdown, rich text, attachments
- Achievements, XP, leaderboards, social sharing
- Multiple named "habits" with separate streaks (the MVP tracks a single
  life-completion signal per day; habit dimensions can come later)
