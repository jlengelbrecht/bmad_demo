import { unlinkSync } from "node:fs";
import path from "node:path";

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

export class InvalidProgressPathError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidProgressPathError";
  }
}

/**
 * Resolve the deletion target. Honors `envPath` (typically
 * `process.env.BMAD_DATABASE_PATH` from the CLI) when set, falling back
 * to `defaultPath` otherwise.
 *
 * The env override is gated to `.sqlite` files so a stray
 * `BMAD_DATABASE_PATH=/etc/passwd` in the calling shell can't widen this
 * destructive script's deletion target. AC5 / NFR-R3 guarantee.
 */
export function resolveProgressTarget(opts: {
  envPath?: string;
  defaultPath: string;
}): string {
  const env = opts.envPath?.trim();
  if (env && env.length > 0) {
    const resolved = path.resolve(env);
    if (!resolved.endsWith(".sqlite")) {
      throw new InvalidProgressPathError(
        `BMAD_DATABASE_PATH must point to a .sqlite file (got ${resolved})`,
      );
    }
    return resolved;
  }
  return opts.defaultPath;
}

/**
 * Try to unlink `target`. ENOENT (file already gone — TOCTOU race or
 * concurrent cleanup) is silently absorbed. Other errors (EISDIR,
 * EACCES, EBUSY, …) surface so the CLI can render a useful message.
 */
function safeUnlink(target: string): boolean {
  try {
    unlinkSync(target);
    return true;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return false;
    throw err;
  }
}

/**
 * Delete the SQLite progress file at `targetPath` and any of its WAL /
 * journal sidecars that exist. Pure-ish (only touches the named paths;
 * never `_bmad-output/`). Used by `scripts/reset-progress.ts`.
 */
export function resetProgressAt(targetPath: string): ResetResult {
  const sidecarsDeleted: string[] = [];
  const deleted = safeUnlink(targetPath);

  for (const suffix of SIDECAR_SUFFIXES) {
    const sidecar = targetPath + suffix;
    if (safeUnlink(sidecar)) {
      sidecarsDeleted.push(sidecar);
    }
  }

  return { deleted, path: targetPath, sidecarsDeleted };
}
