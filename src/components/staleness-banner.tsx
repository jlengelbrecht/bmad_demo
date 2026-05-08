import "server-only";

const STALENESS_THRESHOLD_DAYS = 120;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export type StalenessVerdict =
  | { kind: "fresh"; reviewedAt: string; daysAgo: number }
  | { kind: "stale"; reviewedAt: string; daysAgo: number }
  | { kind: "unknown" };

/**
 * Classify a `reviewedAt` ISO date string against the 120-day staleness
 * window. Pure function so the threshold logic can be Vitest-ed without
 * rendering React.
 *
 * Strictness:
 *   - input must match `YYYY-MM-DD` exactly (no timezone offset, no
 *     month/day rollovers, no partial forms). Anything else → `unknown`.
 *   - future-dated `reviewedAt` (negative `daysAgo`) → `unknown`. Catches
 *     author typos that would otherwise silently classify as fresh.
 *   - day count is computed in UTC-day terms via `Date.UTC` parts so the
 *     boundary is DST-immune and timezone-stable.
 *
 * Server Component / SSG note for callers:
 *   Pages rendered at build time freeze `new Date()` at build time. To
 *   keep the staleness window honest, consuming routes should set
 *   `export const revalidate = 86400` (or `dynamic = "force-dynamic"`)
 *   so this banner re-evaluates as the wall clock advances.
 */
export function classifyStaleness(
  reviewedAt: string | undefined,
  now: Date = new Date(),
): StalenessVerdict {
  if (!reviewedAt || !ISO_DATE.test(reviewedAt)) return { kind: "unknown" };

  const parsed = new Date(reviewedAt);
  if (Number.isNaN(parsed.getTime())) return { kind: "unknown" };

  const reviewedUtcDay = Date.UTC(
    parsed.getUTCFullYear(),
    parsed.getUTCMonth(),
    parsed.getUTCDate(),
  );
  const nowUtcDay = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const daysAgo = Math.floor((nowUtcDay - reviewedUtcDay) / 86_400_000);

  if (daysAgo < 0) return { kind: "unknown" }; // future-dated typo
  if (daysAgo >= STALENESS_THRESHOLD_DAYS) {
    return { kind: "stale", reviewedAt, daysAgo };
  }
  return { kind: "fresh", reviewedAt, daysAgo };
}

type StalenessBannerProps = {
  reviewedAt: string | undefined;
  /** Optional override for tests; production callers pass nothing. */
  now?: Date;
};

function WarningIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="currentColor"
      className="h-4 w-4 shrink-0"
      aria-hidden
    >
      <path d="M10 1.5a1.4 1.4 0 0 0-1.21.7l-7.5 13A1.4 1.4 0 0 0 2.5 17.2h15a1.4 1.4 0 0 0 1.21-2.1l-7.5-13A1.4 1.4 0 0 0 10 1.5Zm-1 5.5h2v5h-2V7Zm0 7h2v2h-2v-2Z" />
    </svg>
  );
}

export function StalenessBanner({ reviewedAt, now }: StalenessBannerProps) {
  const verdict = classifyStaleness(reviewedAt, now);

  if (verdict.kind === "fresh") {
    return (
      <aside
        role="status"
        className="flex items-center gap-2 rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900/60 dark:text-zinc-300"
      >
        <span>Last reviewed {verdict.reviewedAt}</span>
      </aside>
    );
  }

  const message =
    verdict.kind === "stale"
      ? `Last reviewed ${verdict.reviewedAt}; flagged as stale`
      : "No review date — treat as stale";

  return (
    <div
      role="alert"
      className="flex items-center gap-2 rounded-md border border-amber-300 border-l-4 border-l-amber-500 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-900/40 dark:border-l-amber-500 dark:bg-amber-950/40 dark:text-amber-100"
    >
      <WarningIcon />
      <span className="font-semibold uppercase tracking-wide">Stale</span>
      <span>{message}</span>
    </div>
  );
}
