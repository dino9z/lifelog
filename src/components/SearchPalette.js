import { el } from "../utils/dom.js";
import { fromKey } from "../utils/date.js";

// Global search palette (Ctrl/Cmd+K). Searches journal text + dates.
export function createSearchPalette(entries, { onSelectDate }) {
  const input = el("input", { type: "text", placeholder: "Search days…" });
  const results = el("div", { class: "results" });
  const overlay = el("div", { class: "overlay", style: "display:none" }, [
    el("div", { class: "palette" }, [input, results]),
  ]);

  let active = 0;
  let matched = [];

  function close() { overlay.style.display = "none"; }
  function open() {
    overlay.style.display = "grid";
    input.value = ""; render(""); input.focus();
  }

  function render(q) {
    const query = q.trim().toLowerCase();
    matched = Object.values(entries)
      .filter((e) => {
        if (!query) return true;
        return (e.note && e.note.toLowerCase().includes(query)) ||
               e.date.toLowerCase().includes(query);
      })
      .sort((a, b) => (a.date < b.date ? 1 : -1))
      .slice(0, 50);
    active = 0;
    results.innerHTML = "";
    if (matched.length === 0) {
      results.appendChild(el("div", { class: "empty", text: "No days found." }));
      return;
    }
    matched.forEach((e, i) => {
      results.appendChild(el("div", {
        class: `result${i === 0 ? " active" : ""}`,
        onClick: () => choose(e.date),
      }, [
        el("div", { class: "r-date", text: fromKey(e.date).toLocaleDateString() }),
        el("div", { class: "r-note", text: e.note || "(no note)" }),
      ]));
    });
  }

  function choose(date) {
    close();
    onSelectDate(date);
  }

  input.addEventListener("input", () => render(input.value));
  input.addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown") { active = Math.min(active + 1, matched.length - 1); highlight(); }
    else if (e.key === "ArrowUp") { active = Math.max(active - 1, 0); highlight(); }
    else if (e.key === "Enter" && matched[active]) choose(matched[active].date);
    else if (e.key === "Escape") close();
  });
  overlay.addEventListener("click", (e) => { if (e.target === overlay) close(); });

  function highlight() {
    [...results.children].forEach((c, i) => c.classList.toggle("active", i === active));
  }

  return { el: overlay, open, close };
}
