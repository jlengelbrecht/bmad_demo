"use client";

import { useState } from "react";

type ProgressKind = "lesson" | "lab";

type Props = {
  kind: ProgressKind;
  id: string;
  initialCompleted: boolean;
  /** Visible label when the row is NOT yet complete. */
  label?: string;
  /** Visible label when the row is complete. */
  completedLabel?: string;
};

export function LessonCompleteButton({
  kind,
  id,
  initialCompleted,
  label = "Mark complete",
  completedLabel = "Completed ✓",
}: Props) {
  const [completed, setCompleted] = useState(initialCompleted);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onClick() {
    if (isSaving) return;
    const next = !completed;
    const previous = completed;

    // Optimistic update.
    setCompleted(next);
    setIsSaving(true);
    setError(null);

    try {
      const res = await fetch("/api/progress", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ kind, id, completed: next }),
      });
      if (!res.ok) {
        // Revert on non-2xx.
        setCompleted(previous);
        setError("Couldn't save — please try again.");
      }
    } catch {
      setCompleted(previous);
      setError("Couldn't save — please try again.");
    } finally {
      setIsSaving(false);
    }
  }

  const buttonLabel = completed ? completedLabel : label;
  const ariaLabel = completed
    ? `Unmark ${kind === "lab" ? "lab" : "lesson"} as ${kind === "lab" ? "run" : "complete"}`
    : `Mark ${kind === "lab" ? "lab as run" : "lesson as complete"}`;

  return (
    <div className="not-prose flex flex-wrap items-center gap-3 rounded-md border border-zinc-200 bg-zinc-50 px-3 py-3 text-sm dark:border-zinc-800 dark:bg-zinc-900/60">
      <button
        type="button"
        onClick={onClick}
        disabled={isSaving}
        aria-label={ariaLabel}
        aria-busy={isSaving}
        className={
          completed
            ? "rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm transition hover:bg-emerald-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 disabled:opacity-60"
            : "rounded-md bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white shadow-sm transition hover:bg-zinc-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
        }
      >
        {buttonLabel}
      </button>
      <span role="status" aria-live="polite" className="text-xs text-zinc-500 dark:text-zinc-400">
        {error ?? (isSaving ? "Saving…" : "")}
      </span>
    </div>
  );
}
