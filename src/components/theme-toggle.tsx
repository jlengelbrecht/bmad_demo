"use client";

import { useTheme, type ThemePreference } from "./theme-provider";

/**
 * Three-button segmented control: Light / Dark / Auto.
 *
 * Less ambitious than Story 11.1 AC6's full sliding-pill dropdown-on-
 * narrow-viewports spec — that's deferred with the rest of the
 * Radix/lucide vendor work. This is the practical minimum: three
 * focusable buttons with aria-pressed flags, a brand-color highlight
 * on the active option, and persistent state via the ThemeProvider.
 *
 * The buttons inline-render at all viewports (no responsive collapse
 * to a dropdown for now). At 360px width they still fit comfortably
 * because the icons are SVG-only on narrow screens.
 */
const OPTIONS: {
  value: ThemePreference;
  label: string;
  icon: React.ReactNode;
}[] = [
  {
    value: "light",
    label: "Light",
    icon: <SunIcon className="h-3.5 w-3.5" />,
  },
  {
    value: "dark",
    label: "Dark",
    icon: <MoonIcon className="h-3.5 w-3.5" />,
  },
  {
    value: "auto",
    label: "Auto",
    icon: <MonitorIcon className="h-3.5 w-3.5" />,
  },
];

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  return (
    <div
      role="group"
      aria-label="Theme"
      className="inline-flex items-center gap-0.5 rounded-md border border-zinc-200 bg-zinc-50 p-0.5 dark:border-zinc-800 dark:bg-zinc-900"
    >
      {OPTIONS.map((opt) => {
        const isActive = theme === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => setTheme(opt.value)}
            aria-pressed={isActive}
            aria-label={`Theme: ${opt.label}`}
            title={opt.label}
            className={[
              "inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500",
              isActive
                ? "bg-white text-sky-700 shadow-sm dark:bg-zinc-700 dark:text-sky-300"
                : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100",
            ].join(" ")}
          >
            <span aria-hidden>{opt.icon}</span>
            <span className="hidden sm:inline">{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}

/* --- inline icon set --- */
function SunIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
    </svg>
  );
}

function MoonIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

function MonitorIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <rect x="2" y="3" width="20" height="14" rx="2" />
      <path d="M8 21h8M12 17v4" />
    </svg>
  );
}
