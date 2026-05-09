import { readFileSync } from "node:fs";
import path from "node:path";

/**
 * Returns the BMAD version pinned by the portal's own manifest at
 * `_bmad/_config/manifest.yaml`. Used to build `npx bmad-method@<version>`
 * so the trainee's bootstrapped repo gets the same BMAD the portal was
 * tested against (TM-5 — version pin).
 *
 * Memoized at module load. A missing manifest is a deployment defect
 * and throws at first call — not a runtime-recoverable error.
 */
let cached: string | null = null;

export function getPinnedBmadVersion(cwd: string = process.cwd()): string {
  if (cached !== null) return cached;
  const manifestPath = path.join(cwd, "_bmad", "_config", "manifest.yaml");
  const text = readFileSync(manifestPath, "utf8");
  // Hand-roll the parse — the manifest is a known shape and we don't want
  // a yaml dependency just for one field.
  const match = /^\s*version:\s*([^\s#]+)/m.exec(text);
  if (!match) {
    throw new Error(
      `BMAD manifest at ${manifestPath} is missing a 'version:' field`,
    );
  }
  cached = match[1].trim();
  return cached;
}

/** Test-only — clears the memo so a fresh manifest can be parsed. */
export function __resetBmadVersionCacheForTests(): void {
  cached = null;
}
