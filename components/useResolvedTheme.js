"use client";
import { useSyncExternalStore } from "react";

export const THEME_KEY = "theme";

/**
 * The <html data-theme> attribute is the single source of truth. It is set by
 * the inline script in the root layout before first paint, so there is no
 * flash, and updated by the toggle. Components subscribe to it here rather
 * than through a context provider.
 */
function subscribe(onChange) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-theme"],
  });

  // Follow the OS while the user has not made an explicit choice.
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  const onSystemChange = () => {
    if (!localStorage.getItem(THEME_KEY)) {
      document.documentElement.dataset.theme = media.matches ? "dark" : "light";
    }
    onChange();
  };
  media.addEventListener("change", onSystemChange);

  return () => {
    observer.disconnect();
    media.removeEventListener("change", onSystemChange);
  };
}

const getSnapshot = () => document.documentElement.dataset.theme || "light";

// The server has no way to know the viewer's theme; the inline script corrects
// the DOM before paint and useSyncExternalStore re-reads it after hydration.
const getServerSnapshot = () => "light";

export function useResolvedTheme() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function setTheme(theme) {
  document.documentElement.dataset.theme = theme;
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {
    // Private mode / blocked storage: the choice just won't persist.
  }
}
