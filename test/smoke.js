// Quick, dependency-free smoke test for Lifelog core logic.
// Run with: npm run smoke   (or: node test/smoke.js)
import assert from "node:assert/strict";

// --- localStorage shim so the storage adapter runs under Node ---
const mem = new Map();
globalThis.localStorage = {
  getItem: (k) => (mem.has(k) ? mem.get(k) : null),
  setItem: (k, v) => mem.set(k, String(v)),
  removeItem: (k) => mem.delete(k),
};

const { toKey, fromKey, todayKey, monthMatrix, monthTitle } = await import("../src/utils/date.js");
const { computeIntensity } = await import("../src/utils/intensity.js");
const { LocalStorageAdapter } = await import("../src/storage/LocalStorageAdapter.js");

let passed = 0;
async function check(name, fn) {
  await fn();
  passed++;
  console.log("  ok -", name);
}

await check("toKey/fromKey roundtrip", () => {
  const d = new Date(2026, 0, 9);
  assert.equal(toKey(d), "2026-01-09");
  assert.equal(fromKey("2026-01-09").getTime(), d.getTime());
});

await check("monthMatrix pads to full weeks of 7", () => {
  const weeks = monthMatrix(2026, 1); // Feb 2026
  assert.ok(weeks.length >= 4);
  for (const w of weeks) assert.equal(w.length, 7);
  const flat = weeks.flat().filter(Boolean);
  assert.equal(flat.length, 28); // Feb 2026 has 28 days
});

await check("monthTitle formats", () => {
  assert.match(monthTitle(2026, 0), /January 2026/);
});

await check("todayKey shape", () => {
  assert.match(todayKey(), /^\d{4}-\d{2}-\d{2}$/);
});

await check("intensity: not completed -> 0", () => {
  assert.equal(computeIntensity({ completed: false }), 0);
});
await check("intensity: completed, no note -> 1", () => {
  assert.equal(computeIntensity({ completed: true, note: "" }), 1);
});
await check("intensity: short note -> 2", () => {
  assert.equal(computeIntensity({ completed: true, note: "a".repeat(20) }), 2);
});
await check("intensity: medium note -> 3", () => {
  assert.equal(computeIntensity({ completed: true, note: "a".repeat(80) }), 3);
});
await check("intensity: long note -> 4", () => {
  assert.equal(computeIntensity({ completed: true, note: "a".repeat(200) }), 4);
});

await check("storage save/load roundtrip", async () => {
  const store = new LocalStorageAdapter();
  const state = {
    user: { name: "Alex", createdAt: new Date().toISOString() },
    entries: {
      "2026-01-09": { date: "2026-01-09", completed: true, note: "hello", intensity: 2, updatedAt: "x" },
    },
    version: 1,
  };
  await store.save(state);
  const loaded = await store.load();
  assert.equal(loaded.user.name, "Alex");
  assert.equal(loaded.entries["2026-01-09"].note, "hello");
});

await check("storage returns empty state when nothing stored", async () => {
  mem.clear();
  const store = new LocalStorageAdapter();
  const loaded = await store.load();
  assert.equal(loaded.user, null);
  assert.deepEqual(loaded.entries, {});
});

console.log(`\nAll ${passed} smoke checks passed.`);
