import { el } from "../utils/dom.js";
import { monthMatrix, monthTitle, todayKey, WEEKDAYS } from "../utils/date.js";

// Month grid with minimalist completion dots + contribution intensity.
export function createMonthGrid(getEntries, onSelectDate) {
  let year, month;
  const titleEl = el("div", { class: "month-title" });
  const gridEl = el("div", { class: "grid" });

  function render(y, m) {
    year = y; month = m;
    titleEl.textContent = monthTitle(y, m);
    gridEl.innerHTML = "";
    WEEKDAYS.forEach((w) => gridEl.appendChild(el("div", { class: "weekday", text: w })));

    const entries = getEntries();
    const today = todayKey();
    for (const week of monthMatrix(y, m)) {
      for (const key of week) {
        if (!key) { gridEl.appendChild(el("div", { class: "day empty" })); continue; }
        const entry = entries[key];
        const completed = entry && entry.completed;
        const intensity = entry && entry.intensity ? ` i${entry.intensity}` : "";
        const dot = completed ? el("div", { class: `dot${intensity}` }) : null;
        const cell = el("div", {
          class: `day${key === today ? " today" : ""}`,
          title: key,
          onClick: () => onSelectDate(key),
        }, [
          el("span", { class: "num", text: String(Number(key.slice(8))) }),
          dot,
        ]);
        gridEl.appendChild(cell);
      }
    }
  }

  const head = el("div", { class: "month-head" }, [
    el("button", { class: "btn", text: "‹", onClick: () => render(year, month - 1) }),
    titleEl,
    el("div", {}, [
      el("button", { class: "btn", text: "Today", onClick: () => {
        const d = new Date(); render(d.getFullYear(), d.getMonth());
      }}),
      el("button", { class: "btn", text: "›", onClick: () => render(year, month + 1) }),
    ]),
  ]);

  const root = el("div", {}, [head, gridEl]);
  const d = new Date();
  render(d.getFullYear(), d.getMonth());
  return { el: root, render: (y, m) => render(y, m) };
}
