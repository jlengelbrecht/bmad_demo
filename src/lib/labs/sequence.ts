import "server-only";

import { readdirSync } from "node:fs";
import path from "node:path";

const LAB_FILENAME = /^[a-z0-9][a-z0-9-]*\.md$/i;

/**
 * Returns the slugs (filename minus `.md`) of every lab markdown file under
 * `training/labs/`. Filename filter requires alphanumeric-leading + hyphen
 * pattern so dotfiles, AppleDouble files, and editor backups are excluded.
 */
export function getLabSlugs(): string[] {
  const labsDir = path.join(process.cwd(), "training", "labs");
  let entries: import("node:fs").Dirent[];
  try {
    entries = readdirSync(labsDir, { withFileTypes: true });
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code !== "ENOENT") {
      console.warn(`[labs] failed to read ${labsDir}: ${String(err)}`);
    }
    return [];
  }
  return entries
    .filter((entry) => entry.isFile() && LAB_FILENAME.test(entry.name))
    .map((entry) => entry.name.replace(/\.md$/, ""));
}
