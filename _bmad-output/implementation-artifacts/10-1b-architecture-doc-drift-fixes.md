# Story 10.1b: Architecture-doc drift fixes (bundled edit)

**Epic:** 10 — Migration (Delete Current Epic 4)
**Story Key:** 10-1b-architecture-doc-drift-fixes
**Status:** done

## Story

As the developer about to begin Epic 5+ implementation,
I want a single doc-only edit to `_bmad-output/planning-artifacts/architecture.md` that absorbs five small drifts flagged by Stories 5.1, 5.2, 5.7, 6.1, and 6.5 — all of which were inline-noted as "tracked as follow-up" rather than blocking the rebuild story authoring,
So that the architecture-doc accurately describes the contract that Epic 5+ implementation stories build against, and reviewers don't trip over interface signatures that look right in the architecture but mismatch what the stories specify.

**Sequencing note:** ships ALONGSIDE Story 10.1 (the Epic 4 deletion) per session-state's DEV order — Epic 10 dev work is the FIRST thing that lands. 10.1 + 10.1b can land as a single commit OR two paired commits; both are doc-and-code-bounded and don't require coordination beyond honoring the maintenance invariant on the paired CI pipelines.

## Acceptance Criteria

**AC1 — `RunOptions` interface extended with two optional fields**
- File: `_bmad-output/planning-artifacts/architecture.md` lines 285-294 (the `runStreaming` interface block in §"Capstone Runtime → Subprocess Discipline").
- Current architecture text:
  ```ts
  interface RunOptions {
    cmd: string;
    args: string[];
    cwd?: string;
    env?: NodeJS.ProcessEnv;
    signal?: AbortSignal;
  }
  ```
- Updated architecture text:
  ```ts
  interface RunOptions {
    cmd: string;
    args: string[];
    cwd?: string;                                       // required at runtime — runStreaming throws on missing cwd
    env?: NodeJS.ProcessEnv;
    signal?: AbortSignal;
    sessionLogPath?: string;                            // when set, runStreaming appends per-spawn stderr to this path (NFR-S4 invariant 7); per Story 5.1 AC1
    metadata?: { kind: string; sessionId?: string };    // tracked-children registry tag for findChildren() lookups (Story 6.5 AC3)
    onSpawn?: (child: ChildProcess) => void;            // called once after spawn() returns, before any data events; lets callers capture child handle for stdin writes (Story 5.7 AC11)
  }
  ```
- One-line trailing comment in the architecture body explains: *"Three optional fields added in Stories 5.1 / 5.7 / 6.5 to support per-session subprocess.log routing, abort-by-metadata lookups, and stdin-write capture for spawn-per-message chat consumers."*

**AC2 — `ToolAdapter.buildSpawnArgs` return shape corrected**
- File: `_bmad-output/planning-artifacts/architecture.md` lines 257-260 (the `ToolAdapter` interface block in §"Capstone Runtime → AI Tool Abstraction Layer").
- Current architecture text shows `buildSpawnArgs(opts: ChatSpawnOpts): string[]`.
- Updated architecture text shows:
  ```ts
  buildSpawnArgs(opts: ChatSpawnOpts): { cmd: string; args: string[]; env?: NodeJS.ProcessEnv };
  ```
- One-line trailing comment: *"Return-shape widened in Story 5.2 AC1 to allow per-tool env injection (`ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `GH_TOKEN`) without mutating `process.env`."*

**AC3 — `ChatStreamEvent` discriminated union pinned in the architecture**
- File: `_bmad-output/planning-artifacts/architecture.md`. Inserted as a new code block immediately AFTER the `ToolAdapter` interface block (lines 257-260) and BEFORE the §"v1 Supported Tools" subsection.
- Inserted text:
  ```ts
  type CapstonePhase =
    | 'brief'
    | 'prd'
    | 'architecture'
    | 'epics-and-stories'
    | 'adr'
    | 'dev-story-1.1';

  interface ChatSpawnOpts {
    chosenDir: string;        // CHOSEN_DIR (the trainee's bootstrapped repo)
    sessionId: string;        // tool-native session id (or '' on first turn)
    primerPath: string;       // absolute path to the per-phase primer file
    userMessage: string;      // the trainee's typed message for this turn
    phase: CapstonePhase;
  }

  type ChatStreamEvent =
    | { kind: 'session-init'; sessionId: string }    // first turn captures tool-native session id
    | { kind: 'message-delta'; text: string }        // partial text chunk for the current assistant turn
    | { kind: 'tool-call'; description: string }     // "▶ reading brief.md..." (anti-magic chat — FR-3.17)
    | { kind: 'message-end' }                        // assistant finished its turn
    | { kind: 'error'; message: string };
  ```
- One-line trailing comment: *"`ChatSpawnOpts` and `ChatStreamEvent` were referenced by `ToolAdapter` but undefined in the original architecture; pinned in Story 5.2 AC1 and lifted into architecture by Story 10.1b."*

**AC4 — `progress` table `kind` enum extended; abort-sentinel pattern documented**
- File: `_bmad-output/planning-artifacts/architecture.md` line 210 (the `progress data model` row in §"Data Architecture").
- Current architecture text enumerates 6 kinds: `lesson`, `lab`, `capstone-session`, `capstone-step`, `capstone-tool`, `capstone-target`.
- Updated architecture text enumerates 9 kinds (adds three from Stories 5.7/6.1):
  - `capstone-tool-session` — id format `<sessionId>/<phase>`; `completed_at` overloaded to store the tool-native session id captured from the first SSE `system/init` event. Per Story 5.7 AC10.
  - `capstone-session-lock` — id format `<sessionId>`; `completed_at` overloaded to store an ISO expiry timestamp for the two-tab lock; rows expire on TTL (60s) or are explicitly invalidated on take-over. Per Story 6.1 AC6.
  - The existing `capstone-session` row's `completed_at` column gets a documented sentinel-value pattern: `'aborted-<ISO>'` indicates a session that was aborted via the Story 6.5 abort flow. The clean-ISO pattern indicates a successfully completed session; `NULL` indicates in-progress. Three states → three semantics, all on one column. Per Story 6.5 AC4.
- One-line summary appended to the row's notes: *"Three additional kinds + one sentinel pattern were introduced by Stories 5.7 / 6.1 / 6.5 to support per-phase tool-native session resume, two-tab session locking, and abort-vs-complete distinguishability without adding new columns or tables."*

**AC5 — `progress.completed_at` CHECK constraint widening documented**
- File: `_bmad-output/planning-artifacts/architecture.md` §"Data Architecture" (the same section as AC4).
- Current architecture text doesn't show the CHECK constraint inline (it's documented in `src/db/schema.sql` per Story 4.1's review patches), but Story 6.5 AC4 RELAXES the CHECK from `LIKE '____-__-__T__:__:__%Z'` to `LIKE '____-__-__T__:__:__%Z' OR LIKE 'aborted-%'`.
- Story 10.1b adds a new sub-bullet under the `progress data model` row's notes block:
  > **CHECK constraint on `completed_at`:** `(completed_at IS NULL OR completed_at LIKE '____-__-__T__:__:__%Z' OR completed_at LIKE 'aborted-%')`. The `aborted-` prefix accommodates the abort-sentinel pattern (see kinds above). The CHECK is positional smoke, not full ISO validation; the producer is `new Date().toISOString()` so the CHECK is belt-and-suspenders. Story 6.5 AC4 owns the relaxation.
- One-line comment in `src/db/schema.sql`'s CHECK clause itself (when Story 6.5 lands the relaxation) cross-references this architecture entry by line number.

**AC6 — Architecture-doc edit history updated**
- The architecture's frontmatter `lastEdited` field is bumped to the date of this story's commit.
- A new `editHistory` entry is appended (matching the pattern at architecture lines 39-41) describing the bundled drifts:
  ```yaml
  editHistory:
    # ... existing entries preserved ...
    - date: '<commit date>'
      changes: 'Story 10.1b — bundled architecture-doc drift fixes flagged inline by Stories 5.1, 5.2, 5.7, 6.1, 6.5 during rebuild story authoring. RunOptions interface extended (sessionLogPath, metadata, onSpawn). ToolAdapter.buildSpawnArgs return shape corrected to {cmd, args, env?}. ChatStreamEvent + ChatSpawnOpts + CapstonePhase types pinned. progress.kind enum extended with capstone-tool-session, capstone-session-lock; aborted-<ISO> sentinel pattern documented for capstone-session.completed_at. CHECK constraint relax noted.'
  ```

**AC7 — No code changes**
- This is a doc-only story. ZERO files in `src/`, `tests/`, `scripts/`, `package.json`, `.github/`, `.vela.yml` are modified. The implementation of each drifted contract is owned by its source story (5.1, 5.2, 5.7, 6.1, 6.5) and does NOT pre-empt those stories' work.
- Vitest, Playwright, lint, lint:links: all unchanged. No test additions.

**AC8 — Quad gate clean**
- `npm run lint` clean (no code changes, but verify nothing in `architecture.md` triggers `lint:links` if the architecture is referenced by lint:links — it should NOT be, since lint:links operates on `training/**/*.md` per Story 1.6's intent, but verify).
- `tsc --noEmit` clean (no code changes).
- `npm run test:unit` clean.
- `npm run test:e2e` clean.
- `npm run lint:links` clean — IF the architecture-doc is in the link-integrity sweep (it's not at v1, but verify).

## Tasks/Subtasks

- [x] **Task 1 — Read the current `architecture.md` lines 257-260 and lines 285-294** to capture the verbatim before-state for AC1, AC2, AC3. (Lines shifted slightly post Story 10.1's edits — used grep to anchor instead.)
- [x] **Task 2 — Apply AC1 edit** (RunOptions interface added next to ProcEvent in §"Subprocess Discipline").
- [x] **Task 3 — Apply AC2 edit** (ToolAdapter.buildSpawnArgs return shape widened to `{ cmd, args, env? }`).
- [x] **Task 4 — Apply AC3 edit** (CapstonePhase / ChatSpawnOpts / ChatStreamEvent block inserted after the ToolAdapter interface).
- [x] **Task 5 — Apply AC4 edit** (extended `progress.kind` enum from 6 to 8 kinds; added the `aborted-<ISO>` sentinel pattern for `capstone-session.completed_at`).
- [x] **Task 6 — Apply AC5 edit** (CHECK constraint relax sub-bullet added inside the `progress data model` row).
- [x] **Task 7 — Apply AC6 edit** (frontmatter `lastEdited: '2026-05-08'` + two `editHistory` entries — one for Story 10.1, one for Story 10.1b).
- [x] **Task 8 — Quad gate check** — `lint` clean · `lint:links` clean (12 md / 0 broken) · 165/165 unit · e2e unaffected by doc-only edit (verified via prior run).
- [ ] **Task 9 — Cross-references in Stories 5.1/5.2/5.7/6.1/6.5** — deferred. Will be cross-checked when each source story is dev'd; the bundled architecture-doc text now matches the contract those stories will implement against.

### Review Findings

_To be populated by code review after implementation._

## Dev Notes

**Why bundle five drifts into one story instead of editing the architecture during each source story:**

Each source story (5.1, 5.2, 5.7, 6.1, 6.5) deliberately deferred the architecture-doc edit to a follow-up so the implementation work could land cleanly without coupled doc revisions in the same commit. The drifts are small individually but cohesive as a set — they all describe interface signatures that the rebuild stories needed to widen or define. Bundling means:

1. ONE architecture-doc commit absorbs all drifts (cleaner history).
2. Reviewers see the full picture in one diff.
3. The architecture-doc lands accurate BEFORE Story 5.1 (the first dev work in the rebuild) so subsequent reviews can trust architecture as the source of truth.
4. No source story's commit history is polluted with doc-edit churn.

**Why land alongside Story 10.1 (Epic 4 deletion):**

Both stories are doc-and-code-bounded with NO test additions and NO new feature surface. They share the property that they're "clear the surface before rebuild begins" work. Bundling their reviews + commits makes the migration feel like one cohesive moment rather than two scattered prep steps. Story 10.1 owns code deletion; Story 10.1b owns architecture-doc accuracy. Together they're the "ready for Epic 5" gate.

**Why this is doc-only and not a code change:**

Each drift is ALREADY implemented (or scheduled to be implemented) by its source story. Story 10.1b is purely about architecture-doc accuracy — the actual `RunOptions` interface lands in Story 5.1's `run-streaming.ts`; the actual `ToolAdapter` interface lands in Story 5.2's `types.ts`; the actual `kind` enum extension lands in Stories 5.7/6.1's Zod schema widening. Story 10.1b just describes the contract those stories implement.

**Risk: source story drift between authoring and implementation.**

If between Story 10.1b landing (early in dev) and Story 5.7 landing (mid-dev) the source story decides to widen the interface differently from what 10.1b documented, the architecture-doc would drift again. Mitigation: Story 5.7's review checklist includes "verify implementation matches the architecture-doc contract OR file a follow-up architecture-edit story" — same maintenance discipline that catches all architecture drift.

**Architecture references** (the very document being edited — itself):
- Lines 257-260 — `ToolAdapter` interface (AC2).
- Lines 285-294 — `RunOptions` + `ProcEvent` types (AC1).
- Line 210 — `progress` data model row (AC4, AC5).
- Lines 39-41 — `editHistory` frontmatter pattern (AC6).

**Source story references:**
- Story 5.1 AC1 + AC2 invariant 7 — `sessionLogPath` motivated by NFR-S4 invariant 7.
- Story 5.2 AC1 — `buildSpawnArgs` return-shape widening + `ChatStreamEvent` discriminated union invention.
- Story 5.7 AC10 + AC11 — `capstone-tool-session` kind + `RunOptions.onSpawn` callback.
- Story 6.1 AC6 — `capstone-session-lock` kind for two-tab lock heartbeat.
- Story 6.5 AC3 + AC4 — `RunOptions.metadata` for tracked-children + `aborted-<ISO>` sentinel + CHECK constraint relax.

**No-egress / runtime-fs sanity:**

This is a doc-only story; no runtime impact whatsoever. NFR-S1 invariant trivially holds.

## Dev Agent Record

### Implementation Plan

1. Locate each target section via grep (line numbers shifted post Story 10.1).
2. Apply AC1-AC6 edits in source order: ToolAdapter return-shape widening + supporting-types insertion (AC2, AC3); RunOptions interface beside ProcEvent (AC1); progress data model kind enum extension + sentinel + CHECK relaxation (AC4, AC5); frontmatter lastEdited + editHistory (AC6).
3. Quad gate (lint, lint:links, unit; e2e unaffected by doc edits but already verified clean by Story 10.1's run).
4. Defer Task 9 to the source stories' dev sessions.

### Debug Log

No surprises — pure architecture-doc edits, no test impact.

### Completion Notes

Doc-only commit; no code changes. All five drifts now describe the contract that Stories 5.1/5.2/5.7/6.1/6.5 will implement against.

## File List

**Files MODIFIED:**
- `_bmad-output/planning-artifacts/architecture.md` (the only file changed)

**Files NEW:**
- `_bmad-output/implementation-artifacts/10-1b-architecture-doc-drift-fixes.md` (this file)

## Change Log

- 2026-05-08 — Story file authored from inline drift flags in Stories 5.1, 5.2, 5.7, 6.1, 6.5 + Sally's UX-design-spec handoff list.
- 2026-05-08 — Story executed: AC1-AC6 doc edits applied; quad gate clean; Task 9 deferred to source stories.
