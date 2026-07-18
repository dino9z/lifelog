import { el } from "../utils/dom.js";

// Top bar: brand, user (name + avatar), search trigger.
export function createTopBar(user, { onSearch }) {
  const avatar = user.avatar
    ? (user.avatar.startsWith("http")
        ? el("img", { src: user.avatar, alt: "" })
        : el("span", { text: user.avatar }))
    : el("span", { text: user.name.charAt(0).toUpperCase() });

  const bar = el("div", { class: "topbar" }, [
    el("div", { class: "brand", text: "Lifelog" }),
    el("div", { class: "user" }, [
      el("span", { text: user.name }),
      el("div", { class: "avatar" }, [avatar]),
      el("button", { class: "btn ghost", text: "Search ⌘K", onClick: onSearch }),
    ]),
  ]);
  return { el: bar };
}
