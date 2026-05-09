import "server-only";

import type { IPty } from "node-pty";

/**
 * In-memory registry of live PTY sessions for the interactive bootstrap.
 * Each session is keyed by capstone-session id. Lives on globalThis so
 * the registry survives Next.js dev HMR reloads — without this, an edit
 * mid-bootstrap would orphan the child PTY.
 *
 * Sessions are cleaned up automatically when the underlying PTY exits
 * (the registry registers an `onExit` handler in `register`). They can
 * also be killed explicitly via `kill()` (used on tab-close abort).
 */

export interface PtySession {
  pty: IPty;
  spawnedAt: number;
  /** null while running; set when PTY exits. */
  exitCode: number | null;
  /** null while running; set to the signal name if killed by signal. */
  exitSignal: number | null;
  /** Set by the route on exit-code-0 handling. */
  sessionStatePersisted: boolean;
  /**
   * Cumulative PTY output, capped at OUTPUT_REPLAY_CAP bytes. New SSE
   * subscribers replay this buffer first so output emitted between
   * spawn and SSE-open isn't lost. Stored as the raw byte string the
   * PTY emitted so the SSE base64 encoding is identical for replay
   * and live data.
   */
  outputBuffer: string;
}

/** Hard cap on the per-session replay buffer (~256 KB). */
const OUTPUT_REPLAY_CAP = 256 * 1024;

type GlobalRegistry = typeof globalThis & {
  __bmad_pty_sessions__?: Map<string, PtySession>;
};

const g = globalThis as GlobalRegistry;
const sessions: Map<string, PtySession> =
  g.__bmad_pty_sessions__ ?? new Map<string, PtySession>();
g.__bmad_pty_sessions__ = sessions;

export function get(sessionId: string): PtySession | undefined {
  return sessions.get(sessionId);
}

export function has(sessionId: string): boolean {
  return sessions.has(sessionId);
}

/**
 * Register a freshly-spawned PTY. Attaches an `onExit` handler that
 * stamps the exit fields so subsequent SSE listeners or status-pollers
 * see the terminal state even after the PTY has gone away.
 *
 * `onExit` callback receives the PTY's `{exitCode, signal}` so the
 * caller can fire side effects (session-state DB persistence) without
 * the registry caring about Route-Handler concerns.
 */
export function register(
  sessionId: string,
  pty: IPty,
  onExit: (exitCode: number, signal: number | null) => void,
): PtySession {
  const session: PtySession = {
    pty,
    spawnedAt: Date.now(),
    exitCode: null,
    exitSignal: null,
    sessionStatePersisted: false,
    outputBuffer: "",
  };
  sessions.set(sessionId, session);

  // Capture every chunk into the replay buffer. Subscribers added
  // later (via the SSE output route) read this buffer once on attach.
  pty.onData((chunk) => {
    session.outputBuffer += chunk;
    if (session.outputBuffer.length > OUTPUT_REPLAY_CAP) {
      session.outputBuffer = session.outputBuffer.slice(-OUTPUT_REPLAY_CAP);
    }
  });

  pty.onExit(({ exitCode, signal }) => {
    session.exitCode = exitCode;
    session.exitSignal = signal ?? null;
    try {
      onExit(exitCode, signal ?? null);
    } catch (err) {
      console.error(`[pty registry] onExit handler threw for ${sessionId}:`, err);
    }
  });
  return session;
}

/**
 * Send SIGTERM to the PTY and remove it from the registry. Idempotent:
 * calling on an already-exited / unknown session is a no-op.
 */
export function kill(sessionId: string): void {
  const s = sessions.get(sessionId);
  if (!s) return;
  try {
    s.pty.kill("SIGTERM");
  } catch {
    // already exited
  }
  sessions.delete(sessionId);
}

/**
 * Forget a session (call after the consumer has read the final exit
 * state). Distinct from `kill` — does not signal the PTY.
 */
export function forget(sessionId: string): void {
  sessions.delete(sessionId);
}

/** Test-only: clear the registry between cases. */
export function __resetForTests(): void {
  for (const [, s] of sessions) {
    try {
      s.pty.kill("SIGTERM");
    } catch {
      // ignore
    }
  }
  sessions.clear();
}

/** Test-only: enumerate all live session ids. */
export function __snapshotForTests(): string[] {
  return [...sessions.keys()];
}
