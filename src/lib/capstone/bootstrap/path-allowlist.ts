import path from "node:path";

/**
 * Absolute-path prefixes the wizard hard-refuses (NFR-S7 / TM-2).
 * Prefixes are home-relative tokens; resolution against the trainee's
 * homedir happens at call time.
 */
export const BLOCKED_HOME_PREFIXES = [
  ".ssh",
  ".aws",
  "Library",
  ".config",
] as const;

export const BLOCKED_ABSOLUTE_PREFIXES = [
  "/etc",
  "/usr",
  "/var",
  "/private",
  "/System",
] as const;

export type AllowResult =
  | { allowed: true; resolved: string }
  | { allowed: false; reason: string; resolved: string };

function startsWithDirPrefix(target: string, prefix: string): boolean {
  if (target === prefix) return true;
  return target.startsWith(prefix + path.sep);
}

export function isPathAllowed(
  rawPath: string,
  homedir: string,
  cwd: string,
): AllowResult {
  if (rawPath.length === 0 || rawPath.includes("\0")) {
    return { allowed: false, reason: "Path is empty or contains a NUL byte.", resolved: rawPath };
  }
  if (rawPath.length > 4096) {
    return { allowed: false, reason: "Path exceeds 4096 chars.", resolved: rawPath };
  }
  const expanded = rawPath.startsWith("~/")
    ? path.join(homedir, rawPath.slice(2))
    : rawPath === "~"
      ? homedir
      : rawPath;
  const resolved = path.isAbsolute(expanded)
    ? path.normalize(expanded)
    : path.resolve(homedir, expanded);

  // Block exact-home and home-relative dotfile dirs / sensitive paths.
  if (resolved === homedir) {
    return { allowed: false, reason: "Cannot bootstrap into your home directory itself. Pick a subdirectory like ~/projects/<name>.", resolved };
  }
  for (const rel of BLOCKED_HOME_PREFIXES) {
    if (startsWithDirPrefix(resolved, path.join(homedir, rel))) {
      return {
        allowed: false,
        reason: `Path is in a sensitive location (${path.join(homedir, rel)}) and is blocked.`,
        resolved,
      };
    }
  }
  for (const abs of BLOCKED_ABSOLUTE_PREFIXES) {
    if (startsWithDirPrefix(resolved, abs)) {
      return {
        allowed: false,
        reason: `Path is in a system location (${abs}) and is blocked.`,
        resolved,
      };
    }
  }
  // Block the portal's own cwd to prevent self-write.
  const cwdAbs = path.resolve(cwd);
  if (startsWithDirPrefix(resolved, cwdAbs)) {
    return {
      allowed: false,
      reason: "Path is at-or-under the portal's own working directory. Pick a path outside this repo.",
      resolved,
    };
  }
  // Block any path whose immediate-parent's basename starts with a dot
  // (heuristic for dotfile dirs we didn't enumerate).
  const segs = resolved.split(path.sep).filter(Boolean);
  if (segs.some((s) => s.startsWith(".") && s !== "." && s !== "..")) {
    return {
      allowed: false,
      reason: "Path contains a dotfile-style directory and is blocked.",
      resolved,
    };
  }
  return { allowed: true, resolved };
}
