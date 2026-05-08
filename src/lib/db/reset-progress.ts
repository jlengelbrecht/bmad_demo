import { existsSync, unlinkSync } from "node:fs";

/**
 * Sidecar suffixes better-sqlite3 may produce alongside the main DB file.
 *  - `-journal`: legacy rollback journal (default journal mode)
 *  - `-wal` / `-shm`: WAL-mode write-ahead log + shared-memory map
 * `connection.ts` enables WAL on the production path, so any subset of
 * these can exist in `data/`. Reset must clear all of them or the next
 * connection inherits stale state.
 */
const SIDECAR_SUFFIXES = ["-journal", "-wal", "-shm"] as const;

export type ResetResult = {
  /** Whether the main file existed and was deleted. */
  deleted: boolean;
  /** The absolute path the script targeted (whether or not it existed). */
  path: string;
  /** Sidecars that existed and were also deleted. */
  sidecarsDeleted: string[];
};

/**
 * Delete the SQLite progress file at `targetPath` and any of its WAL /
 * journal sidecars that exist. Pure-ish (only touches the named paths;
 * never `_bmad-output/`). Used by `scripts/reset-progress.ts`.
 */
export function resetProgressAt(targetPath: string): ResetResult {
  const sidecarsDeleted: string[] = [];
  let deleted = false;

  if (existsSync(targetPath)) {
    unlinkSync(targetPath);
    deleted = true;
  }

  for (const suffix of SIDECAR_SUFFIXES) {
    const sidecar = targetPath + suffix;
    if (existsSync(sidecar)) {
      unlinkSync(sidecar);
      sidecarsDeleted.push(sidecar);
    }
  }

  return { deleted, path: targetPath, sidecarsDeleted };
}
