import "server-only";

import path from "node:path";

/**
 * Roots and individual files the /source viewer is allowed to serve.
 * Anything outside this list is a 404. Roots are directories (entries
 * end with `/`); files are exact matches.
 *
 * The set is intentionally narrow — it covers exactly what curriculum
 * files reference (`_bmad/`, `_bmad-output/`, `.claude/skills/`, the
 * dual-role context files, the pinnable artifacts, the README). Adding
 * a path means adding it here AND adding a curriculum link that uses it.
 *
 * All paths are repo-relative with forward slashes.
 */
const ALLOWED_ROOTS = [
  "_bmad/",
  "_bmad-output/",
  ".claude/skills/",
] as const;

const ALLOWED_FILES = [
  "AGENTS.md",
  "README.md",
  "CONTRIBUTING.md",
  ".github/copilot-instructions.md",
  ".github/CODEOWNERS",
  "training/lead-review-checklist.md",
  "training/team-rituals-checklist.md",
  "training/story-template.md",
  "training/tools-reference.md",
] as const;

export type AllowResult =
  | { allowed: true; absolutePath: string; relPath: string }
  | { allowed: false; reason: string };

/**
 * Check whether a user-supplied repo-relative path is servable by the
 * /source viewer. Returns the resolved absolute path if allowed.
 *
 * Defenses (path-traversal):
 *   - Reject any path containing `..` segments (defense-in-depth — even
 *     after path.join sanitizes them, we refuse the input outright).
 *   - Reject absolute paths (input must be relative to repoRoot).
 *   - Resolve against repoRoot and verify the resolved absolute path is
 *     still under repoRoot. A symlink under an allowed root that points
 *     outside is the one case this catches *and* refuses.
 *   - For roots, verify the resolved path starts with the root prefix.
 *   - For files, require an exact match.
 */
export function isAllowedSourcePath(
  relInput: string,
  repoRoot: string,
): AllowResult {
  if (!relInput || typeof relInput !== "string") {
    return { allowed: false, reason: "empty path" };
  }
  if (path.isAbsolute(relInput)) {
    return { allowed: false, reason: "absolute paths not allowed" };
  }
  const segments = relInput.split(/[\\/]+/);
  if (segments.some((s) => s === "..")) {
    return { allowed: false, reason: "path-traversal segments not allowed" };
  }

  // Normalize forward-slash for matching (the allowlist uses forward slash).
  const normalized = segments.filter(Boolean).join("/");

  // Resolve absolute path; defense-in-depth check that it remains under
  // repoRoot. (path.resolve flattens any sneaky encoding.)
  const absolutePath = path.resolve(repoRoot, normalized);
  const repoRootAbs = path.resolve(repoRoot);
  const repoPrefix = repoRootAbs.endsWith(path.sep)
    ? repoRootAbs
    : repoRootAbs + path.sep;
  if (
    absolutePath !== repoRootAbs &&
    !absolutePath.startsWith(repoPrefix)
  ) {
    return { allowed: false, reason: "resolved outside repo root" };
  }

  // Exact-file allowlist match.
  if (ALLOWED_FILES.includes(normalized as (typeof ALLOWED_FILES)[number])) {
    return { allowed: true, absolutePath, relPath: normalized };
  }

  // Root-prefix allowlist match.
  for (const root of ALLOWED_ROOTS) {
    if (normalized.startsWith(root)) {
      return { allowed: true, absolutePath, relPath: normalized };
    }
  }

  return { allowed: false, reason: "path not in allowlist" };
}

/**
 * Test-only export of the allowlists so unit tests can assert on them
 * without re-deriving the contract.
 */
export const __ALLOWLIST_FOR_TESTS = {
  roots: [...ALLOWED_ROOTS],
  files: [...ALLOWED_FILES],
};
