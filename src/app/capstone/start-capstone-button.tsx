"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Format `Date.now()` as compact UTC matching `CAPSTONE_SESSION_ID`:
 * `YYYYMMDDTHHMMSSZ` (no dashes, colons, or milliseconds). Trainees on
 * a local machine: client-side generation is acceptable because the
 * machine is the same as the server (no clock drift between them).
 */
function compactUtcNow(): string {
  return new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

type Props = {
  /** Where to navigate after successful start. Defaults to `/capstone/brief`. */
  onStartedHref?: string;
  /** Visible button label. Defaults to "Start your capstone". */
  label?: string;
};

export function StartCapstoneButton({
  onStartedHref = "/capstone/brief",
  label = "Start your capstone",
}: Props) {
  const router = useRouter();
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

  async function onClick() {
    if (inFlight.current) return;
    inFlight.current = true;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setIsSaving(true);
    setError(null);

    const id = compactUtcNow();
    let aborted = false;
    let navigated = false;

    try {
      const res = await fetch("/api/progress", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ kind: "capstone-session", id, completed: false }),
        signal: controller.signal,
      });
      if (!res.ok) {
        setError("Couldn't start — please try again.");
        return;
      }
      router.push(`${onStartedHref}?session=${id}`);
      navigated = true;
    } catch (err) {
      if ((err as Error | undefined)?.name === "AbortError") {
        aborted = true;
        return;
      }
      setError("Couldn't start — please try again.");
    } finally {
      // Always reset inFlight and isSaving so the button is recoverable.
      // If `router.push` succeeded, the component unmounts and React drops
      // these state writes; if `router.push` was interrupted (or the user
      // hit a non-2xx), the next click can retry. Aborted requests reset
      // implicitly via unmount; reset here for the no-unmount case too.
      if (!navigated && !aborted) {
        setIsSaving(false);
      }
      inFlight.current = false;
    }
  }

  return (
    <div className="not-prose flex flex-wrap items-center gap-3 rounded-md border border-zinc-200 bg-zinc-50 px-3 py-3 text-sm dark:border-zinc-800 dark:bg-zinc-900/60">
      <button
        type="button"
        onClick={onClick}
        disabled={isSaving}
        aria-busy={isSaving}
        aria-describedby={statusId}
        className="rounded-md bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white shadow-sm transition hover:bg-zinc-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
      >
        {isSaving ? "Starting…" : label}
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
  );
}
