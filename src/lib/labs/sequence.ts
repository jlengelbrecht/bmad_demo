import "server-only";

import { readdirSync } from "node:fs";
import path from "node:path";

const LABS_DIR = path.join(process.cwd(), "training", "labs");

/**
 * Returns the slugs (filename minus `.md`) of every lab markdown file under
 * `training/labs/`. Used by `generateStaticParams` for the lab route.
 */
export function getLabSlugs(): string[] {
  let entries: string[];
  try {
    entries = readdirSync(LABS_DIR);
  } catch {
    return [];
  }
  return entries.filter((name) => name.endsWith(".md")).map((name) => name.replace(/\.md$/, ""));
}
