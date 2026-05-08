import path from "node:path";

import { CAPSTONE_STEP_NAMES, type CapstoneStepName } from "@/lib/db/schemas";

/** Thrown when `BMAD_CAPSTONE_DIR` resolves outside the repo's cwd. */
export class InvalidCapstoneDirError extends Error {
  constructor(public readonly value: string) {
    super(
      `BMAD_CAPSTONE_DIR must point to a directory inside the repo (got ${value})`,
    );
    this.name = "InvalidCapstoneDirError";
  }
}

/**
 * Resolve `CAPSTONE_DIR` at module load. Honors `BMAD_CAPSTONE_DIR` so
 * e2e tests can isolate writes; defaults to the architecture-locked
 * `<cwd>/_bmad-output/capstone`. The override is gated to cwd-or-deeper
 * so a stray `BMAD_CAPSTONE_DIR=/etc` in the calling shell can't widen
 * the write target — same posture Story 3.4 took with `BMAD_DATABASE_PATH`
 * (`.sqlite`-extension guard) and `InvalidProgressPathError`.
 *
 * Note: `CAPSTONE_DIR` is captured ONCE at import. Tests that mutate
 * `process.env` after the first import won't see the new value; set
 * the env before the test process starts (Playwright `webServer.env`
 * is the established pattern from Story 3.3).
 */
function resolveCapstoneDir(): string {
  const envValue = process.env.BMAD_CAPSTONE_DIR?.trim();
  if (!envValue) {
    return path.resolve(process.cwd(), "_bmad-output", "capstone");
  }
  const resolved = path.resolve(envValue);
  const cwd = path.resolve(process.cwd());
  // Equal to cwd or strictly inside it. The trailing-`path.sep` guard
  // prevents a sibling like `<cwd>-other/` from passing the prefix check.
  if (resolved !== cwd && !resolved.startsWith(cwd + path.sep)) {
    throw new InvalidCapstoneDirError(envValue);
  }
  return resolved;
}

export const CAPSTONE_DIR = resolveCapstoneDir();

/** Absolute path to a session's directory. */
export function sessionDir(sessionId: string): string {
  return path.join(CAPSTONE_DIR, sessionId);
}

/** Absolute path to a step's `.md` file inside its session dir. */
export function stepFile(sessionId: string, step: CapstoneStepName): string {
  return path.join(sessionDir(sessionId), `${step}.md`);
}

export { CAPSTONE_STEP_NAMES, type CapstoneStepName };
