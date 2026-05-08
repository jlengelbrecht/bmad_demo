# Story 2.4: Static lesson-link integrity scan as `npm run lint:links`

**Epic:** 2 — Lesson Navigation & Self-Reference Link Integrity
**Story Key:** 2-4-link-integrity-scan
**Status:** review

## Story

As the curriculum maintainer or any contributor editing markdown,
I want `npm run lint:links` to scan every markdown file under `training/` and report broken relative links with non-zero exit on failure,
So that lesson prose silently rotting as artifacts evolve becomes a CI failure, not a surprise to a trainee.

## Acceptance Criteria

**AC1 — Script exists at the expected path**
- `scripts/check-links.ts` exists.
- `package.json` exposes `"lint:links": "tsx scripts/check-links.ts"`.

**AC2 — Happy path: success exit + summary**
- Given every markdown file under `training/**/*.md` has well-formed relative links, `npm run lint:links` exits 0 and prints a summary (file count + link count scanned).

**AC3 — Broken-link path: non-zero exit + diagnostic**
- Given a markdown file under `training/` with a relative link to a non-existent path, `npm run lint:links` exits non-zero.
- The output names the offending file, the line number, and the broken target.

**AC4 — External links and `mailto:` are not network-checked**
- The script does NOT attempt to verify external URLs (no network calls).
- External links are not flagged as broken.

**AC5 — In-page anchors handled deterministically**
- For relative links that are anchor-only (`#some-heading`) or that include a `#` fragment after a path, the script either resolves the anchor against the file's own headings OR skips anchor-only fragments by design.
- The chosen behavior is documented in the script's header comment.

**AC6 — Implementation details**
- The script walks the markdown tree with a deterministic alphabetical traversal.
- Summary printed to stdout; errors printed to stderr.
- No Playwright / no browser-runtime dependency — plain Node + tsx invocation.

## Tasks/Subtasks

- [x] **Task 1 — `tsx` installed as a devDependency.**
- [x] **Task 2 — `src/lib/markdown/check-links.ts`** — `checkLinks(roots)` returns `{ filesScanned, linksScanned, problems }`. Uses `unified` + `remark-parse` + `remark-gfm` to parse, `unist-util-visit` to walk, AST `position.start.line` for line numbers. Skips external schemes via the same regex as `dev-link-check`, plus anchor-only and site-absolute paths. Strips `#fragment`/`?query`, `decodeURIComponent` (try/catch), and `\\ → /` normalization. Recurses subdirectories with alphabetical traversal.
- [x] **Task 3 — `scripts/check-links.ts`** — CLI entry. Stdout for the success summary, stderr for each broken link in the form `<rel-path>:<line>: broken relative link → <href>`. Exit 0 / 1. Header comment documents the anchor-only-skip design choice.
- [x] **Task 4 — `package.json` `lint:links` script wired.**
- [x] **Task 5 — `src/lib/markdown/check-links.test.ts`** — 9 Vitest cases via tmpdir fixtures: happy path, broken-target diagnostic shape, http/https/mailto skip, anchor-only skip, site-absolute skip, URL-encoded path resolution, fragment+query stripping, alphabetical traversal, subdirectory recursion.
- [x] **Task 6 — Live-tree smoke** — `npm run lint:links` exits 0 against the committed tree (12 markdown files / 0 relative links — placeholders have no inter-file links yet).
- [x] **Task 7 — Quad gate clean** — `test:unit` 35/35, `test:e2e` 16/16, `lint` clean, `lint:links` clean.

## Dev Notes

**Architecture references** (`_bmad-output/planning-artifacts/architecture.md`):
- §"Test Strategy → Lesson-to-artifact link-integrity": "Two-layer: (1) Static scan (`npm run lint:links`): a Node script in `scripts/check-links.ts` walks every `*.md` in `training/` and resolves relative links against the working tree; fails on any missing target. Fast, deterministic, cheap to keep green. (2) Playwright DOM check: navigates each lesson route and asserts every `<a href="…">` resolves to an existing file."
- This story implements layer 1. Layer 2 lands later (Epic 5).

**Why a separate testable core:**
Following the pattern set by Story 2.1's pipeline + 2.3's `loadContent`: the script is a thin CLI wrapper around a pure function so the heavy lifting can be Vitest-ed against tmpdir fixtures. The dev-link-check rehype plugin from Story 2.1 covers request-time warnings; this static scan is its CI-time counterpart, both based on the same conventions (skip external, decode + normalize hrefs, etc.).

**Anchor-only fragments — design choice:**
Skipping anchor-only fragments by design rather than resolving against headings. Rationale: (a) the AC explicitly permits skipping; (b) the pipeline's heading-slug behavior (rehype-slug + rehype-autolink-headings) makes anchor resolution ecosystem-coupled — the slugger could change behavior on upgrade — so an in-page anchor failing here would mean either the static scan or the runtime renderer is wrong, with no clean tiebreaker. (c) Lesson-to-artifact links (the brief's load-bearing concern, per Risk #3 mitigation) are file-system links, not heading anchors. Heading-anchor breakage is detectable through other means (manual review of generated TOCs, or a future test that snapshots heading IDs).

**Test approach:**
- Vitest covers the core function with tmpdir fixtures (mirrors `loadContent` and `dev-link-check` test patterns).
- A live-tree smoke test confirms the committed `training/` passes today.

## Dev Agent Record

### Implementation Plan

1. Install `tsx` so a TS script can run as a CLI without a build step.
2. Author the testable core under `src/lib/markdown/check-links.ts` (mirrors the location of `dev-link-check.ts` and `load-content.ts`).
3. Author the thin CLI wrapper at `scripts/check-links.ts`.
4. Wire `lint:links` in `package.json`.
5. Write Vitest cases for the core, exercising every AC bullet.
6. Run the script against the live `training/` tree as a smoke.
7. Quad gate.

### Debug Log

- Initial test pass shipped a `require("node:fs").mkdirSync` inside an ESM test file — `@typescript-eslint/no-require-imports` flagged it. Fixed by adding `mkdirSync` to the existing `node:fs` import.
- Live tree currently scans 12 markdown files / 0 relative links — the placeholder content authored in Stories 2.2/2.3 doesn't yet cross-reference. The link-integrity guard will start biting in Epic 6 when real content lands.
- The script reuses the same scheme regex / fragment-strip / URI-decode logic as `dev-link-check.ts` (Story 2.1). They are not deduplicated — they're sibling helpers with different runtime contexts (request-time warning vs CI-time fail-fast). Sharing the helper would couple them; keeping them parallel preserves the principle that the CI scan can evolve without touching request-time render.

### Completion Notes

**ACs satisfied:**
- AC1: `scripts/check-links.ts` + `package.json` `"lint:links": "tsx scripts/check-links.ts"`.
- AC2: live-tree run exits 0 with `✅ link-integrity: scanned 12 markdown files / 0 relative links — no broken targets.`
- AC3: Vitest case proves a broken `[gone](./missing.md)` produces a problem with the exact file path, line 3, and the href.
- AC4: Vitest cases for `https://`, `http://`, and `mailto:` all confirm `linksScanned === 0` (the helper short-circuits before counting).
- AC5: anchor-only fragments are skipped by design; the script's header comment documents the rationale; Vitest case asserts `linksScanned === 0` for `[top](#intro)` etc.
- AC6: alphabetical traversal asserted by a Vitest case that intentionally orders `z.md`, `a.md`, `m.md` and verifies the problems come back as `a.md`, `m.md`, `z.md`. Stdout summary / stderr diagnostics. No Playwright dep.

**Defensible deviations:**
- Anchor-only fragments are skipped (not resolved against the file's headings). AC5 explicitly permits either resolution or skip-by-design; rationale documented in the script header and in the story's Dev Notes.

**Test approach note:**
- All 9 Vitest cases use tmpdir fixtures, mirroring `loadContent` + `dev-link-check` + `sequence` patterns.
- A live-tree smoke (`npm run lint:links` against the committed `training/`) confirms the CLI shape works end-to-end.

## File List

**New files:**
- `src/lib/markdown/check-links.ts`
- `src/lib/markdown/check-links.test.ts`
- `scripts/check-links.ts`
- `_bmad-output/implementation-artifacts/2-4-link-integrity-scan.md` (this file)

**Modified files:**
- `package.json` (`tsx` dev dep + `lint:links` script)
- `package-lock.json` (transitive)

## Change Log
- 2026-05-08 — Story file authored from epics.md §Epic 2 / Story 2.4
- 2026-05-08 — Implementation completed; quad gate clean; status `review`
