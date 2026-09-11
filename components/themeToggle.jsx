"use client";
import { useLayoutEffect } from "react";
import { useResolvedTheme, setTheme, THEME_KEY } from "@/components/useResolvedTheme";

export default function ThemeToggle() {
  const theme = useResolvedTheme();
  const isDark = theme === "dark";

  // React's dev-mode remount resets <html> to the attributes it manages from
  // JSX, clearing what the inline script set. Re-apply. No-op in production.
  useLayoutEffect(() => {
    try {
      const stored = localStorage.getItem(THEME_KEY);
      const resolved =
        stored ??
        (window.matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light");
      document.documentElement.dataset.theme = resolved;
    } catch {
      document.documentElement.dataset.theme = "light";
    }
  }, []);

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="theme-toggle"
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
    >
      {isDark ? (
        // Sun
        <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
          <circle cx="12" cy="12" r="4.2" fill="currentColor" />
          <g
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            fill="none"
          >
            <path d="M12 2.6v2.2M12 19.2v2.2M2.6 12h2.2M19.2 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M18.7 5.3l-1.6 1.6M6.9 17.1l-1.6 1.6" />
          </g>
        </svg>
      ) : (
        // Moon
        <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
          <path
            d="M20 13.6A8.2 8.2 0 0 1 10.4 4a8.4 8.4 0 1 0 9.6 9.6z"
            fill="currentColor"
          />
        </svg>
      )}
    </button>
  );
}
