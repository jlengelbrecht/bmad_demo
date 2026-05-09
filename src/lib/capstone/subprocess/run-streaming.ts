import { spawn } from "node:child_process";
import { createWriteStream, type WriteStream } from "node:fs";
import { stripVTControlCharacters } from "node:util";

import { getAll, track, untrack } from "./tracked-children";

/**
 * Stream events yielded by `runStreaming`. Exactly one terminal `exit`
 * event closes the iterator after all line events have been emitted.
 */
export type ProcEvent =
  | { kind: "stdout-line"; text: string }
  | { kind: "stderr-line"; text: string }
  | { kind: "exit"; code: number | null; signal: NodeJS.Signals | null };

/**
 * Inputs to `runStreaming`. The shape is deliberately minimal — every
 * field maps to one of the seven NFR-S4 invariants.
 *
 * Architecture §"Capstone Runtime → Subprocess Discipline" (post Story
 * 10.1b): `metadata` and `onSpawn` are reserved for Stories 6.5 (abort-
 * by-metadata lookup) and 5.7 (stdin-write capture). They're not
 * implemented here; subsequent stories extend.
 */
export interface RunOptions {
  cmd: string;
  args: string[];
  cwd?: string;
  env?: NodeJS.ProcessEnv;
  signal?: AbortSignal;
  /**
   * When set, every `stderr-line` event is appended to this file as
   * `[ISO] stderr: <text>\n`, and a header line is written before any
   * data events. Per NFR-S4 invariant 7. Open failures are logged via
   * `console.error` but do not throw — the log is a debug aid.
   */
  sessionLogPath?: string;
  /**
   * Optional callback invoked synchronously immediately after `spawn()`
   * returns the child handle, before any data events are emitted. Lets
   * spawn-per-message consumers (chat-stream Route Handler) capture
   * the child for stdin writes. Per Story 5.7 AC11.
   */
  onSpawn?: (child: import("node:child_process").ChildProcess) => void;
}

/** Cooperative-shutdown grace before SIGKILL escalation (NFR-S4 invariant 3). */
export const SIGKILL_GRACE_MS = 5_000;

/**
 * Spawn a child process and yield its line-buffered output as an async
 * iterable. Centralizes all seven NFR-S4 non-negotiables:
 *
 * 1. Drain stdout AND stderr unconditionally (anti-pipe-buffer-deadlock).
 * 2. Never `detached: true`.
 * 3. Honor `opts.signal`: SIGTERM, then SIGKILL after `SIGKILL_GRACE_MS`.
 * 4. Global SIGINT/SIGTERM handler reaps tracked children before exit.
 * 5. `cwd` is required — throws synchronously when missing.
 * 6. Argv-style spawn (signature does not accept a single shell string).
 * 7. Per-session subprocess.log when `sessionLogPath` is set.
 */
export function runStreaming(opts: RunOptions): AsyncIterable<ProcEvent> {
  // Invariant 5 — fail fast on missing cwd.
  if (opts.cwd === undefined) {
    throw new Error(
      "runStreaming: opts.cwd is required (NFR-S4 invariant 5)",
    );
  }

  return runStreamingImpl(opts);
}

async function* runStreamingImpl(opts: RunOptions): AsyncIterable<ProcEvent> {
  // Invariant 6: argv-style spawn; invariant 2: never detached.
  const child = spawn(opts.cmd, opts.args, {
    cwd: opts.cwd,
    env: opts.env,
    stdio: ["pipe", "pipe", "pipe"],
  });
  track(child);
  // Story 5.7 AC11: invoke onSpawn synchronously so the consumer can
  // capture the handle (e.g., for stdin writes) before any data events.
  opts.onSpawn?.(child);

  // Invariant 7 — open subprocess.log if requested. Open failure logs
  // and proceeds; the log is a debug aid, not a blocker.
  let logStream: WriteStream | null = null;
  if (opts.sessionLogPath !== undefined) {
    try {
      logStream = createWriteStream(opts.sessionLogPath, { flags: "a" });
      logStream.on("error", (err) => {
        console.error(
          `[runStreaming] subprocess.log write error (${opts.sessionLogPath}):`,
          err,
        );
      });
      logStream.write(
        `[${new Date().toISOString()}] spawn: ${opts.cmd} ${opts.args.join(" ")} ` +
          `(cwd=${opts.cwd}, pid=${child.pid ?? "?"})\n`,
      );
    } catch (err) {
      console.error(
        `[runStreaming] could not open subprocess.log (${opts.sessionLogPath}):`,
        err,
      );
      logStream = null;
    }
  }

  // Pending events queue + a Promise that resolves when more arrive.
  // Async generators don't get a free push API, so we hand-roll the bridge.
  const queue: ProcEvent[] = [];
  let waiter: (() => void) | null = null;
  let done = false;

  const wake = () => {
    const w = waiter;
    waiter = null;
    w?.();
  };

  const enqueue = (ev: ProcEvent) => {
    queue.push(ev);
    wake();
  };

  // Line-buffering for stdout + stderr (Q-Tech-7: partial chunks must
  // accumulate until a newline). Each pipe gets its own buffer.
  const makeLineHandler = (kind: "stdout-line" | "stderr-line") => {
    let buf = "";
    return (chunk: Buffer | string) => {
      buf += typeof chunk === "string" ? chunk : chunk.toString("utf8");
      let nl: number;
      while ((nl = buf.indexOf("\n")) !== -1) {
        const raw = buf.slice(0, nl);
        buf = buf.slice(nl + 1);
        const text = stripVTControlCharacters(raw);
        if (kind === "stderr-line" && logStream) {
          logStream.write(`[${new Date().toISOString()}] stderr: ${text}\n`);
        }
        enqueue({ kind, text });
      }
    };
    // Note: any trailing partial line without a newline is dropped on
    // close — matches POSIX line-stream semantics. Callers that need
    // the trailing partial can request it from the source.
  };

  // Invariant 1 — both pipes get a `data` listener attached unconditionally.
  child.stdout?.setEncoding("utf8");
  child.stderr?.setEncoding("utf8");
  child.stdout?.on("data", makeLineHandler("stdout-line"));
  child.stderr?.on("data", makeLineHandler("stderr-line"));

  // Invariant 3 — AbortSignal: SIGTERM, escalate to SIGKILL after grace.
  let killTimer: NodeJS.Timeout | null = null;
  let abortListener: (() => void) | null = null;
  if (opts.signal) {
    if (opts.signal.aborted) {
      child.kill("SIGTERM");
      killTimer = setTimeout(() => {
        // After SIGTERM, `child.killed` flips true and `child.signalCode`
        // may be set even though the child is still running (it trapped
        // SIGTERM). Only `child.exitCode === null` reliably says "still
        // running"; once the child has actually died, exitCode flips
        // non-null OR `close` has fired and we never reach here.
        if (child.exitCode === null) {
          try {
            child.kill("SIGKILL");
          } catch {
            // Already exited — swallow.
          }
        }
      }, SIGKILL_GRACE_MS);
    } else {
      abortListener = () => {
        child.kill("SIGTERM");
        killTimer = setTimeout(() => {
          if (child.exitCode === null) {
            try {
              child.kill("SIGKILL");
            } catch {
              // Already exited — swallow.
            }
          }
        }, SIGKILL_GRACE_MS);
      };
      opts.signal.addEventListener("abort", abortListener, { once: true });
    }
  }

  // Use 'close' (not 'exit') so all stdio data has flushed before we
  // yield the terminal `exit` event. Spec at AC line 99 / Dev Notes
  // "Why 'close' not 'exit'".
  child.on("close", (code, signal) => {
    if (killTimer) {
      clearTimeout(killTimer);
      killTimer = null;
    }
    if (abortListener && opts.signal) {
      opts.signal.removeEventListener("abort", abortListener);
      abortListener = null;
    }
    enqueue({ kind: "exit", code, signal });
    done = true;
    wake();
  });

  child.on("error", (err) => {
    enqueue({ kind: "stderr-line", text: `spawn error: ${err.message}` });
    enqueue({ kind: "exit", code: null, signal: null });
    done = true;
    wake();
  });

  try {
    while (true) {
      while (queue.length > 0) {
        const ev = queue.shift()!;
        yield ev;
        if (ev.kind === "exit") {
          return;
        }
      }
      if (done && queue.length === 0) {
        return;
      }
      await new Promise<void>((resolve) => {
        waiter = resolve;
      });
    }
  } finally {
    untrack(child);
    if (logStream) {
      logStream.end();
    }
  }
}

// --------------------------------------------------------------------
// Global signal handlers (NFR-S4 invariant 4)
// --------------------------------------------------------------------

/**
 * Reap every tracked child with SIGTERM. Exported for tests so the
 * suite can invoke it directly without delivering a real signal to the
 * test runner.
 */
export function __reapAllForTests(): void {
  for (const child of getAll()) {
    try {
      child.kill("SIGTERM");
    } catch {
      // Already-exited children throw on kill — swallow.
    }
  }
}

// HMR safety: if the module reloads, remove the prior listeners before
// re-registering. The listener function is module-scoped so referential
// equality holds across the same module instance; new instance brings a
// new function reference, which is what HMR sees.
const SIGNALS: NodeJS.Signals[] = ["SIGINT", "SIGTERM"];

function reapHandler() {
  __reapAllForTests();
}

const PRIOR_KEY = "__bmad_runStreaming_signalHandlers__";
type GlobalWithKey = typeof globalThis & {
  [PRIOR_KEY]?: { signal: NodeJS.Signals; handler: NodeJS.SignalsListener }[];
};

const g = globalThis as GlobalWithKey;
if (g[PRIOR_KEY]) {
  for (const { signal, handler } of g[PRIOR_KEY]) {
    process.removeListener(signal, handler);
  }
}
const registered: { signal: NodeJS.Signals; handler: NodeJS.SignalsListener }[] = [];
for (const signal of SIGNALS) {
  process.on(signal, reapHandler);
  registered.push({ signal, handler: reapHandler });
}
process.on("exit", reapHandler);
g[PRIOR_KEY] = registered;
