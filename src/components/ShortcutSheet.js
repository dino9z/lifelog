import { el } from "../utils/dom.js";

const SHORTCUTS = [
  ["Ctrl/Cmd + K", "Open search"],
  ["Ctrl/Cmd + Z", "Undo last toggle"],
  ["?", "Show this shortcut sheet"],
  ["Esc", "Close overlays"],
];

export function createShortcutSheet() {
  const overlay = el("div", { class: "overlay", style: "display:none" }, [
    el("div", { class: "palette shortcuts" }, [
      el("h2", { text: "Keyboard shortcuts" }),
      el("dl", {}, SHORTCUTS.flatMap(([k, d]) => [
        el("kbd", { text: k }), el("span", { text: d }),
      ])),
    ]),
  ]);
  overlay.addEventListener("click", (e) => { if (e.target === overlay) overlay.style.display = "none"; });
  return {
    el: overlay,
    open: () => { overlay.style.display = "grid"; },
    close: () => { overlay.style.display = "none"; },
  };
}
