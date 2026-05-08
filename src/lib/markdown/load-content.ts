import "server-only";

import { existsSync, readFileSync } from "node:fs";
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
 */
export function loadContent(relPath: string): LoadedContent | null {
  const sourcePath = path.resolve(process.cwd(), relPath);
  if (!existsSync(sourcePath)) return null;
  const source = readFileSync(sourcePath, "utf8");
  return { source, sourcePath };
}
