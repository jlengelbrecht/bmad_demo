# Story 6.6: Post-bootstrap pause + "what BMAD just did" explainer

**Epic:** 6 — Setup Wizard + Bootstrap
**Story Key:** 6-6-post-bootstrap-explainer
**Status:** done

## Story

As the developer landing FR-3.13 (post-bootstrap pause) and FR-3.14 ("what BMAD just did" explainer),
I want `/capstone/setup/bootstrap/complete?session=<id>` to render a confirmation screen showing the file tree of the bootstrapped CHOSEN_DIR, the `git log --oneline` of the initial commit, a collapsible verbose-output panel with the captured npx output, AND a 30-second-readable explainer naming the files/dirs the install created — with explicit "Next" advance to Phase 3 instead of an auto-jump,
So that the trainee experiences the bootstrap as a deliberate beat (the brainstorm's "the pause IS the lesson" stance) and starts Phase 3 chat with their own AI tool already understanding what BMAD's installer just put on disk.

## Acceptance Criteria

**AC1 — Page exists at `src/app/capstone/setup/bootstrap/complete/page.tsx`**
- Server Component. Reads `?session=<sessionId>`; fetches the session's CHOSEN_DIR from SQLite; verifies the session's status is `'in-progress'` AND that bootstrap completed successfully (a new helper `getBootstrapResult(sessionId): { success: boolean, durationMs: number, capturedStdout: string, capturedStderr: string } | null` reads from a new `data/capstone-sessions/<id>/bootstrap-result.json` file written by Story 6.4's stream handler at terminal-exit time).
- If `getBootstrapResult` returns null OR `success === false`: redirect to `/capstone/setup` with an error toast (the trainee shouldn't reach this page without a successful bootstrap).
- Renders four regions:
  1. **Confirmation header** — "✓ Your BMAD-bootstrapped repo is ready at `<chosenDir>` — bootstrap completed in <durationMs / 1000>s."
  2. **File tree** — recursive directory listing rendered to depth 3, with `.bmad/` and `.git/` (if present) and any other top-level entries. Files only down to size + name; directories expandable. `.git/` collapsed by default. Read via Node `fs.readdir` recursive at request time.
  3. **`git log --oneline`** — a single Server Component-side spawn of `git log --oneline -n 5` via `runStreaming` with `cwd: chosenDir`. Output rendered as a small monospace block. Falls back to "(git log unavailable)" on error.
  4. **"What BMAD just did" explainer** — bullet list per AC2.
  5. **Verbose-output panel** (collapsible disclosure) — captured stdout + stderr from Story 6.4's bootstrap stream. Default collapsed; "Show full output" expands.
  6. **Next button** — navigates to `/capstone/chat/<sessionId>/brief` (Epic 7a's territory).

**AC2 — "What BMAD just did" explainer is concrete and testable**
- The explainer is a static markdown content fragment at `src/lib/capstone/bootstrap/explainer.md` rendered via the existing markdown pipeline.
- Content (verbatim, ~150 words, ~30s read at 200wpm):
  ```markdown
  ## What BMAD just did

  - **`_bmad/`** — the BMAD scaffolding: skills, agents, workflow definitions. This is what makes BMAD a *thing your team uses*, not a docs-site to read. Think of it as your team's AI-collaboration playbook, in code.
  - **`AGENTS.md`** — a tool-agnostic shared-agent context file. Codex, Claude Code, OpenCode read this. Any AI tool you point at this repo gets the same baseline.
  - **`.github/copilot-instructions.md`** — the Copilot-specific companion to AGENTS.md, demonstrating that tool-specific config sits ALONGSIDE shared config.
  - **`.github/CODEOWNERS`** — the gate. Lessons 4 and 5 explained this. Edit it to map your team's roles.
  - **`.git/`** — initialized + an initial commit. Push to your team's GitHub org when you're ready (HANDOFF.md will give you the commands).

  Next, you'll chat with your AI tool through six phases: brief → PRD → architecture → epics+stories → ADR → working code for story 1.1. Each phase loads the prior artifacts as context. Files are the contract.
  ```
- The explainer references files that the BMAD installer reliably produces (verified against the v6.6.0 install). If a future BMAD version changes the file set, the explainer needs updating; this is tracked under the named maintainer's quarterly cadence (PRD §NFR-M2).

**AC3 — File tree rendering is bounded**
- Helper: `src/lib/capstone/bootstrap/file-tree.ts` exports `readBootstrappedTree(rootDir: string, maxDepth: number = 3): TreeNode`.
- Excludes: `node_modules/`, `.next/`, anything matching `**/dist/**`, anything matching `*.log`. (These shouldn't be in a freshly-bootstrapped tree, but the exclusion is defensive.)
- File-size shown next to filename in human-readable units (B/KB/MB).
- Symlinks: rendered as `<name> -> <target>` with no recursion into the target.
- Permission errors during traversal: skip the entry, log a `console.warn`, continue.

**AC4 — Bootstrap-result persistence (modifies Story 6.4)**
- Story 6.4's stream handler is updated: at terminal-exit time, it writes `data/capstone-sessions/<sessionId>/bootstrap-result.json` containing:
  ```json
  {
    "success": true,
    "exitCode": 0,
    "durationMs": <ms>,
    "startedAt": "<ISO>",
    "endedAt": "<ISO>",
    "capturedStdout": "<all stdout lines joined>",
    "capturedStderr": "<all stderr lines joined>"
  }
  ```
- Story 6.4's tests are updated to confirm the file is written.
- File is gitignored (it's per-session, ephemeral).
- Story 6.6's `getBootstrapResult` helper reads this file; on parse failure or missing file, returns null.

**AC5 — Vitest unit coverage**
- `file-tree.test.ts`: traverses a `mkdtempSync` fixture; respects depth; excludes node_modules; renders sizes; handles symlinks; skips on permission error.
- `complete/page.test.ts`: stubs `getBootstrapResult` + `readBootstrappedTree` + `git log` runStreaming; asserts the rendered DOM has all four regions.
- `bootstrap-result.test.ts`: Story 6.4's modification — confirm the file is written with the right shape.

**AC6 — Playwright e2e at `tests/e2e/capstone-setup-complete.spec.ts`**
- Drives the full Story 6.4 stub-npx flow → Story 6.5's pause page renders the bootstrapped tree; clicks Next; asserts navigation to `/capstone/chat/<id>/brief`.
- Asserts the explainer is visible and includes the literal string `"_bmad/"`.
- Asserts the verbose panel is collapsed by default; clicking "Show full output" reveals the captured stdout.

**AC7 — Lint, typecheck, quad gate; lint:links covers the new explainer markdown**
- `npm run lint:links` validates any links in `explainer.md` against the live file tree (e.g., if explainer references `_bmad/` it should resolve).

## Tasks/Subtasks

- [ ] **Task 1 — Bootstrap-result persistence (AC4)** — modify Story 6.4's stream handler to write the JSON. Update Story 6.4's tests.
- [ ] **Task 2 — `getBootstrapResult` helper** — `src/lib/capstone/bootstrap/result.ts` + tests.
- [ ] **Task 3 — File-tree helper (AC3)** — `file-tree.ts` + tests.
- [ ] **Task 4 — Explainer markdown (AC2)** — `explainer.md` content. Lint:links covers.
- [ ] **Task 5 — `complete/page.tsx` (AC1)** — Server Component composing the four regions.
- [ ] **Task 6 — Verbose-output panel** — Radix disclosure component (already in deps if any prior story imported a Radix primitive; otherwise add `@radix-ui/react-collapsible`).
- [ ] **Task 7 — Vitest unit coverage (AC5)**.
- [ ] **Task 8 — Playwright e2e (AC6)**.
- [ ] **Task 9 — Quad gate clean (AC7)**.

## Dev Notes

**Architecture references:**
- §"Folder Layout" line 376 — `capstone/setup/bootstrap/page.tsx` covers the bootstrap progress page (Story 6.4); the `complete/` sub-route is additive and consistent with App Router conventions.
- §"Frontend Architecture → Markdown pipeline" line 242 — explainer.md goes through the same `remark`/`rehype` pipeline.

**PRD references:**
- FR-3.13 line 535 — post-bootstrap pause + file tree + git log + verbose-output panel.
- FR-3.14 line 536 — "what BMAD just did" explainer.

**Brainstorm references:**
- Setup-11 line 124 — "the pause IS the lesson" — the explicit Next-button advance is the irreducible behavior.
- Ped-7 (referenced as "what BMAD just did" explainer) — irreducible item line 409 in Phase 3.

**Why a static markdown explainer instead of computed-from-tree:**

The explainer's *value* is pedagogy + reassurance, not exhaustive directory enumeration. A computed-from-tree explainer would either (a) drift from what BMAD actually produces (if BMAD adds a new file the explainer doesn't notice) or (b) become unhelpfully exhaustive. The static markdown is curated and quarterly-maintained — same cadence as the rest of the curriculum content (NFR-M2).

**Why bootstrap-result.json instead of replaying SQLite state:**

The captured stdout/stderr can be hundreds of KB. SQLite is the wrong store for blob content (it's our state-not-content boundary, per architecture line 765). Per-session JSON file beside `subprocess.log` is the natural home — symmetric with subprocess.log, gitignored, ephemeral.

## Dev Agent Record

### Implementation Plan

_To be filled in by the dev agent at implementation time._

### Debug Log

_To be filled in by the dev agent during implementation._

### Completion Notes

_To be filled in by the dev agent after the quad gate is clean._

## File List

**Expected new files:**
- `src/app/capstone/setup/bootstrap/complete/page.tsx`
- `src/app/capstone/setup/bootstrap/complete/page.test.ts`
- `src/lib/capstone/bootstrap/explainer.md`
- `src/lib/capstone/bootstrap/file-tree.ts`
- `src/lib/capstone/bootstrap/file-tree.test.ts`
- `src/lib/capstone/bootstrap/result.ts`
- `src/lib/capstone/bootstrap/result.test.ts`
- `tests/e2e/capstone-setup-complete.spec.ts`
- `_bmad-output/implementation-artifacts/6-6-post-bootstrap-explainer.md` (this file)

**Expected modified files:**
- `src/app/api/capstone/setup/bootstrap/stream/route.ts` (Story 6.4 — adds bootstrap-result.json write at terminal-exit)
- `src/app/api/capstone/setup/bootstrap/stream/route.test.ts`
- `package.json` (possibly add `@radix-ui/react-collapsible`)

## Change Log

- 2026-05-08 — Story file authored from FR-3.13/3.14 + brainstorm Setup-11/Ped-7 + architecture line 376.
