# Story 6.5: Abort & cleanup affordance

**Epic:** 6 — Setup Wizard + Bootstrap
**Story Key:** 6-5-abort-and-cleanup
**Status:** done

## Story

As the developer landing FR-3.12 (abort + cleanup),
I want a visible "Abort & clean up" button on the bootstrap progress panel that, on click + typed-confirmation, kills the in-flight bootstrap subprocess AND removes the partially-installed CHOSEN_DIR (only when the trainee types the literal path matching the resolved target),
So that a trainee whose bootstrap has hung — or who realized they picked the wrong path — can recover cleanly without leaving zombie processes or half-installed directories that would corrupt a Story-6.4 retry.

## Acceptance Criteria

**AC1 — `POST /api/capstone/setup/abort` Route Handler exists**
- File: `src/app/api/capstone/setup/abort/route.ts`.
- Body (Zod):
  ```ts
  {
    sessionId: string,                  // CAPSTONE_SESSION_ID format
    typedConfirmation: string,          // must EXACTLY match the resolved chosenDir from SQLite
    cleanupChosenDir: boolean,          // false = abort only; true = abort + rm -rf chosenDir
  }
  ```
- Behavior:
  1. Look up the session's `chosenDir` from SQLite via `getCapstoneTargetDir(sessionId)`. If absent → 404.
  2. If `cleanupChosenDir === true`, verify `typedConfirmation === chosenDir` (string equality after both are `path.resolve`'d). Mismatch → 400 with `{ ok: false, error: 'Typed confirmation does not match the chosen directory' }`.
  3. SIGTERM the bootstrap subprocess: read the tracked-children registry (Story 5.1) and SIGTERM any child whose `cwd` matches `<chosenDir-parent>` AND whose argv-0 is `npx`. Multiple matches are unlikely but tolerated (SIGTERM all matching).
  4. If `cleanupChosenDir === true`, after the SIGTERM grace period (5s, matching `SIGKILL_GRACE_MS`), `fs.rm(chosenDir, { recursive: true, force: true })`. Per FR-3.12, this is the only documented place in the portal that deletes from CHOSEN_DIR; the typed-confirmation gate is what makes it safe.
  5. Update the session's progress: set `kind='capstone-session'` row's `completed_at` to a sentinel `'aborted-<ISO>'` string (NOT a clean ISO timestamp, so resume logic can distinguish abort from completion). Emit a `console.log` recording the abort.
  6. Return `{ ok: true, killed: true|false, removedDir: true|false }`.

**AC2 — Abort button on `<BootstrapRunner>` (Story 6.4 Client Component) extension**
- Story 6.5 modifies `<BootstrapRunner>` to include an "Abort & clean up" button that opens a modal:
  - Modal heading: "Abort the bootstrap?"
  - Body: "This will stop the running install. Optionally, you can also delete the partially-installed directory: `<chosenDir>`."
  - Two buttons: "Abort only" (cleanupChosenDir: false) and "Abort and delete `<chosenDir>`" (cleanupChosenDir: true). The latter reveals a typed-confirmation input requiring the trainee to type the chosenDir path verbatim before the button enables.
  - "Cancel" button closes the modal.
- On confirm, POSTs to `/api/capstone/setup/abort`. On success, navigates to `/capstone/setup` (Story 6.1) — the trainee can re-pick a path.

**AC3 — Tracked-children PID matching**
- Story 6.5 introduces a small extension to Story 5.1's tracked-children registry: each tracked child carries a metadata tag `{ kind: 'bootstrap'|'chat'|'preflight'|'tool-check', sessionId?: string }` so abort can identify the right child without argv-grepping.
- New helper in `tracked-children.ts`: `findChildren(predicate: (meta) => boolean): ChildProcess[]`.
- Story 5.1's `runStreaming` is extended to accept `RunOptions.metadata?` and pass it to `track(child, metadata)`. Backwards-compatible (existing call sites pass no metadata).
- The argv-grep fallback from AC1 step 3 is the defensive secondary; metadata-tag matching is primary.

**AC4 — Sentinel `aborted-<ISO>` value distinguishable in resume logic**
- `progress-db.ts`'s `getRecentCapstoneSession` already returns `{ id, completedAt }`. Story 6.5 adds a sibling helper `getCapstoneSessionStatus(sessionId): 'in-progress'|'completed'|'aborted'` that maps:
  - `completedAt === null` → `'in-progress'`
  - `completedAt.startsWith('aborted-')` → `'aborted'`
  - Otherwise (clean ISO) → `'completed'`.
- Story 4.1's `markCapstoneSessionComplete` is unchanged; Story 6.5 introduces `markCapstoneSessionAborted(sessionId): { updated: boolean }` that writes the `aborted-<ISO>` sentinel.
- The Story 4.1 schema's CHECK constraint accepts the sentinel because the LIKE pattern `'____-__-__T__:__:__%Z'` doesn't match `'aborted-2026-...'` (the prefix breaks the positional shape) — Story 6.5 needs to RELAX the CHECK to accept either the ISO pattern OR a string starting with `'aborted-'`. Schema migration: a new `__migrations` row recording the relaxation; Story 4.1's "single inline schema" decision stays valid.

**AC5 — Resume logic respects abort sentinel (Story 6.1 update)**
- Story 6.1's `/capstone/setup` page logic for "if a session exists with completed_at IS NULL → resume" is updated to ALSO check status: if `getCapstoneSessionStatus === 'aborted'`, the page treats the session as terminal (don't resume) and the trainee is offered a fresh start. The aborted session's row remains in the DB for audit but isn't surfaced in the resume flow.
- Vitest cases cover: in-progress → resume-offered; completed → fresh-start-offered; aborted → fresh-start-offered.

**AC6 — Vitest unit coverage**
- `abort/route.test.ts`: missing session → 404; mismatched typed-confirmation → 400; cleanupChosenDir=false → kills child only; cleanupChosenDir=true with matching confirmation → kills + rm-rfs; abort on nonexistent CHOSEN_DIR → success (rm is idempotent).
- `tracked-children.test.ts`: `findChildren` predicate matching.
- `progress-db.test.ts`: `markCapstoneSessionAborted` + `getCapstoneSessionStatus` cases.
- `<BootstrapRunner>.test.ts` extension: abort modal renders; typed-confirmation gate works; submit POSTs the right payload.

**AC7 — Playwright e2e at `tests/e2e/capstone-setup-abort.spec.ts`**
- Drives the Story-6.4 stub-npx flow, clicks Abort mid-stream, confirms "Abort only", asserts:
  - The `npx-stub` process exits within ~5s (SIGTERM grace).
  - Navigation lands on `/capstone/setup`.
  - The session row's status is `aborted` (verified via test-only DB read).
- Drives the same flow with "Abort and delete" + typed confirmation; asserts CHOSEN_DIR is removed (test fixture verifies).

**AC8 — Lint, typecheck, quad gate**

## Tasks/Subtasks

- [ ] **Task 1 — Tracked-children metadata extension (AC3)** — extend Story 5.1's tracked-children + run-streaming. Update existing tests to confirm no regression.
- [ ] **Task 2 — Abort Route Handler (AC1)** — Zod + lookup + SIGTERM via `findChildren` + conditional rm-rf + status update.
- [ ] **Task 3 — `markCapstoneSessionAborted` helper (AC4)** — `progress-db.ts` + tests. Schema relax for the CHECK constraint.
- [ ] **Task 4 — `getCapstoneSessionStatus` helper (AC4)** — `progress-db.ts` + tests.
- [ ] **Task 5 — `<BootstrapRunner>` abort modal (AC2)** — extends Story 6.4's component. Modal + typed-confirmation input + POST.
- [ ] **Task 6 — Story 6.1 resume-logic update (AC5)** — extend `/capstone/setup` server-component logic.
- [ ] **Task 7 — Vitest unit coverage (AC6)**.
- [ ] **Task 8 — Playwright e2e (AC7)**.
- [ ] **Task 9 — Quad gate clean (AC8)**.

## Dev Notes

**Architecture references:**
- §"API & Communication Patterns → Endpoints" line 232 — `POST /api/capstone/setup/abort` verbatim.
- §"Capstone Threat Model" TM-3 line 310 — subprocess lifecycle ownership; the explicit-abort flow is the user-facing surface for "kill this child."

**PRD references:**
- FR-3.12 line 534 — abort + cleanup with typed confirmation, verbatim.

**Brainstorm references:**
- F-DEF-15 line 318 — cancel button always present.
- F-CRIT-5 lines 248-251 — subprocess lifecycle ownership; abort is the most-explicit user-driven instance.

**Why typed-confirmation only when `cleanupChosenDir === true`:**

Aborting the subprocess is reversible (the trainee can retry). Deleting the chosenDir is not (it's the trainee's working tree, even if partially-installed). The typed gate matches the brainstorm's "trust > seamlessness" theme (line 495): friction here is feature, not friction.

**Why the sentinel `'aborted-<ISO>'` instead of a separate column:**

Story 4.1's option A (nullable `completed_at`) is the architectural lock; introducing a separate `status` column would force a schema-migration story for one feature. The sentinel is bounded (only the abort flow writes it; only the resume flow reads it via the status helper), and the LIKE-pattern relax is small. v1.1 may add a typed status column if more states emerge.

**Why metadata-tag matching primary, argv-grep secondary:**

Two reasons: (1) argv-grep is fragile (path with spaces, escape-character mismatches); (2) metadata is explicit at spawn time. The argv-grep fallback exists only for the rare case where metadata isn't propagated (e.g., a future story spawns `npx` directly without going through `runStreaming`). Documented.

## Dev Agent Record

### Implementation Plan

_To be filled in by the dev agent at implementation time._

### Debug Log

_To be filled in by the dev agent during implementation._

### Completion Notes

_To be filled in by the dev agent after the quad gate is clean._

## File List

**Expected new files:**
- `src/app/api/capstone/setup/abort/route.ts`
- `src/app/api/capstone/setup/abort/route.test.ts`
- `tests/e2e/capstone-setup-abort.spec.ts`
- `_bmad-output/implementation-artifacts/6-5-abort-and-cleanup.md` (this file)

**Expected modified files:**
- `src/lib/capstone/subprocess/run-streaming.ts` (accept `RunOptions.metadata`, pass to `track`)
- `src/lib/capstone/subprocess/tracked-children.ts` (`findChildren` helper)
- `src/lib/capstone/subprocess/run-streaming.test.ts` (regression-no-metadata + with-metadata cases)
- `src/lib/capstone/subprocess/tracked-children.test.ts` (`findChildren` cases)
- `src/lib/db/progress-db.ts` (`markCapstoneSessionAborted`, `getCapstoneSessionStatus`)
- `src/lib/db/progress-db.test.ts` (cases)
- `src/db/schema.sql` (relax CHECK constraint to accept `aborted-` prefix)
- `src/app/capstone/setup/bootstrap/bootstrap-runner.tsx` (Story 6.4 component — adds abort modal)
- `src/app/capstone/setup/bootstrap/bootstrap-runner.test.ts`
- `src/app/capstone/setup/page.tsx` (Story 6.1 — extends resume logic with status check)
- `src/app/capstone/setup/page.test.ts`

## Change Log

- 2026-05-08 — Story file authored from FR-3.12 + architecture line 232 + brainstorm F-DEF-15/F-CRIT-5.
