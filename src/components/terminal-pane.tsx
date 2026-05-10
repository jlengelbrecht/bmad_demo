"use client";

import { useEffect, useRef, useState } from "react";
import { Terminal } from "xterm";
import { FitAddon } from "@xterm/addon-fit";
import { Unicode11Addon } from "@xterm/addon-unicode11";
import "xterm/css/xterm.css";

type Status =
  | { kind: "spawning" }
  | { kind: "running" }
  | { kind: "exited"; exitCode: number; signal: number | null }
  | { kind: "error"; message: string };

export function TerminalPane({
  ptyId,
  spawnUrl,
  spawnBody,
  deleteUrl,
  onComplete,
  onExit,
}: {
  /**
   * Stable id for the PTY in the registry. Bootstrap uses the bare
   * capstone-session id; chat phases use `<sessionId>.<phase>` so
   * multiple phase PTYs can coexist for the same session.
   */
  ptyId: string;
  /** POST endpoint that spawns the PTY (idempotent). */
  spawnUrl: string;
  /** JSON body forwarded to the spawn POST. */
  spawnBody: Record<string, unknown>;
  /**
   * Optional DELETE endpoint that kills the PTY in the server registry.
   * Called on component unmount with `keepalive: true` so the request
   * survives tab close / route navigation, preventing orphaned AI-tool
   * processes that would otherwise live until the dev server restarts.
   */
  deleteUrl?: string;
  /** Fired when the PTY exits with code 0. */
  onComplete?: () => void;
  /**
   * Fired on every exit (clean or non-zero). Receives the exit code and
   * signal so the parent can branch (trigger phase-done on 0, show retry
   * on non-0). `onComplete` is the convenience for the common case.
   */
  onExit?: (info: { exitCode: number; signal: number | null }) => void;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const termRef = useRef<Terminal | null>(null);
  const fitRef = useRef<FitAddon | null>(null);
  const sseRef = useRef<EventSource | null>(null);
  const [status, setStatus] = useState<Status>({ kind: "spawning" });

  useEffect(() => {
    let cancelled = false;
    let disposed = false;
    let pendingFitFrame: number | null = null;

    // xterm 5.x has a known race during `term.open()`: the Viewport
    // schedules a setTimeout → requestAnimationFrame refresh that
    // sometimes runs before the canvas renderer's async init resolves,
    // throwing "Cannot read properties of undefined (reading
    // 'dimensions')" from Viewport._innerRefresh. Terminal continues
    // working (renderer recovers; cols/rows correct), but Next.js's
    // dev overlay surfaces it as a runtime error.
    //
    // Catch that one specific error during the terminal's lifetime and
    // prevent it from propagating to the dev overlay. The raw
    // ev.error.stack does NOT include the "Viewport" class qualifier
    // (that's only the source-mapped pretty-printed form the dev
    // overlay shows); the stable markers in the raw stack are the
    // method names `_innerRefresh` + `_refreshAnimationFrame`. Gating on
    // both `dimensions` (in the message) and `_innerRefresh` (in the
    // stack) keeps the filter precise enough that we won't accidentally
    // swallow a real bug that happens to mention "dimensions".
    const xtermInitErrorHandler = (ev: ErrorEvent) => {
      const stack = ev.error?.stack ?? "";
      const msg = ev.error?.message ?? ev.message ?? "";
      if (
        msg.includes("dimensions") &&
        (stack.includes("_innerRefresh") || stack.includes("Viewport"))
      ) {
        ev.preventDefault();
        ev.stopImmediatePropagation();
      }
    };
    window.addEventListener("error", xtermInitErrorHandler, true);

    const term = new Terminal({
      convertEol: true,
      cursorBlink: true,
      // Required for the Unicode11 addon below — xterm gates the
      // unicode-version setter behind a "proposed API" opt-in.
      allowProposedApi: true,
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
    // Unicode 11 width tables — without this, modern emoji (🌟 🌐 ⭐
    // and the entire 🇽 family) measure as 1 cell when they should
    // be 2, so xterm writes the next char on top of the right half
    // of the glyph and BMAD's banner emoji get clipped.
    const unicode11 = new Unicode11Addon();
    term.loadAddon(unicode11);
    term.unicode.activeVersion = "11";
    if (containerRef.current) term.open(containerRef.current);
    // xterm's renderer initializes asynchronously inside term.open();
    // calling fit() in the same tick throws "this._renderer.value is
    // undefined" and aborts the rest of useEffect (spawn POST never
    // fires). Defer the initial fit one animation frame.
    pendingFitFrame = requestAnimationFrame(() => {
      pendingFitFrame = null;
      if (disposed) return;
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
      if (disposed) return;
      try {
        fit.fit();
      } catch {
        // ignore — happens during unmount or when the renderer is between
        // teardown phases (xterm's Viewport tries to read .dimensions on
        // a detached renderer).
      }
    };
    window.addEventListener("resize", onResize);

    // Forward keystrokes to the PTY. xterm's onData fires once per
    // keystroke including arrow-key escape sequences (e.g. \x1b[A).
    const dataDispose = term.onData((data) => {
      // fire-and-forget; ordering preserved by the one-PTY-per-session
      // serialization on the server.
      void fetch(`/api/capstone/pty/${ptyId}/keystroke`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ keystroke: data }),
      }).catch((err) => {
        console.error("keystroke POST failed", err);
      });
    });

    // Push xterm's dimensions to the server PTY whenever the renderer
    // recalculates them. Without this AI-tool TUIs use cursor-
    // positioning sequences that land in the wrong rows and the
    // menu draws as a "blended" overlay. Fire-and-forget.
    let lastResizePosted: { cols: number; rows: number } | null = null;
    const resizeDispose = term.onResize(({ cols, rows }) => {
      if (
        lastResizePosted &&
        lastResizePosted.cols === cols &&
        lastResizePosted.rows === rows
      ) {
        return;
      }
      lastResizePosted = { cols, rows };
      void fetch(`/api/capstone/pty/${ptyId}/resize`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ cols, rows }),
      }).catch((err) => {
        console.error("resize POST failed", err);
      });
    });

    // Spawn (idempotent), then open SSE for output.
    (async () => {
      try {
        const spawnRes = await fetch(spawnUrl, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(spawnBody),
        });
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

        const es = new EventSource(`/api/capstone/pty/${ptyId}/output`);
        sseRef.current = es;

        es.addEventListener("data", (e) => {
          try {
            const { b64 } = JSON.parse((e as MessageEvent).data) as {
              b64: string;
            };
            // base64 → raw bytes → xterm.write. The Uint8Array path
            // is required: passing the binary string from atob()
            // directly to term.write() would have xterm interpret
            // each char as a UTF-16 codepoint (so 0xE2 0x96 0xA3
            // would become 3 standalone codepoints instead of one
            // ▣). Bytes route preserves the UTF-8 sequence intact;
            // xterm decodes it correctly.
            const binary = atob(b64);
            const bytes = new Uint8Array(binary.length);
            for (let i = 0; i < binary.length; i++) {
              bytes[i] = binary.charCodeAt(i);
            }
            term.write(bytes);
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
            onExit?.({ exitCode, signal });
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
      disposed = true;
      if (pendingFitFrame !== null) {
        cancelAnimationFrame(pendingFitFrame);
        pendingFitFrame = null;
      }
      window.removeEventListener("error", xtermInitErrorHandler, true);
      window.removeEventListener("resize", onResize);
      dataDispose.dispose();
      resizeDispose.dispose();
      sseRef.current?.close();
      sseRef.current = null;
      // Best-effort kill the server-side PTY so we don't leave the
      // trainee's AI-tool process running orphaned. `keepalive: true`
      // makes the request survive tab close / route navigation; the
      // browser flushes it as the page unmounts. The endpoint is
      // idempotent — duplicate DELETEs are safe.
      if (deleteUrl) {
        try {
          void fetch(deleteUrl, { method: "DELETE", keepalive: true }).catch(
            () => {
              // Swallow; nothing we can do from a teardown.
            },
          );
        } catch {
          // fetch can throw synchronously during unload in some browsers.
        }
      }
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
      fitRef.current = null;
    };
    // The deps list intentionally omits spawnBody (object identity
    // would force re-spawn on every render even if values match).
    // Callers should keep ptyId+spawnUrl+deleteUrl stable for a given mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ptyId, spawnUrl, deleteUrl, onComplete, onExit]);

  return (
    <div className="flex flex-col gap-3">
      <div
        ref={containerRef}
        // Right padding is wider than the rest (`pr-4` vs `pl-2`/`py-2`)
        // because some platforms (Firefox/Linux with overlay-style
        // scrollbars) render the xterm-viewport's vertical scrollbar
        // ON TOP of content rather than reserving layout space — even
        // with `scrollbar-gutter: stable`. Reserving 16px of padding on
        // the right shrinks the xterm canvas (FitAddon picks up the
        // narrower clientWidth and computes fewer cols), so the overlay
        // scrollbar has empty padding to land on instead of clipping
        // the rightmost column.
        className="h-[560px] overflow-hidden rounded-md border border-zinc-300 bg-[#0a0a0a] py-2 pl-2 pr-4 dark:border-zinc-700"
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
