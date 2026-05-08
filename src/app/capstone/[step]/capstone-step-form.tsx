"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type CapstoneStepName = "brief" | "epic" | "story-1" | "story-2" | "adr";

type Props = {
  session: string;
  step: CapstoneStepName;
  /** Trainee-facing step title (e.g. "Product Brief"). Used as the
   * textarea's `aria-label` so the accessible name matches the page
   * heading (WCAG 2.5.3 — Story 4.4 review patch). */
  stepTitle: string;
  initialContent: string;
  isFinalStep: boolean;
  /** Where to navigate after a successful save. `null` if final step. */
  nextStepHref: string | null;
};

export function CapstoneStepForm({
  session,
  step,
  stepTitle,
  initialContent,
  isFinalStep,
  nextStepHref,
}: Props) {
  const router = useRouter();
  const [content, setContent] = useState(initialContent);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const inFlight = useRef(false);
  const abortRef = useRef<AbortController | null>(null);
  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  const statusId = useId();
  const textareaId = useId();

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (inFlight.current) return;
    inFlight.current = true;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setIsSaving(true);
    setError(null);

    let aborted = false;
    let navigated = false;

    try {
      // Step 1: write the artifact + upsert the capstone-step row.
      const saveRes = await fetch("/api/capstone/save", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ session, step, content }),
        signal: controller.signal,
      });
      if (!saveRes.ok) {
        setError("Couldn't save — please try again.");
        return;
      }

      // Step 2: if this is the final step, fire the session-complete
      // transition. The artifact is already on disk + the step row is
      // upserted, so a failure here leaves the trainee on the page with
      // an idempotent retry path (re-clicking Save runs both POSTs again).
      if (isFinalStep) {
        const completeRes = await fetch("/api/progress", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            kind: "capstone-session",
            id: session,
            completed: true,
          }),
          signal: controller.signal,
        });
        if (!completeRes.ok) {
          setError(
            "Saved your final artifact, but couldn't mark the session complete. Click Save and finish to retry.",
          );
          return;
        }
        // Capstone done — navigate to the overview's complete-session branch.
        router.push(`/capstone?session=${session}`);
        navigated = true;
        return;
      }

      // Non-final step: navigate to the next step.
      if (nextStepHref) {
        router.push(nextStepHref);
        navigated = true;
      }
    } catch (err) {
      if ((err as Error | undefined)?.name === "AbortError") {
        aborted = true;
        return;
      }
      setError("Couldn't save — please try again.");
    } finally {
      if (!navigated && !aborted) {
        setIsSaving(false);
      }
      inFlight.current = false;
    }
  }

  const buttonLabel = isFinalStep ? "Save and finish" : "Save and continue";

  return (
    <form
      onSubmit={onSubmit}
      className="not-prose flex flex-col gap-3 rounded-md border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900/60"
    >
      <label
        htmlFor={textareaId}
        className="text-xs font-medium uppercase tracking-wide text-zinc-600 dark:text-zinc-400"
      >
        Your {step} (Markdown)
      </label>
      <textarea
        id={textareaId}
        name="content"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        rows={20}
        className="w-full resize-y rounded-md border border-zinc-300 bg-white px-3 py-2 font-mono text-sm text-zinc-900 shadow-inner focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
        aria-label={stepTitle}
      />
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={isSaving}
          aria-busy={isSaving}
          aria-describedby={statusId}
          className="rounded-md bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white shadow-sm transition hover:bg-zinc-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
        >
          {isSaving ? "Saving…" : buttonLabel}
        </button>
        <span
          id={statusId}
          role="status"
          aria-live="polite"
          className="text-xs text-zinc-500 dark:text-zinc-400"
        >
          {error ?? ""}
        </span>
      </div>
    </form>
  );
}
