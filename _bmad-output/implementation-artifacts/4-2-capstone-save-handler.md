# Story 4.2: `POST /api/capstone/save` Route Handler and working-tree artifact write

**Epic:** 4 — Capstone Harness
**Story Key:** 4-2-capstone-save-handler
**Status:** ready-for-dev

## Story

As a trainee saving a capstone-step artifact (brief, epic, story, or ADR),
I want a `POST /api/capstone/save` endpoint that writes my artifact to `_bmad-output/capstone/<session>/<step>.md` and updates the corresponding capstone-step progress row,
So that my capstone outputs land as files in my own working tree (committable to my team's repo) and my session's step state advances atomically per saved artifact.

## Acceptance Criteria

**AC1 — Route file shape**
- `src/app/api/capstone/save/route.ts` exports an async `POST` handler.
- The body is parsed through `CapstoneSaveRequest` exported from `src/lib/db/schemas.ts`.
- `CapstoneSaveRequest` validates `{ session: string, step: 'brief' | 'epic' | 'story-1' | 'story-2' | 'adr', content: string }` where:
  - `session` matches the compact-UTC regex from Story 4.1 (`CAPSTONE_SESSION_ID`).
  - `step` is the literal-union enum.
  - `content` is `z.string()` (any non-empty string permitted; markdown content is the trainee's responsibility).

**AC2 — Path helpers**
- `src/lib/capstone/paths.ts` exports:
  - `CAPSTONE_DIR = path.resolve(process.cwd(), '_bmad-output/capstone')` (UPPER_SNAKE_CASE per architecture line 373).
  - `sessionDir(sessionId: string): string` — returns `path.join(CAPSTONE_DIR, sessionId)`.
  - `stepFile(sessionId: string, step: CapstoneStepName): string` — returns `path.join(sessionDir(sessionId), `${step}.md`)`.
- The exported `CapstoneStepName` type is the same string-literal union as the Zod enum and is the single source of truth (re-exported through `schemas.ts` if needed by Story 4.4's UI step lists, or imported directly from `paths.ts`).

**AC3 — Working-tree write helper**
- `src/lib/capstone/write-artifact.ts` exports `writeCapstoneArtifact({ session, step, content }): Promise<{ path: string }>`.
- The helper:
  - Resolves the absolute target path via `stepFile(session, step)`.
  - Verifies the resolved path is contained within `CAPSTONE_DIR` (`path.resolve(target).startsWith(CAPSTONE_DIR + path.sep)` or equivalent, defensively against `..` injection through the Zod boundary). On violation, throws `CapstoneTraversalError` with a message naming the rejected path.
  - Creates the session directory with `mkdir({ recursive: true })` if it doesn't exist.
  - Writes the `content` to disk via `writeFile(target, content, 'utf8')`.
  - Returns `{ path: <absolute target path> }` on success.
- The helper imports only `node:fs/promises`, `node:path`, and `./paths`. No Next.js runtime, no `better-sqlite3`, no Zod (validation lives at the route boundary).

**AC4 — Initial directory committed**
- `_bmad-output/capstone/.gitkeep` exists (zero-byte placeholder).
- `_bmad-output/capstone/README.md` exists with a one-paragraph trainee-facing explainer ("Each capstone session lands here as `<utc-timestamp>/`. The directory is committed empty; per-session subdirs are gitignored at the repo level.").
- Existing `.gitignore` rule `_bmad-output/capstone/[0-9]*/` is unchanged (per-session timestamped dirs stay ignored; the parent dir + `.gitkeep` + `README.md` are tracked).

**AC5 — Happy path**
- A valid request to `POST /api/capstone/save` with body `{ session: '20260507T143022Z', step: 'brief', content: '<markdown>' }` results in:
  - The file `_bmad-output/capstone/20260507T143022Z/brief.md` is written with the supplied content.
  - A `capstone-step` row is upserted via `upsertProgress({ kind: 'capstone-step', id: '20260507T143022Z/brief', completed: true })`. `completed_at` is the fresh ISO 8601 UTC string the storage layer produces.
  - The response is `200` with body `{ ok: true, path: '_bmad-output/capstone/20260507T143022Z/brief.md' }` (path is relative to `process.cwd()` so it reads naturally as a repo-root-relative path).

**AC6 — Unknown or inactive session**
- A request whose `session` is well-formed but whose row either does not exist in the DB OR exists with `completed_at IS NOT NULL` (already complete) results in:
  - The response is `400` with body `{ ok: false, error: 'Unknown or inactive session' }`.
  - No file is written.
  - No progress row is upserted.
- The handler uses Story 4.1's `isCapstoneSessionActive(sessionId)` to decide active vs. inactive.

**AC7 — Validation failure**
- A body that fails Zod validation (missing field, unknown `step`, malformed `session`, `content` not a string) results in `400` with the Story-3.2 envelope: `{ ok: false, error: 'Invalid request', details: <Zod flatten()> }`. No file written; no row upserted.
- Malformed JSON returns the same `'Invalid request'` envelope as Story 3.2.

**AC8 — Filesystem error**
- If `writeCapstoneArtifact` throws (permission denied, EISDIR, EBUSY, traversal-guard rejection — any reason), the handler logs via `console.error(err)` and returns `500` with body `{ ok: false, error: 'Internal error' }`.
- Critical: **the progress row is upserted only AFTER the file write resolves successfully.** A failed file write must not leave a "step complete" row behind. The route handler enforces this ordering directly.

**AC9 — Architecture locks**
- The route handler does NOT use a Server Action (no `'use server'` directive). It is a Route Handler per architecture line 222.
- The route handler imports only from `@/lib/db/progress-db`, `@/lib/db/schemas`, and `@/lib/capstone/write-artifact`. No `next/server` import (uses Web-standard `Response.json`).
- `writeCapstoneArtifact` does NOT import from `@/lib/db/*` — write-artifact and DB upsert are sequenced by the route handler, not by the helper.

**AC10 — Vitest coverage**
- `src/lib/capstone/paths.test.ts`:
  - `CAPSTONE_DIR` resolves to a path under `process.cwd()` (sanity smoke).
  - `sessionDir('20260507T143022Z')` ends with `_bmad-output/capstone/20260507T143022Z`.
  - `stepFile('20260507T143022Z', 'brief')` ends with `_bmad-output/capstone/20260507T143022Z/brief.md`.
- `src/lib/capstone/write-artifact.test.ts` (tmpdir fixtures via `os.tmpdir() + mkdtemp` so tests don't write into the real `_bmad-output/`):
  - Writes a file at the expected path; content matches.
  - Creates the session directory if it does not exist.
  - Overwrites an existing file (write-then-overwrite case).
  - Path-traversal guard: resolved path containing `..` (e.g. `session: '../etc'`) is rejected with `CapstoneTraversalError`.
  - Path-traversal guard: even when `path.join` collapses the `..`, paths that resolve outside `CAPSTONE_DIR` are rejected.
- `src/app/api/capstone/save/route.test.ts` (mock both `@/lib/db/progress-db` and `@/lib/capstone/write-artifact`):
  - Happy path: 200 + `{ ok: true, path: '…brief.md' }` + write spy called once + upsert spy called once with the matching capstone-step row.
  - Unknown-session: `isCapstoneSessionActive` returns `false` → 400 with `error: 'Unknown or inactive session'` + write spy not called + upsert spy not called.
  - Inactive-session: same — distinct test, asserts the active-check covers the "completed_at IS NOT NULL" case.
  - Validation failure: malformed `session` (e.g. `'2026-05-07T14:30:22Z'` with dashes) → 400 + `error: 'Invalid request'` + neither spy called.
  - Validation failure: unknown `step` (e.g. `'foo'`) → 400 + neither spy called.
  - Malformed JSON body → 400 + `error: 'Invalid request'`.
  - Filesystem error: write spy throws → 500 + `error: 'Internal error'` + upsert spy NOT called (ordering invariant) + console.error called.
  - DB error after successful write: upsert spy throws → 500 + `error: 'Internal error'` + write spy was called (file is on disk, but the row didn't land — the error envelope tells the trainee to retry; the write helper is idempotent so a retry overwrites cleanly).
  - Module surface: only `POST` exported.
  - Architecture-lock smokes: no `'use server'`, no `next/server`, imports only the three allowed modules.

## Tasks/Subtasks

- [ ] **Task 1 — `CapstoneSaveRequest` Zod (AC1, AC7)** — In `src/lib/db/schemas.ts`, export a `CapstoneSaveRequest` Zod object reusing `CAPSTONE_SESSION_ID` from Story 4.1 for the session field. Step is `z.enum(['brief', 'epic', 'story-1', 'story-2', 'adr'])`. Content is `z.string()`. Re-export the inferred type. Re-export `CapstoneStepName = 'brief' | 'epic' | 'story-1' | 'story-2' | 'adr'` for downstream consumers (paths.ts, write-artifact.ts, Story 4.4 UI).

- [ ] **Task 2 — `src/lib/capstone/paths.ts` (AC2)** — Single-file helper. Imports `node:path`. Exports `CAPSTONE_DIR`, `sessionDir(sessionId)`, `stepFile(sessionId, step)`, `CapstoneStepName` (re-exported from schemas).

- [ ] **Task 3 — `src/lib/capstone/write-artifact.ts` (AC3)** — Async function `writeCapstoneArtifact({ session, step, content })`. Imports `mkdir`, `writeFile` from `node:fs/promises`. Resolves the target via `stepFile(session, step)`. Path-traversal guard: `if (!path.resolve(target).startsWith(CAPSTONE_DIR + path.sep)) throw new CapstoneTraversalError(target)`. Then `mkdir(sessionDir(session), { recursive: true })` followed by `writeFile(target, content, 'utf8')`. Returns `{ path: target }` (absolute path; route handler converts to relative for the response).

- [ ] **Task 4 — Initial dir committed (AC4)** — Create `_bmad-output/capstone/.gitkeep` (empty) and `_bmad-output/capstone/README.md` with the trainee-facing explainer. Confirm via `git status` that the parent dir is now tracked while `_bmad-output/capstone/[0-9]*/` continues to gitignore future per-session dirs.

- [ ] **Task 5 — `paths.test.ts` (AC10)** — Three small Vitest cases: `CAPSTONE_DIR` is under `process.cwd()`; `sessionDir` produces the expected suffix; `stepFile` produces the expected suffix.

- [ ] **Task 6 — `write-artifact.test.ts` (AC10)** — 5 Vitest cases against tmpdir fixtures: writes file with content; creates session dir; overwrites existing file; rejects `..`-laden session; rejects post-resolve out-of-CAPSTONE_DIR path. Use `vi.mock('./paths', …)` to point `CAPSTONE_DIR` at a per-test tmpdir so tests don't collide with the real working tree.

- [ ] **Task 7 — `src/app/api/capstone/save/route.ts` (AC5–AC9)** — POST handler. Try/catch on `req.json()` → Story-3.2-shaped 400 on parse failure. `CapstoneSaveRequest.safeParse` → 400 on validation failure with `parsed.error.flatten()`. `isCapstoneSessionActive(session)` → 400 `'Unknown or inactive session'` if false. `await writeCapstoneArtifact({ session, step, content })` — if it throws, `console.error(err)` and return 500 `'Internal error'`. On success, `upsertProgress({ kind: 'capstone-step', id: \`${session}/${step}\`, completed: true })` — if it throws, same 500 envelope. On full success, return 200 with `{ ok: true, path: <repo-root-relative path> }`. Use `path.relative(process.cwd(), absolutePath)` to compute the response path.

- [ ] **Task 8 — `src/app/api/capstone/save/route.test.ts` (AC10)** — Mirror Story 3.2's structure. `vi.mock('@/lib/db/progress-db', () => ({ upsertProgress: vi.fn(), isCapstoneSessionActive: vi.fn() }))`. `vi.mock('@/lib/capstone/write-artifact', () => ({ writeCapstoneArtifact: vi.fn() }))`. 11 cases as listed in AC10. Strongly-typed spies. Module-surface smoke verifies only `POST` exported. Architecture-lock smoke verifies absent `'use server'` directive. Import-discipline smoke verifies only three allowed modules imported.

- [ ] **Task 9 — Quad gate clean** — `npm run test:unit`, `npm run test:e2e`, `npm run lint`, `npm run lint:links` all green. `npm run build` continues to succeed (the new route is App-Router-discovered automatically).

### Review Findings

_(populated after code review)_

**Patches:** _(pending)_

**Deferred:** _(pending)_

**Dismissed:** _(pending)_

## Dev Notes

**Architecture references** (`_bmad-output/planning-artifacts/architecture.md`):
- Line 202 — capstone artifact location is `./_bmad-output/capstone/<utc-timestamp>/`; "the directory itself is committed empty with a `.gitkeep` and `README.md`." Task 4 closes that loop.
- Line 221 — two POST Route Handlers in v1: `POST /api/progress` (lessons/labs/capstone-step/capstone-session) and `POST /api/capstone/save` (this story's endpoint).
- Line 223 — error model: plain `Response.json({ error: '…' }, { status: … })`. Same envelope shape Story 3.2 established.
- Line 364 — status codes: 200 for upsert-style POSTs, 201 for create-style. The save endpoint is upserting an artifact (file overwrite + row upsert), so 200 is correct. (201 will live in Story 4.3's "start a new session" path, where a new row is created.)
- Line 397 — `CapstoneSaveRequest` body shape: `{ session: string, step: 'brief' | 'epic' | 'story-1' | 'story-2' | 'adr', content: string }`. Verbatim.
- Line 564–567 — folder layout: `src/lib/capstone/paths.ts` and `src/lib/capstone/write-artifact.ts` are the named modules; route handler at `src/app/api/capstone/save/route.ts`.

**Why path-traversal guard despite Zod?**
- The Zod regex from Story 4.1 already disallows `..` and slashes outside the canonical `<UTC>/<step>` shape. The post-resolve check in `write-artifact.ts` is defense-in-depth: a future code path that bypasses Zod (a script importing `writeCapstoneArtifact` directly) shouldn't be able to escape `CAPSTONE_DIR`. The cost is one `path.resolve + startsWith` check per call. Keeping the guard at the helper layer means the property holds regardless of who invokes it.
- The architecture's threat model is local-only single-user (line 212); CSRF/path-traversal-from-remote isn't the threat. The guard is for the case where a future story's bug (a misconfigured prefix, a typo in a constant) would otherwise silently land artifacts outside `_bmad-output/capstone/`.

**Why ordering matters (file write before progress upsert):**
- AC8: a failed file write must not leave a "step complete" row in the DB. If we upsert first and then writeFile fails, the trainee's UI shows "step complete" but no artifact exists. The reverse ordering (write first, then upsert) means a write that succeeds but a row that fails to insert leaves the artifact on disk WITHOUT a row — which the trainee can recover from by retrying (idempotent overwrite + idempotent upsert). The "row before file" failure mode is silently corrupting; the "file before row" failure mode is loud and recoverable.
- The route handler enforces this order directly (no helper, no transaction needed — there's no DB transaction that spans filesystem writes anyway).

**Why mock both `progress-db` and `write-artifact` in route tests:**
- The route's logic is the orderliness contract: validate → check-active → write file → upsert row. Each step has a failure mode. Mocking both lets us exercise each branch (write-fails-before-upsert, upsert-fails-after-write, active-check-fails-before-either) without spinning up a SQLite or touching real disk.
- `paths.ts` and `write-artifact.ts` get their own focused tests against tmpdir fixtures (Tasks 5 + 6). The mocking in Task 8 is for route logic, not helper logic.

**Response path: relative or absolute?**
- AC5 says `'_bmad-output/capstone/20260507T143022Z/brief.md'` — repo-root-relative. The route handler computes `path.relative(process.cwd(), absoluteTargetPath)` to produce that shape. This matches what a trainee would type into `git add` after running their capstone — the response path is copy-paste-ready.

**Error envelope reuse:**
- Story 3.2 established the `{ ok: false, error: '<short string>', details?: Zod-flatten }` shape. This story reuses it verbatim for "Invalid request" and "Internal error". The new error string `'Unknown or inactive session'` is distinct so a Story 4.4 client can branch on the `error` field if it wants to surface "your session expired" specifically (but a generic toast on non-2xx is also fine — the architecture's "smallest interactive surface" lock applies).

**Why `mkdir({ recursive: true })` on the session dir:**
- The `_bmad-output/capstone/` parent will exist after Task 4 (committed). The per-session `<utc-timestamp>/` subdir is created lazily by the first save call for that session. Story 4.3's "Start your capstone" path will create the dir explicitly when the session is registered (so the trainee sees it on disk before they save anything). But the helper still mkdirps because: (a) it's idempotent and (b) belt-and-suspenders against a future story that creates a session row but skips the directory step.

**Architecture-lock dismissals (anticipated; same threat model as Story 3.2):**
- "No CSRF / Origin check" — local-only single-user; auth-shaped concerns out of scope (line 212).
- "No body-size cap on `content` string" — Next.js App Router has a default body cap; trainee DoSing their own machine is their prerogative.
- "No Content-Type validation" — same threat model.
- "Multiple concurrent saves to the same `<session>/<step>`" — single-trainee local app; "concurrent" requests from one trainee don't really happen. Last-writer-wins via overwrite is semantically fine.

**Relationship to Story 4.1:**
- This story consumes `CAPSTONE_SESSION_ID` regex, `isCapstoneSessionActive` helper, and the widened `kind` enum that accepts `'capstone-step'` ids. None of those existed before Story 4.1. Order matters: 4.1 must land before 4.2.

**No-egress / runtime-fs sanity:**
- New file writes are scoped to `_bmad-output/capstone/<session>/<step>.md`, all under the working tree. No remote calls. NFR-S1 invariant holds.

**Test approach:**
- Vitest covers paths.ts (pure-function) + write-artifact.ts (pure-function-of-disk via tmpdir) + route.ts (mocked helpers).
- No e2e changes in this story — the user-visible flow lands with Story 4.4 (per-step page submits to this endpoint).

## Dev Agent Record

### Implementation Plan

1. **Schema first** — Task 1 lands `CapstoneSaveRequest` and `CapstoneStepName` so paths.ts has a type to import.
2. **Path helpers** — Task 2 is pure path arithmetic; trivial.
3. **Write helper** — Task 3 lands the filesystem boundary. Path-traversal guard goes in here.
4. **Initial dir commit** — Task 4 is repo-state hygiene; do it before the route lands so the first happy-path save against the real tree has a parent dir to mkdir into.
5. **Helper tests** — Tasks 5 + 6 lock the helper contract before the route consumes them.
6. **Route handler** — Task 7 wires the four-step contract: validate → check-active → write → upsert.
7. **Route tests** — Task 8 covers all 11 cases including the two ordering-invariant cases (write-fails-before-upsert, upsert-fails-after-write).
8. **Quad gate** — Task 9 closes the loop.

### Debug Log

_(populated during implementation)_

### Completion Notes

_(populated during implementation)_

## File List

_(populated during implementation)_

## Change Log

- 2026-05-08 — Story file authored from epics.md §Epic 4 / Story 4.2.
