#!/usr/bin/env tsx
//
// Static link-integrity scan for `training/**/*.md`.
//
// Usage: npm run lint:links
//
// Walks every markdown file under `training/`, parses it with the same
// remark-gfm parser the runtime markdown pipeline uses, and verifies every
// relative link/image/reference-definition target exists on disk. Skips:
//   - external URLs (`http://`, `https://`, `mailto:`, …) — no network calls
//   - site-absolute paths (`/foo`)
//   - anchor-only fragments (`#some-heading`) — by design; this scan owns
//     lesson-to-artifact filesystem-link integrity, not in-page TOC integrity
//
// Exit code: 0 on success, 1 when any broken target is found OR a configured
// root does not exist on disk.
// Summary → stdout. Each broken-link diagnostic → stderr.

import path from "node:path";
import { fileURLToPath } from "node:url";

import { MissingRootError, checkLinks } from "../src/lib/markdown/check-links";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(SCRIPT_DIR, "..");
const ROOTS = [path.join(REPO_ROOT, "training")];

async function main(): Promise<number> {
  let result;
  try {
    result = await checkLinks(ROOTS);
  } catch (err) {
    if (err instanceof MissingRootError) {
      console.error(`❌ link-integrity: configured root does not exist: ${err.root}`);
      return 1;
    }
    throw err;
  }

  if (result.problems.length === 0) {
    console.log(
      `✅ link-integrity: scanned ${result.filesScanned} markdown files / ${result.linksScanned} relative links — no broken targets.`,
    );
    return 0;
  }

  for (const problem of result.problems) {
    const rel = path.relative(REPO_ROOT, problem.file);
    if (problem.reason === "unreadable") {
      console.error(`${rel}: unreadable file (skipped)`);
      continue;
    }
    const reason = problem.reason === "directory" ? "target is a directory" : "target missing";
    console.error(`${rel}:${problem.line}: ${reason} → ${problem.href}`);
  }
  console.error(
    `❌ link-integrity: ${result.problems.length} problem${result.problems.length === 1 ? "" : "s"} across ${result.filesScanned} files (scanned ${result.linksScanned} relative links).`,
  );
  return 1;
}

main()
  .then((code) => process.exit(code))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
