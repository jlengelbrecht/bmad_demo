// Static link-integrity scan core. Used by `scripts/check-links.ts` (the CLI
// entry exposed as `npm run lint:links`) and exercised in Vitest with tmpdir
// fixtures.
//
// Visits `link`, `image`, and `definition` mdast nodes — covers regular
// links (`[x](./y.md)`), images (`![alt](./diagram.png)`), and reference-style
// links (`[label][ref]` with `[ref]: ./target.md`).
//
// Out of scope by design:
//   - external schemes (`http://`, `https://`, `mailto:`, …): no network calls
//   - site-absolute paths (`/foo`): runtime routing concern, not file-system
//   - anchor-only fragments (`#some-heading`): in-page TOC integrity is not
//     this scan's load-bearing concern (lesson-to-artifact filesystem links
//     are). See Story 2.4 Dev Notes for the full rationale.
//   - raw HTML `<a href>` / `<img src>` embedded in markdown: parsed as
//     `html` nodes by remark; not visited. Curriculum is plain-markdown by
//     convention.
//
// Cross-platform note: filesystem case-sensitivity differs (APFS vs ext4);
// link-rot from case typos is a known cross-platform skew tracked in
// `_bmad-output/implementation-artifacts/deferred-work.md` (Epic 5 CI matrix).

import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import { unified } from "unified";
import { visit } from "unist-util-visit";
import type { Definition, Image, Link, Root } from "mdast";

export type LinkProblem = {
  file: string;
  line: number;
  href: string;
  resolved: string;
  reason: "missing" | "directory" | "unreadable";
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
    // Skip hidden entries, node_modules, and symlinks (cycle protection).
    if (entry.name.startsWith(".")) continue;
    if (entry.name === "node_modules") continue;
    if (entry.isSymbolicLink()) continue;

    const full = path.join(root, entry.name);
    if (entry.isDirectory()) {
      yield* walkMarkdownFiles(full);
    } else if (entry.isFile() && entry.name.endsWith(".md")) {
      yield full;
    }
  }
}

const parser = unified().use(remarkParse).use(remarkGfm);

function visitableNodeUrl(node: Link | Image | Definition): string {
  return node.url ?? "";
}

export class MissingRootError extends Error {
  constructor(public readonly root: string) {
    super(`link-integrity root does not exist: ${root}`);
    this.name = "MissingRootError";
  }
}

export async function checkLinks(roots: string[]): Promise<CheckResult> {
  const problems: LinkProblem[] = [];
  let filesScanned = 0;
  let linksScanned = 0;

  for (const root of roots) {
    const absRoot = path.resolve(root);
    // Distinguish a missing top-level root (configuration error — fail loudly)
    // from a missing subdirectory (skipped silently by walkMarkdownFiles).
    try {
      const st = statSync(absRoot);
      if (!st.isDirectory()) {
        throw new MissingRootError(absRoot);
      }
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === "ENOENT") {
        throw new MissingRootError(absRoot);
      }
      throw err;
    }

    for (const file of walkMarkdownFiles(absRoot)) {
      filesScanned += 1;

      let source: string;
      try {
        source = readFileSync(file, "utf8");
      } catch (err) {
        problems.push({
          file,
          line: 0,
          href: "",
          resolved: "",
          reason: "unreadable",
        });
        if (process.env.NODE_ENV !== "production") {
          console.warn(`[lint:links] could not read ${file}: ${String(err)}`);
        }
        continue;
      }

      const tree = parser.parse(source) as Root;
      const fileDir = path.dirname(file);

      visit(tree, ["link", "image", "definition"], (node) => {
        const href = visitableNodeUrl(node as Link | Image | Definition);
        if (!isCheckableRelative(href)) return;

        const cleaned = normalizeHref(href);
        if (!cleaned) return; // empty after strip — don't count it as scanned
        linksScanned += 1;

        const resolved = path.resolve(fileDir, cleaned);

        let st;
        try {
          st = statSync(resolved);
        } catch (err) {
          if ((err as NodeJS.ErrnoException).code === "ENOENT") {
            problems.push({
              file,
              line: node.position?.start.line ?? 0,
              href,
              resolved,
              reason: "missing",
            });
            return;
          }
          throw err;
        }

        if (st.isDirectory()) {
          problems.push({
            file,
            line: node.position?.start.line ?? 0,
            href,
            resolved,
            reason: "directory",
          });
        }
      });
    }
  }

  return { filesScanned, linksScanned, problems };
}
