// Auto-computes a completion-dot intensity tier (0–4) for the contribution graph.
// Tier is derived from how much was recorded that day, not from pressure/streaks.
//   0 = not completed (no dot)
//   1 = completed, no note
//   2 = completed, short note
//   3 = completed, medium note
//   4 = completed, substantial note
export function computeIntensity(entry) {
  if (!entry || !entry.completed) return 0;
  const len = (entry.note || "").trim().length;
  if (len === 0) return 1;
  if (len < 40) return 2;
  if (len < 120) return 3;
  return 4;
}
