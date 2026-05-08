"use client";

import { useEffect, useId, useRef, useState } from "react";

// Helper exposed so callers can produce a stable remount key when their
// Server Component passes new server-side state to this client component.
// See the prop-sync note inside <LessonCompleteButton> for rationale.
export function lessonCompleteButtonKey(kind: ProgressKind, id: string, initialCompleted: boolean) {
  return `${kind}:${id}:${initialCompleted ? "1" : "0"}`;
}

export type ProgressKind = "lesson" | "lab";

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

  // Note on prop-sync: callers pass a `key` derived from `id` +
  // `initialCompleted` so React remounts this component when the
  // server-side progress changes (e.g., after a router refresh that
  // brings new data). That keeps local state aligned with parent props
  // without the `useEffect` setState pattern (banned by the
  // `react-hooks/set-state-in-effect` rule).

  // Synchronous in-flight guard. `useState` is stale-closure-vulnerable for
  // double-clicks fired in the same tick; a ref flips immediately.
  const inFlight = useRef(false);

  // Cancel any in-flight fetch when the component unmounts so we don't call
  // setState on an unmounted instance (React dev warning + lost revert).
  const abortRef = useRef<AbortController | null>(null);
  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  const statusId = useId();

  async function onClick() {
    if (inFlight.current) return;
    inFlight.current = true;

    const next = !completed;
    const previous = completed;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    // Optimistic update.
    setCompleted(next);
    setIsSaving(true);
    setError(null);

    try {
      const res = await fetch("/api/progress", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ kind, id, completed: next }),
        signal: controller.signal,
      });
      if (!res.ok) {
        setCompleted(previous);
        setError("Couldn't save — please try again.");
      }
    } catch (err) {
      // AbortError fires on unmount; the component is gone, don't touch state.
      if ((err as Error | undefined)?.name === "AbortError") {
        inFlight.current = false;
        return;
      }
      setCompleted(previous);
      setError("Couldn't save — please try again.");
    } finally {
      setIsSaving(false);
      inFlight.current = false;
    }
  }

  const visibleLabel = completed ? completedLabel : label;
  // WCAG 2.5.3 — accessible name must contain the visible text. Unmarked
  // state inherits the visible text as its name (no override needed).
  // Marked state's aria-label leads with the visible text and adds toggle
  // context so SR + voice-control users hear/say what they see.
  const ariaLabel = completed
    ? `${visibleLabel} — click to unmark ${kind === "lab" ? "lab as run" : "lesson as complete"}`
    : undefined;

  return (
    <div className="not-prose flex flex-wrap items-center gap-3 rounded-md border border-zinc-200 bg-zinc-50 px-3 py-3 text-sm dark:border-zinc-800 dark:bg-zinc-900/60">
      <button
        type="button"
        onClick={onClick}
        disabled={isSaving}
        aria-label={ariaLabel}
        aria-busy={isSaving}
        aria-describedby={statusId}
        className={
          completed
            ? "rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm transition hover:bg-emerald-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 disabled:opacity-60"
            : "rounded-md bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white shadow-sm transition hover:bg-zinc-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
        }
      >
        {visibleLabel}
      </button>
      <span
        id={statusId}
        role="status"
        aria-live="polite"
        className="text-xs text-zinc-500 dark:text-zinc-400"
      >
        {error ?? (isSaving ? "Saving…" : "")}
      </span>
    </div>
  );
}
