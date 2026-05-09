"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { TerminalPane } from "./terminal-pane";

const TOOL_VALUES = ["claude-code", "codex", "github-copilot"] as const;
type Tool = (typeof TOOL_VALUES)[number];

type AllowResult =
  | { kind: "idle" }
  | { kind: "checking" }
  | { kind: "ok"; resolved: string }
  | { kind: "blocked"; reason: string };

export default function BootstrapPage() {
  const router = useRouter();
  const params = useSearchParams();
  const sessionId = params.get("session");
  const toolParam = params.get("tool");

  const tool = useMemo<Tool | null>(
    () => (TOOL_VALUES.includes(toolParam as Tool) ? (toolParam as Tool) : null),
    [toolParam],
  );

  const [chosenDir, setChosenDir] = useState<string>("");
  const [allow, setAllow] = useState<AllowResult>({ kind: "idle" });
  const [opened, setOpened] = useState<boolean>(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Bounce malformed URL inputs back to the tool-pick page.
  useEffect(() => {
    if (!sessionId || !/^\d{8}T\d{6}Z$/.test(sessionId) || !tool) {
      router.replace("/capstone/setup");
    }
  }, [sessionId, tool, router]);

  if (!sessionId || !tool) return null;

  // Validate the path-allowlist boundary on every change. The actual
  // enforcement happens server-side at PTY-spawn time; this is the
  // pre-flight that gates the "Open terminal" button.
  const checkAllowlist = async (path: string) => {
    if (!path) {
      setAllow({ kind: "idle" });
      return;
    }
    setAllow({ kind: "checking" });
    try {
      const res = await fetch("/api/capstone/setup/path-validate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ path }),
      });
      const body = (await res.json()) as
        | {
            ok: true;
            valid: boolean;
            status: string;
            message: string;
            requiresTypedConfirm?: boolean;
            resolvedPath?: string;
          }
        | { ok: false; error: string };
      if (!body.ok) {
        setAllow({ kind: "blocked", reason: body.error });
        return;
      }
      if (body.valid && !body.requiresTypedConfirm && body.resolvedPath) {
        setAllow({ kind: "ok", resolved: body.resolvedPath });
      } else {
        // Either invalid OR requires typed-confirm (non-empty dir). For
        // v1 we treat both as "pick a fresh path"; the typed-confirm
        // UX lands later.
        setAllow({ kind: "blocked", reason: body.message });
      }
    } catch (err) {
      setAllow({
        kind: "blocked",
        reason: err instanceof Error ? err.message : String(err),
      });
    }
  };

  const handleOpen = () => {
    if (allow.kind === "ok") setOpened(true);
  };

  const handleComplete = () => {
    router.push(
      `/capstone/setup/bootstrap/complete?session=${sessionId}&tool=${tool}`,
    );
  };

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-6 py-12">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
          Phase 2 — bootstrap
        </h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          The portal will run{" "}
          <code className="font-mono">npx bmad-method install</code> in an
          interactive terminal below. Pick where the new repo should live, then
          answer BMAD&apos;s prompts as they appear (arrow keys + Enter, just
          like running it yourself). Lesson 6 covers what each prompt means.
        </p>
      </header>

      {!opened ? (
        <section className="flex flex-col gap-3 rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-100">
            Where should BMAD install?
          </h2>
          <label
            htmlFor="chosen-dir"
            className="text-xs text-zinc-600 dark:text-zinc-400"
          >
            Absolute path to the new repo. The path-write allowlist (NFR-S7) is
            checked here AND re-checked at spawn time.
          </label>
          <input
            id="chosen-dir"
            type="text"
            value={chosenDir}
            placeholder="/home/you/projects/my-bmad-app"
            onChange={(e) => {
              const next = e.target.value;
              setChosenDir(next);
              // Debounced validation — fires 400ms after the user
              // stops typing. Synthetic-blur unreliable in tests; this
              // shape avoids depending on focus events.
              if (debounceRef.current) clearTimeout(debounceRef.current);
              debounceRef.current = setTimeout(() => {
                void checkAllowlist(next);
              }, 400);
            }}
            className="rounded-md border border-zinc-300 bg-zinc-50 px-3 py-2 font-mono text-sm dark:border-zinc-700 dark:bg-zinc-950"
          />
          <AllowBadge allow={allow} />
          {chosenDir.length === 0 ? null : (
            <button
              type="button"
              onClick={() => void checkAllowlist(chosenDir)}
              className="w-fit rounded-md border border-zinc-300 px-2 py-1 text-xs text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              Re-check
            </button>
          )}
          <button
            type="button"
            onClick={handleOpen}
            disabled={allow.kind !== "ok"}
            className="w-fit rounded-md bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50 hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
          >
            Open terminal →
          </button>
        </section>
      ) : (
        <section className="flex flex-col gap-3 rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-100">
              BMAD install — interactive
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-500">
              Target:{" "}
              <code className="font-mono">
                {allow.kind === "ok" ? allow.resolved : chosenDir}
              </code>
            </p>
          </div>
          <TerminalPane
            sessionId={sessionId}
            tool={tool}
            chosenDir={allow.kind === "ok" ? allow.resolved : chosenDir}
            onComplete={handleComplete}
          />
        </section>
      )}
    </main>
  );
}

function AllowBadge({ allow }: { allow: AllowResult }) {
  if (allow.kind === "idle") {
    return (
      <p className="text-xs text-zinc-500 dark:text-zinc-500">
        Type a path — validation runs automatically.
      </p>
    );
  }
  if (allow.kind === "checking") {
    return (
      <p className="text-xs text-zinc-500 dark:text-zinc-500">▶ checking…</p>
    );
  }
  if (allow.kind === "ok") {
    return (
      <p className="text-xs text-emerald-700 dark:text-emerald-400">
        ✓ allowed — resolved to{" "}
        <code className="font-mono">{allow.resolved}</code>
      </p>
    );
  }
  return (
    <p className="text-xs text-rose-700 dark:text-rose-400">
      ✗ blocked: {allow.reason}
    </p>
  );
}
