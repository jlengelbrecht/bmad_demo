import type { ChildProcess } from "node:child_process";

/**
 * Registry of all live subprocesses spawned through `runStreaming`.
 *
 * The Set is module-level (singleton per process) so the global signal
 * handler in `run-streaming.ts` can SIGTERM every tracked child before
 * the parent exits — NFR-S4 invariant 4 ("global process.on(...) handler").
 *
 * Per session-state F-CRIT-5: subprocess lifecycle ownership is the
 * load-bearing v1 invariant; the registry is the cheapest way to
 * guarantee no abandoned children survive a parent exit.
 */
const children = new Set<ChildProcess>();

export function track(child: ChildProcess): void {
  children.add(child);
}

export function untrack(child: ChildProcess): void {
  children.delete(child);
}

export function getAll(): ReadonlySet<ChildProcess> {
  return children;
}

/** Test-only — clears the registry between cases so cross-test leaks don't shift state. */
export function __resetForTests(): void {
  children.clear();
}
