#!/usr/bin/env tsx
//
// Static link-integrity scan for `training/**/*.md`.
//
// Usage: npm run lint:links
//
// Walks every markdown file under `training/`, parses it with the same
// remark-gfm parser the runtime markdown pipeline uses, and verifies every
// relative link's target exists on disk. Skips:
//   - external URLs (`http://`, `https://`, `mailto:`, …) — no network calls
//   - site-absolute paths (`/foo`)
//   - anchor-only fragments (`#some-heading`) — by design; this scan owns
//     lesson-to-artifact filesystem-link integrity, not in-page TOC integrity
//
// Exit code: 0 on success, 1 when any broken target is found.
// Summary → stdout. Each broken-link diagnostic → stderr.

import path from "node:path";

import { checkLinks } from "../src/lib/markdown/check-links";

const ROOTS = ["training"];

async function main(): Promise<number> {
  const result = await checkLinks(ROOTS);

  if (result.problems.length === 0) {
    console.log(
      `✅ link-integrity: scanned ${result.filesScanned} markdown files / ${result.linksScanned} relative links — no broken targets.`,
    );
    return 0;
  }

  for (const problem of result.problems) {
    const rel = path.relative(process.cwd(), problem.file);
    console.error(`${rel}:${problem.line}: broken relative link → ${problem.href}`);
  }
  console.error(
    `❌ link-integrity: ${result.problems.length} broken relative link${result.problems.length === 1 ? "" : "s"} across ${result.filesScanned} files.`,
  );
  return 1;
}

main()
  .then((code) => process.exit(code))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
