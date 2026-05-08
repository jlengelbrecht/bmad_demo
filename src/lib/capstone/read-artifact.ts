import { readFile } from "node:fs/promises";
import path from "node:path";

import { CAPSTONE_DIR, stepFile, type CapstoneStepName } from "./paths";
import { CapstoneTraversalError } from "./write-artifact";

/**
 * Read a previously-saved capstone artifact for a given session + step
 * (Story 4.4). Returns the file contents on success, or `null` if the
 * file does not exist (ENOENT). Other filesystem errors propagate.
 *
 * Path-traversal guard mirrors `writeCapstoneArtifact` — a session id
 * containing `..` (or any value that resolves outside `CAPSTONE_DIR`)
 * throws `CapstoneTraversalError` BEFORE I/O.
 */
export async function readCapstoneArtifact(
  session: string,
  step: CapstoneStepName,
): Promise<string | null> {
  const target = path.resolve(stepFile(session, step));

  const root = path.resolve(CAPSTONE_DIR);
  const rel = path.relative(root, target);
  if (rel.startsWith("..") || path.isAbsolute(rel) || rel === "") {
    throw new CapstoneTraversalError(target);
  }

  try {
    return await readFile(target, "utf8");
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw err;
  }
}
