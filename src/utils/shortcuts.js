// Global keyboard shortcut registry.
// register({ "ctrl+k": fn, "?": fn, "ctrl+z": fn })
// Keys are lowercased; "ctrl" and "meta" (Cmd) are accepted as modifiers.

export function registerShortcuts(map) {
  document.addEventListener("keydown", (e) => {
    const ctrl = e.ctrlKey || e.metaKey;
    const key = e.key.toLowerCase();
    const id = ctrl ? `ctrl+${key}` : key;
    const handler = map[id];
    if (handler) {
      e.preventDefault();
      handler(e);
    }
  });
}
