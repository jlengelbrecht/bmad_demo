"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function GenerateHandoffButton({
  sessionId,
  regenerate = false,
}: {
  sessionId: string;
  regenerate?: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onClick = async () => {
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/capstone/handoff/generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });
      const body = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
      };
      if (!res.ok || !body.ok) {
        setError(body.error ?? `HTTP ${res.status}`);
        return;
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={onClick}
        disabled={pending}
        className="w-fit rounded-md bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50 hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
      >
        {pending
          ? "Generating…"
          : regenerate
            ? "Regenerate HANDOFF.md"
            : "Generate HANDOFF.md"}
      </button>
      {error ? (
        <p className="text-xs text-rose-600 dark:text-rose-400">⚠ {error}</p>
      ) : null}
    </div>
  );
}
