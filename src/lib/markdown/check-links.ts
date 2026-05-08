// Static link-integrity scan core. Used by `scripts/check-links.ts` (the CLI
// entry exposed as `npm run lint:links`) and exercised in Vitest with tmpdir
// fixtures.
//
// Anchor-only fragments (e.g. `[top](#intro)`) are skipped by design — the
// concern this scan owns is lesson-to-artifact filesystem links rotting,
// not in-page TOC integrity. See Story 2.4 Dev Notes for the full rationale.

import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";

import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import { unified } from "unified";
import { visit } from "unist-util-visit";
import type { Link, Root } from "mdast";

export type LinkProblem = {
  file: string;
  line: number;
  href: string;
  resolved: string;
};

export type CheckResult = {
  filesScanned: number;
  linksScanned: number;
  problems: LinkProblem[];
};

const EXTERNAL_SCHEME = /^[a-z][a-z0-9+.-]*:/i;

function isCheckableRelative(href: string): boolean {
  if (!href) return false;
  if (href.startsWith("#")) return false; // anchor-only
  if (href.startsWith("/")) return false; // site-absolute
  if (EXTERNAL_SCHEME.test(href)) return false; // http://, mailto:, etc.
  return true;
}

function normalizeHref(href: string): string {
  const stripped = href.split("#")[0].split("?")[0];
  if (!stripped) return "";
  let decoded: string;
  try {
    decoded = decodeURIComponent(stripped);
  } catch {
    decoded = stripped;
  }
  return decoded.replace(/\\/g, "/");
}

function* walkMarkdownFiles(root: string): Iterable<string> {
  let entries: import("node:fs").Dirent[];
  try {
    entries = readdirSync(root, { withFileTypes: true });
  } catch {
    return;
  }
  // Deterministic alphabetical traversal.
  entries.sort((a, b) => a.name.localeCompare(b.name));
  for (const entry of entries) {
    const full = path.join(root, entry.name);
    if (entry.isDirectory()) {
      yield* walkMarkdownFiles(full);
    } else if (entry.isFile() && entry.name.endsWith(".md")) {
      yield full;
    }
  }
}

const parser = unified().use(remarkParse).use(remarkGfm);

export async function checkLinks(roots: string[]): Promise<CheckResult> {
  const problems: LinkProblem[] = [];
  let filesScanned = 0;
  let linksScanned = 0;

  for (const root of roots) {
    const absRoot = path.resolve(root);
    for (const file of walkMarkdownFiles(absRoot)) {
      filesScanned += 1;
      const source = readFileSync(file, "utf8");
      const tree = parser.parse(source) as Root;
      const fileDir = path.dirname(file);

      visit(tree, "link", (node: Link) => {
        const href = node.url ?? "";
        if (!isCheckableRelative(href)) return;
        linksScanned += 1;

        const cleaned = normalizeHref(href);
        if (!cleaned) return;
        const resolved = path.resolve(fileDir, cleaned);
        if (existsSync(resolved)) return;

        problems.push({
          file,
          line: node.position?.start.line ?? 0,
          href,
          resolved,
        });
      });
    }
  }

  return { filesScanned, linksScanned, problems };
}
