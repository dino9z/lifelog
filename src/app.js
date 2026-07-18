import { el } from "./utils/dom.js";
import { debounce } from "./utils/debounce.js";
import { registerShortcuts } from "./utils/shortcuts.js";
import { todayKey } from "./utils/date.js";
import { computeIntensity } from "./utils/intensity.js";
import { createOnboarding } from "./components/Onboarding.js";
import { createTopBar } from "./components/TopBar.js";
import { createMonthGrid } from "./components/MonthGrid.js";
import { createDayDetail } from "./components/DayDetail.js";
import { createSearchPalette } from "./components/SearchPalette.js";
import { createShortcutSheet } from "./components/ShortcutSheet.js";

export function createApp(root, storage) {
  let state = { user: null, entries: {}, version: 1 };
  let lastToggle = null; // { key, prevCompleted }

  const save = debounce(async () => {
    await storage.save(state);
    if (detail) detail.setSaved();
  }, 400);

  // --- builders (assigned after load) ---
  let grid, detail, search, shortcuts;

  function getEntries() { return state.entries; }
  function getEntry(key) { return state.entries[key]; }

  function updateEntry(key, entry) {
    if (entry.completed !== undefined) {
      lastToggle = { key, prevCompleted: !entry.completed };
    }
    const merged = { ...state.entries[key], date: key, ...entry };
    merged.intensity = computeIntensity(merged);
    state.entries[key] = merged;
    renderGrid();
    save();
  }

  function undo() {
    if (!lastToggle) return;
    const { key, prevCompleted } = lastToggle;
    const entry = state.entries[key] || { note: "" };
    const merged = { ...entry, date: key, completed: prevCompleted, updatedAt: new Date().toISOString() };
    merged.intensity = computeIntensity(merged);
    state.entries[key] = merged;
    renderGrid();
    if (detail) detail.show(key);
    save();
  }

  function renderGrid() {
    const d = new Date();
    grid.render(d.getFullYear(), d.getMonth());
  }

  function selectDate(key) {
    detail.show(key);
    detail.el.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  async function boot() {
    state = await storage.load();
    if (!state.user) return showOnboarding();
    showMain();
  }

  function showOnboarding() {
    root.innerHTML = "";
    const ob = createOnboarding((user) => {
      state.user = user;
      save();
      showMain();
    });
    root.appendChild(ob.el);
  }

  function showMain() {
    root.innerHTML = "";
    const shell = el("div", { class: "shell" });

    grid = createMonthGrid(getEntries, selectDate);
    detail = createDayDetail(getEntry, {
      onChange: updateEntry,
      onUndo: undo,
      onSaved: () => detail.setSaved(),
    });
    search = createSearchPalette(state.entries, { onSelectDate: selectDate });
    shortcuts = createShortcutSheet();

    const topbar = createTopBar(state.user, { onSearch: () => search.open() });

    shell.appendChild(topbar.el);
    shell.appendChild(grid.el);
    detail.show(todayKey());
    shell.appendChild(detail.el);
    shell.appendChild(search.el);
    shell.appendChild(shortcuts.el);
    root.appendChild(shell);

    registerShortcuts({
      "ctrl+k": () => search.open(),
      "ctrl+z": undo,
      "?": () => shortcuts.open(),
    });
  }

  return { boot };
}
