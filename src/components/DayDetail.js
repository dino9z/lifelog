import { el } from "../utils/dom.js";
import { prettyDate } from "../utils/date.js";

// Inline day detail: toggle completion + plain-text journal + autosave status.
export function createDayDetail(getEntry, { onChange, onUndo, onSaved }) {
  const title = el("h3", {});
  const meta = el("div", { class: "meta" });
  const textarea = el("textarea", { placeholder: "Write about today… (plain text)" });
  const toggleBox = el("div", { class: "box" });
  const toggleLabel = el("span", { text: "Completed" });
  const toggleWrap = el("div", { class: "toggle" }, [toggleBox, toggleLabel]);
  const status = el("span", { class: "save-status", text: "Saved" });
  const undoBtn = el("button", { class: "btn ghost", text: "Undo", onClick: onUndo });

  const root = el("div", { class: "detail" }, [
    title, meta,
    textarea,
    el("div", { class: "row" }, [toggleWrap, status]),
    el("div", { class: "row" }, [undoBtn, el("span", { class: "save-status" })]),
  ]);

  let currentKey = null;
  const setSaving = () => { status.textContent = "Saving…"; status.classList.add("saving"); };
  const setSaved = () => { status.textContent = "Saved"; status.classList.remove("saving"); };

  function show(key) {
    currentKey = key;
    const entry = getEntry(key) || { completed: false, note: "" };
    title.textContent = prettyDate(key);
    meta.textContent = key;
    textarea.value = entry.note || "";
    toggleWrap.classList.toggle("on", !!entry.completed);
    setSaved();
  }

  toggleWrap.addEventListener("click", () => {
    const entry = getEntry(currentKey) || { completed: false, note: textarea.value };
    const next = { ...entry, completed: !entry.completed, updatedAt: new Date().toISOString() };
    setSaving();
    onChange(currentKey, next);
    toggleWrap.classList.toggle("on", next.completed);
    if (onSaved) setTimeout(onSaved, 300);
  });

  textarea.addEventListener("input", () => {
    setSaving();
    const entry = getEntry(currentKey) || { completed: false };
    onChange(currentKey, { ...entry, note: textarea.value, updatedAt: new Date().toISOString() });
  });

  return { el: root, show, setSaved, setSaving };
}
