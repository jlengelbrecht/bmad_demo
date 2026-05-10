import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const FALLBACK = "_bmad-output";
const PROJECT_ROOT_PREFIX = /^\{project[-_]root\}\/+/;

/**
 * Read the trainee's chosen BMAD `output_folder` from their bootstrapped
 * `<chosenDir>/_bmad/bmm/config.yaml`. BMAD's installer asks for this
 * folder name during `npx bmad-method install` and persists it in the
 * config; the default is `_bmad-output` but trainees may pick a different
 * directory.
 *
 * The yaml value comes shaped as `{project-root}/<folder>` — the
 * `{project-root}` placeholder is BMAD's convention for "resolve relative
 * to the bootstrapped repo's cwd." We strip the placeholder and return
 * just the folder name relative to the chosenDir, so callers can build
 * `path.join(chosenDir, outputFolder, ...)` without re-resolving.
 *
 * Returns the FALLBACK (`_bmad-output`) when:
 *   - The config file is missing (BMAD not installed yet, or chosenDir wrong)
 *   - The `output_folder:` key is absent or malformed
 *   - The resolved value is an absolute path (defense — never trust an
 *     absolute path that escapes chosenDir)
 *
 * Fallback is never silently destructive: callers (e.g. validatePhaseShape)
 * already report which directory they searched in their `reason` field,
 * so a wrong-folder fallback surfaces in the gate UI.
 */
export function readBmadOutputFolder(chosenDir: string): string {
  const cfgPath = path.join(chosenDir, "_bmad", "bmm", "config.yaml");
  if (!existsSync(cfgPath)) return FALLBACK;
  let text: string;
  try {
    text = readFileSync(cfgPath, "utf8");
  } catch {
    return FALLBACK;
  }
  // Match `output_folder: <value>` allowing optional surrounding quotes.
  const m = /^\s*output_folder:\s*["']?([^"'\n]+?)["']?\s*$/m.exec(text);
  if (!m) return FALLBACK;
  const raw = m[1].trim();
  if (!raw) return FALLBACK;
  const stripped = raw.replace(PROJECT_ROOT_PREFIX, "");
  if (!stripped) return FALLBACK;
  // Defense: absolute paths could escape chosenDir; refuse them.
  if (path.isAbsolute(stripped)) return FALLBACK;
  // Defense: traversal segments are equally suspect.
  if (stripped.split(/[\\/]+/).some((seg) => seg === "..")) return FALLBACK;
  return stripped;
}
