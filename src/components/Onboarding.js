import { el } from "../utils/dom.js";

// First-launch onboarding: name + optional avatar only. No auth.
export function createOnboarding(onComplete) {
  const nameInput = el("input", {
    type: "text", placeholder: "e.g. Alex", maxlength: "40",
  });
  const avatarInput = el("input", {
    type: "text", placeholder: "emoji or image URL (optional)",
  });

  const form = el("div", { class: "onboard" }, [
    el("h1", { text: "Lifelog" }),
    el("p", { text: "A calm view of your life as a mosaic of days. Just your name to begin." }),
    el("label", { text: "Display name" }),
    nameInput,
    el("label", { text: "Avatar (optional)" }),
    avatarInput,
    el("button", {
      class: "btn", text: "Start",
      onClick: () => {
        const name = nameInput.value.trim();
        if (!name) { nameInput.focus(); return; }
        const avatar = avatarInput.value.trim() || undefined;
        onComplete({ name, avatar, createdAt: new Date().toISOString() });
      },
    }),
  ]);

  nameInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") form.querySelector("button").click();
  });

  return { el: form };
}
