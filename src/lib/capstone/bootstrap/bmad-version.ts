import { readFileSync } from "node:fs";
import path from "node:path";

/**
 * The npm dist-tag the capstone uses when invoking
 * `npx bmad-method@<tag> install`. The portal stays evergreen against
 * BMAD by always installing the latest release at the time the trainee
 * runs the capstone, rather than pinning to whatever BMAD the portal
 * was tested against.
 *
 * Override via env for CI / pinned environments if a future need arises:
 *   BMAD_INSTALL_TAG=6.7.0 npm run dev
 */
export const INSTALL_TAG: string = process.env.BMAD_INSTALL_TAG || "latest";

/**
 * Read the BMAD version that's actually installed in `cwd`'s
 * `_bmad/_config/manifest.yaml`. Used for HANDOFF.md generation so the
 * trainee's bootstrapped repo records the *resolved* version they got,
 * not just the dist-tag used at install time.
 *
 * Memoized per-cwd. A missing manifest is a deployment defect for the
 * portal's own cwd, but a normal "haven't bootstrapped yet" state for a
 * trainee's chosenDir — callers are responsible for handling the throw
 * if they call before install completes.
 */
const cache = new Map<string, string>();

export function readInstalledBmadVersion(cwd: string = process.cwd()): string {
  const cached = cache.get(cwd);
  if (cached !== undefined) return cached;

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
  const version = match[1].trim();
  cache.set(cwd, version);
  return version;
}

/** Test-only — clears the memo so a fresh manifest can be parsed. */
export function __resetBmadVersionCacheForTests(): void {
  cache.clear();
}
