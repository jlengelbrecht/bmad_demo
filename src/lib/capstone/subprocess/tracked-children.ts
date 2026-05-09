import type { ChildProcess } from "node:child_process";

/**
 * Registry of all live subprocesses spawned through `runStreaming`.
 *
 * Per Story 6.5 AC3, each tracked child carries optional metadata so
 * the abort Route Handler can find children by tag (kind + sessionId)
 * rather than argv-grep.
 */
export interface ChildMetadata {
  kind: "bootstrap" | "chat" | "preflight" | "tool-check";
  sessionId?: string;
}

const children = new Map<ChildProcess, ChildMetadata | undefined>();

export function track(child: ChildProcess, metadata?: ChildMetadata): void {
  children.set(child, metadata);
}

export function untrack(child: ChildProcess): void {
  children.delete(child);
}

export function getAll(): ReadonlySet<ChildProcess> {
  return new Set(children.keys());
}

export function findChildren(
  predicate: (meta: ChildMetadata | undefined) => boolean,
): ChildProcess[] {
  const out: ChildProcess[] = [];
  for (const [child, meta] of children) {
    if (predicate(meta)) out.push(child);
  }
  return out;
}

export function __resetForTests(): void {
  children.clear();
}
