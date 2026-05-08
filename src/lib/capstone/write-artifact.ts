import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { CAPSTONE_DIR, sessionDir, stepFile, type CapstoneStepName } from "./paths";

/**
 * Path-traversal violation. Thrown when the resolved target falls
 * outside `CAPSTONE_DIR` — defense-in-depth even though the Zod regexes
 * upstream already disallow `..` and stray slashes in `session` / `step`.
 */
export class CapstoneTraversalError extends Error {
  constructor(public readonly target: string) {
    super(`Capstone path traversal: ${target} resolves outside CAPSTONE_DIR`);
    this.name = "CapstoneTraversalError";
  }
}

/**
 * Write a capstone artifact to its session directory (Story 4.2).
 *
 * Creates the session subdirectory if it does not exist (idempotent
 * `mkdir({ recursive: true })`). The path-traversal guard rejects any
 * resolved target outside `CAPSTONE_DIR` before any I/O happens.
 *
 * Returns the absolute target path on success; the route handler
 * converts to a repo-root-relative path for the JSON response.
 */
export async function writeCapstoneArtifact({
  session,
  step,
  content,
}: {
  session: string;
  step: CapstoneStepName;
  content: string;
}): Promise<{ path: string }> {
  const target = path.resolve(stepFile(session, step));

  // Defense-in-depth: even if a future caller bypasses the Zod boundary
  // (a script, a test, a refactor that drops validation), the helper
  // refuses to write outside CAPSTONE_DIR. Use `path.relative` so the
  // check works for any value of CAPSTONE_DIR including `/` (where the
  // naive `startsWith(CAPSTONE_DIR + path.sep)` pattern double-appends a
  // separator and rejects every valid target).
  const root = path.resolve(CAPSTONE_DIR);
  const rel = path.relative(root, target);
  if (rel.startsWith("..") || path.isAbsolute(rel) || rel === "") {
    // `..`-prefix → outside; absolute → different drive on Windows;
    // empty → target IS the root (no session/step subpath).
    throw new CapstoneTraversalError(target);
  }

  await mkdir(sessionDir(session), { recursive: true });
  await writeFile(target, content, "utf8");

  return { path: target };
}
