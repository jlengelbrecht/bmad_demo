import "server-only";

import { readFileSync } from "node:fs";
import path from "node:path";

export type LoadedContent = {
  source: string;
  /** Absolute path; safe to pass to renderMarkdownToHtml's sourcePath option. */
  sourcePath: string;
};

/**
 * Loads a markdown (or any text) file relative to the project root.
 * Returns `null` if the file does not exist; callers decide whether to render
 * a 404 or surface the absence differently.
 *
 * Defense-in-depth: rejects any path that resolves outside the project root,
 * even if the caller's `relPath` contains traversal segments.
 */
export function loadContent(relPath: string): LoadedContent | null {
  const root = path.resolve(process.cwd());
  const sourcePath = path.resolve(root, relPath);
  if (sourcePath !== root && !sourcePath.startsWith(root + path.sep)) {
    return null;
  }

  try {
    const source = readFileSync(sourcePath, "utf8");
    return { source, sourcePath };
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw err;
  }
}
