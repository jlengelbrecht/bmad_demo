"use client";

import { useEffect, useRef, useState } from "react";
import { Terminal } from "xterm";
import { FitAddon } from "@xterm/addon-fit";
import "xterm/css/xterm.css";

type Status =
  | { kind: "spawning" }
  | { kind: "running" }
  | { kind: "exited"; exitCode: number; signal: number | null }
  | { kind: "error"; message: string };

export function TerminalPane({
  sessionId,
  tool,
  chosenDir,
  onComplete,
}: {
  sessionId: string;
  tool: "claude-code" | "codex" | "github-copilot";
  chosenDir: string;
  onComplete?: () => void;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const termRef = useRef<Terminal | null>(null);
  const fitRef = useRef<FitAddon | null>(null);
  const sseRef = useRef<EventSource | null>(null);
  const [status, setStatus] = useState<Status>({ kind: "spawning" });

  useEffect(() => {
    let cancelled = false;
    const term = new Terminal({
      convertEol: true,
      cursorBlink: true,
      fontFamily:
        '"Geist Mono", ui-monospace, "SF Mono", Menlo, Consolas, monospace',
      fontSize: 13,
      theme: {
        background: "#0a0a0a",
        foreground: "#e4e4e7",
        cursor: "#e4e4e7",
      },
    });
    const fit = new FitAddon();
    term.loadAddon(fit);
    if (containerRef.current) term.open(containerRef.current);
    // xterm's renderer initializes asynchronously inside term.open();
    // calling fit() in the same tick throws "this._renderer.value is
    // undefined" and aborts the rest of useEffect (spawn POST never
    // fires). Defer the initial fit one animation frame.
    requestAnimationFrame(() => {
      try {
        fit.fit();
      } catch {
        // renderer still warming up; the resize listener below will
        // catch up on the next user resize.
      }
    });
    termRef.current = term;
    fitRef.current = fit;
    // Test escape hatch: the bootstrap-pty e2e reads the terminal
    // buffer via this handle. xterm renders to canvas, so .xterm-rows
    // is an a11y-only mirror that lags — Playwright assertions on
    // visible text need the live buffer instead.
    if (typeof window !== "undefined") {
      (window as unknown as { __bmadTerm__?: Terminal }).__bmadTerm__ = term;
    }

    const onResize = () => {
      try {
        fit.fit();
      } catch {
        // ignore — happens during unmount
      }
    };
    window.addEventListener("resize", onResize);

    // Forward keystrokes to the PTY. xterm's onData fires once per
    // keystroke including arrow-key escape sequences (e.g. \x1b[A).
    const dataDispose = term.onData((data) => {
      // fire-and-forget; ordering preserved by the one-PTY-per-session
      // serialization on the server.
      void fetch(
        `/api/capstone/setup/bootstrap/pty/${sessionId}/keystroke`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ keystroke: data }),
        },
      ).catch((err) => {
        console.error("keystroke POST failed", err);
      });
    });

    // Spawn (idempotent), then open SSE for output.
    (async () => {
      try {
        const spawnRes = await fetch(
          "/api/capstone/setup/bootstrap/pty",
          {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ sessionId, tool, chosenDir }),
          },
        );
        if (!spawnRes.ok) {
          const body = (await spawnRes.json().catch(() => ({}))) as {
            error?: string;
          };
          if (cancelled) return;
          setStatus({
            kind: "error",
            message: body.error ?? `spawn failed: HTTP ${spawnRes.status}`,
          });
          return;
        }
        if (cancelled) return;
        setStatus({ kind: "running" });

        const es = new EventSource(
          `/api/capstone/setup/bootstrap/pty/${sessionId}/output`,
        );
        sseRef.current = es;

        es.addEventListener("data", (e) => {
          try {
            const { b64 } = JSON.parse((e as MessageEvent).data) as {
              b64: string;
            };
            // atob → binary string → write to terminal verbatim.
            term.write(atob(b64));
          } catch (err) {
            console.error("decode SSE data failed", err);
          }
        });
        es.addEventListener("exit", (e) => {
          try {
            const { exitCode, signal } = JSON.parse(
              (e as MessageEvent).data,
            ) as { exitCode: number; signal: number | null };
            setStatus({ kind: "exited", exitCode, signal });
            if (exitCode === 0) onComplete?.();
          } catch (err) {
            console.error("decode SSE exit failed", err);
          } finally {
            es.close();
            sseRef.current = null;
          }
        });
        es.addEventListener("error", () => {
          // Browser-level error; if PTY exited cleanly the `exit` event
          // already fired and we already closed. Ignore otherwise — we
          // don't want spurious errors on tab focus changes.
        });
      } catch (err) {
        if (cancelled) return;
        setStatus({
          kind: "error",
          message: err instanceof Error ? err.message : String(err),
        });
      }
    })();

    return () => {
      cancelled = true;
      dataDispose.dispose();
      sseRef.current?.close();
      sseRef.current = null;
      window.removeEventListener("resize", onResize);
      if (
        typeof window !== "undefined" &&
        (window as unknown as { __bmadTerm__?: Terminal }).__bmadTerm__ ===
          term
      ) {
        (window as unknown as { __bmadTerm__?: Terminal }).__bmadTerm__ =
          undefined;
      }
      term.dispose();
      termRef.current = null;
    };
  }, [sessionId, tool, chosenDir, onComplete]);

  return (
    <div className="flex flex-col gap-3">
      <div
        ref={containerRef}
        className="h-[480px] overflow-hidden rounded-md border border-zinc-300 bg-[#0a0a0a] p-2 dark:border-zinc-700"
      />
      <StatusLine status={status} />
    </div>
  );
}

function StatusLine({ status }: { status: Status }) {
  if (status.kind === "spawning") {
    return (
      <p className="text-xs text-zinc-600 dark:text-zinc-400">
        ▶ spawning bootstrap process…
      </p>
    );
  }
  if (status.kind === "running") {
    return (
      <p className="text-xs text-zinc-600 dark:text-zinc-400">
        ▶ bootstrap is running. Use arrow keys + Enter to answer BMAD&apos;s
        prompts.
      </p>
    );
  }
  if (status.kind === "exited") {
    if (status.exitCode === 0) {
      return (
        <p className="text-xs text-emerald-700 dark:text-emerald-400">
          ✓ bootstrap complete (exit 0).
        </p>
      );
    }
    return (
      <p className="text-xs text-rose-700 dark:text-rose-400">
        ✗ bootstrap exited with code {status.exitCode}
        {status.signal !== null ? ` (signal ${status.signal})` : ""}.
      </p>
    );
  }
  return (
    <p className="text-xs text-rose-700 dark:text-rose-400">
      ⚠ {status.message}
    </p>
  );
}
