// Date helpers — all dates use "YYYY-MM-DD" local keys.

export function todayKey() {
  return toKey(new Date());
}

export function toKey(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function fromKey(key) {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function monthMatrix(year, month) {
  // Returns array of weeks; each week is 7 date-keys (or null for padding).
  const first = new Date(year, month, 1);
  const startWeekday = first.getDay(); // 0 = Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(toKey(new Date(year, month, d)));
  while (cells.length % 7 !== 0) cells.push(null);

  const weeks = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

export function monthTitle(year, month) {
  return new Date(year, month, 1).toLocaleString(undefined, {
    month: "long", year: "numeric",
  });
}

export function prettyDate(key) {
  return fromKey(key).toLocaleString(undefined, {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });
}

export const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
