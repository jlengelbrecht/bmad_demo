import Link from "next/link";

import type { Lesson } from "@/lib/lessons/sequence";

type LessonNavProps = {
  current: Lesson;
  prev?: Lesson;
  next?: Lesson;
  total: number;
  ariaLabel?: string;
};

export function LessonNav({ current, prev, next, total, ariaLabel }: LessonNavProps) {
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
            aria-label={`Previous: Lesson ${prev.number} — ${prev.title}`}
          >
            <span className="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              ← Previous
            </span>
            <span className="font-medium text-zinc-900 group-hover:underline dark:text-zinc-100">
              {prev.number}. {prev.title}
            </span>
          </Link>
        ) : (
          <span className="text-xs uppercase tracking-wide text-zinc-400 dark:text-zinc-600">
            Start of curriculum
          </span>
        )}
      </div>

      <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
        Lesson {current.number} of {total}
      </p>

      <div className="min-w-[8rem] text-right">
        {next ? (
          <Link
            href={`/lessons/${next.slug}`}
            className="group inline-flex flex-col text-right"
            aria-label={`Next: Lesson ${next.number} — ${next.title}`}
          >
            <span className="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              Next →
            </span>
            <span className="font-medium text-zinc-900 group-hover:underline dark:text-zinc-100">
              {next.number}. {next.title}
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
