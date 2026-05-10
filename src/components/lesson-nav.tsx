import Link from "next/link";

import type { Lesson } from "@/lib/lessons/sequence";

type LessonNavProps = {
  current: Lesson;
  prev?: Lesson;
  next?: Lesson;
  total: number;
  /** Full lesson sequence — drives the numbered-pill row. */
  sequence?: readonly Lesson[];
  /** Set of lesson slugs that are currently marked complete. */
  completedSlugs?: ReadonlySet<string>;
  ariaLabel?: string;
};

export function LessonNav({
  current,
  prev,
  next,
  total,
  sequence,
  completedSlugs,
  ariaLabel,
}: LessonNavProps) {
  return (
    <nav
      aria-label={ariaLabel ?? "Lesson navigation"}
      className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-zinc-200 bg-white px-4 py-3 text-sm dark:border-zinc-800 dark:bg-zinc-900"
    >
      <div className="min-w-[8rem]">
        {prev ? (
          <Link
            href={`/lessons/${prev.slug}`}
            className="group inline-flex flex-col text-left"
            aria-label={`Previous: Lesson ${prev.displayNumber} — ${prev.title}${
              completedSlugs?.has(prev.slug) ? ", completed" : ""
            }`}
          >
            <span className="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              ← Previous
            </span>
            <span className="font-medium text-zinc-900 group-hover:underline dark:text-zinc-100">
              {prev.displayNumber}. {prev.title}
              {completedSlugs?.has(prev.slug) ? " ✓" : ""}
            </span>
          </Link>
        ) : (
          <span className="text-xs uppercase tracking-wide text-zinc-400 dark:text-zinc-600">
            Start of curriculum
          </span>
        )}
      </div>

      {sequence && sequence.length > 0 ? (
        <ol
          className="flex items-center gap-1.5"
          aria-label={`Lesson ${total > 0 ? sequence.findIndex((l) => l.slug === current.slug) + 1 : 0} of ${total}`}
        >
          {sequence.map((lesson) => {
            const isCurrent = lesson.slug === current.slug;
            const isComplete = completedSlugs?.has(lesson.slug) ?? false;
            // Accessible name carries every state that applies — a current lesson
            // that is also completed gets both ", current, completed" so the SR
            // user doesn't lose the completion signal on the pill they're on.
            const stateParts: string[] = [];
            if (isCurrent) stateParts.push("current");
            if (isComplete) stateParts.push("completed");
            if (stateParts.length === 0) stateParts.push("not started");
            const ariaLessonLabel = `Lesson ${lesson.displayNumber} — ${lesson.title}, ${stateParts.join(", ")}`;
            return (
              <li key={lesson.slug}>
                <Link
                  href={`/lessons/${lesson.slug}`}
                  aria-label={ariaLessonLabel}
                  aria-current={isCurrent ? "page" : undefined}
                  className={[
                    "inline-flex h-7 min-w-[1.75rem] items-center justify-center rounded-full border px-1 text-xs font-medium transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current",
                    isCurrent
                      ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900"
                      : isComplete
                        ? "border-emerald-500 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200"
                        : "border-zinc-300 bg-white text-zinc-600 hover:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300",
                    // Visual signal for current AND completed: emerald ring around the
                    // dark current pill so glance-readers see both states at once.
                    isCurrent && isComplete ? "ring-2 ring-emerald-500 ring-offset-1 dark:ring-offset-zinc-900" : "",
                  ].join(" ")}
                >
                  <span aria-hidden>{isComplete && !isCurrent ? "✓" : lesson.displayNumber}</span>
                </Link>
              </li>
            );
          })}
        </ol>
      ) : (
        <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          Lesson {current.displayNumber} of {total}
        </p>
      )}

      <div className="min-w-[8rem] text-right">
        {next ? (
          <Link
            href={`/lessons/${next.slug}`}
            className="group inline-flex flex-col text-right"
            aria-label={`Next: Lesson ${next.displayNumber} — ${next.title}${
              completedSlugs?.has(next.slug) ? ", completed" : ""
            }`}
          >
            <span className="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              Next →
            </span>
            <span className="font-medium text-zinc-900 group-hover:underline dark:text-zinc-100">
              {next.displayNumber}. {next.title}
              {completedSlugs?.has(next.slug) ? " ✓" : ""}
            </span>
          </Link>
        ) : (
          <span className="text-xs uppercase tracking-wide text-zinc-400 dark:text-zinc-600">
            End of curriculum
          </span>
        )}
      </div>
    </nav>
  );
}
