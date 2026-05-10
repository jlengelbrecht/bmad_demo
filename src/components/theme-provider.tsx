"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

/**
 * Theme system: three-mode toggle (light / dark / auto) with
 * no-first-paint-flicker SSR.
 *
 * The "no flicker" half is NOT in this Provider — it's an inline
 * synchronous `<script>` block injected at the top of `<head>` in
 * `src/app/layout.tsx`. That script reads `localStorage.theme`,
 * resolves auto-mode via `prefers-color-scheme`, and stamps
 * `data-theme="light"|"dark"` on `<html>` BEFORE the body paints.
 * The Provider exposes the React context and `setTheme()` mutator
 * for runtime toggling; it does not race the initial paint.
 *
 * Source of truth for the active theme is the `data-theme` attribute
 * on `<html>`. localStorage holds the user's preference (which may be
 * `auto`); the resolved theme (always `light` or `dark`) is what
 * components style against.
 */

export type ThemePreference = "light" | "dark" | "auto";
export type ResolvedTheme = "light" | "dark";

type ThemeContextValue = {
  /** What the user picked (or 'auto'). Persisted in localStorage. */
  theme: ThemePreference;
  /** Effective theme — what `data-theme` is on <html>. Always concrete. */
  resolvedTheme: ResolvedTheme;
  /** Set the preference + persist + apply. */
  setTheme: (next: ThemePreference) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

const STORAGE_KEY = "theme";

function resolveAuto(): ResolvedTheme {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function applyResolvedTheme(resolved: ResolvedTheme): void {
  if (typeof document === "undefined") return;
  document.documentElement.setAttribute("data-theme", resolved);
}

function readStoredPreference(): ThemePreference {
  if (typeof window === "undefined") return "auto";
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored === "light" || stored === "dark" || stored === "auto") {
    return stored;
  }
  return "auto";
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemePreference>("auto");
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>("light");

  // On mount: read the stored preference + the current data-theme
  // (which the inline init script set pre-hydration). We deliberately
  // setState in useEffect here — the alternative would be a
  // useSyncExternalStore hook + matching SSR snapshot, which is more
  // machinery than this surface needs (the inline script ensures
  // first-paint correctness; this useEffect is for *React-side state
  // sync*, which is naturally a post-mount concern).
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setThemeState(readStoredPreference());
    const current = document.documentElement.getAttribute("data-theme");
    setResolvedTheme(
      current === "light" || current === "dark" ? current : resolveAuto(),
    );
  }, []);

  // When the preference is 'auto', listen for OS-level changes and
  // re-resolve. Light + dark preferences are static — no listener.
  useEffect(() => {
    if (theme !== "auto") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      const next: ResolvedTheme = mq.matches ? "dark" : "light";
      setResolvedTheme(next);
      applyResolvedTheme(next);
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [theme]);

  const setTheme = useCallback((next: ThemePreference) => {
    setThemeState(next);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, next);
    }
    const resolved: ResolvedTheme = next === "auto" ? resolveAuto() : next;
    setResolvedTheme(resolved);
    applyResolvedTheme(resolved);
  }, []);

  const value = useMemo(
    () => ({ theme, resolvedTheme, setTheme }),
    [theme, resolvedTheme, setTheme],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used inside <ThemeProvider>");
  }
  return ctx;
}

/**
 * The synchronous init script as a plain string. Layout.tsx injects
 * this into `<head>` before any rendered content so `data-theme` is
 * set before first paint — no FOUC of light mode flashing on a
 * dark-mode page reload.
 *
 * Kept short on purpose. Reads localStorage; resolves auto via
 * matchMedia; sets the attribute. Wrapped in IIFE + try/catch so a
 * privacy-locked-down browser (localStorage throws) still gets a
 * working light-mode default.
 */
export const THEME_INIT_SCRIPT = `(function(){try{var s=localStorage.getItem('${STORAGE_KEY}');var t=(s==='light'||s==='dark')?s:(window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');document.documentElement.setAttribute('data-theme',t);}catch(e){document.documentElement.setAttribute('data-theme','light');}})();`;
