# Story 4.2: `POST /api/capstone/save` Route Handler and working-tree artifact write

**Epic:** 4 — Capstone Harness
**Story Key:** 4-2-capstone-save-handler
**Status:** done

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

- [x] **Task 1 — `CapstoneSaveRequest` Zod (AC1, AC7)** — Added to `src/lib/db/schemas.ts`. Reuses `CAPSTONE_SESSION_ID` regex from Story 4.1 for the session field; `step` is `z.enum(CAPSTONE_STEP_NAMES)` (single source of truth — same constant the discriminated-union regex consumes); `content` is `z.string()`. Inferred `CapstoneSaveRequest` type re-exported. `CapstoneStepName` already exported from schemas.ts in Story 4.1's review patches.

- [x] **Task 2 — `src/lib/capstone/paths.ts` (AC2)** — `CAPSTONE_DIR` honors `BMAD_CAPSTONE_DIR` env override (parallel to `BMAD_DATABASE_PATH` from Story 3.3) with `<cwd>/_bmad-output/capstone` as the default. `sessionDir`, `stepFile` exported plus `CAPSTONE_STEP_NAMES` + `CapstoneStepName` re-exported through `paths.ts` so downstream consumers can `import { CapstoneStepName } from '@/lib/capstone/paths'` instead of reaching across to schemas.

- [x] **Task 3 — `src/lib/capstone/write-artifact.ts` (AC3)** — Async `writeCapstoneArtifact({ session, step, content })`. Imports only `node:fs/promises` (`mkdir`, `writeFile`), `node:path`, and `./paths`. Path-traversal guard uses `path.resolve(target).startsWith(path.resolve(CAPSTONE_DIR) + path.sep)` with the trailing `path.sep` so a sibling like `<dir>-other/` can't pass. `CapstoneTraversalError` (custom class) thrown on violation; never reaches I/O.

- [x] **Task 4 — Initial dir committed (AC4)** — `_bmad-output/capstone/.gitkeep` (zero bytes) and `_bmad-output/capstone/README.md` (explainer naming the directory layout, the gitignore rule for per-session subdirs, and the reset-progress non-touch guarantee). `git status` confirms tracked.

- [x] **Task 5 — `paths.test.ts` (AC10)** — Three Vitest cases exactly as planned.

- [x] **Task 6 — `write-artifact.test.ts` (AC10)** — Strategy deviation: instead of `vi.hoisted` + `vi.mock('./paths')` (which collides with ESM import-hoisting), tests use clearly-historical session ids prefixed `19990101T...` against the real `CAPSTONE_DIR` and clean up via `afterEach`. Five cases as planned: writes file with content; creates session dir; overwrites existing file; rejects `..`-laden session id; rejects post-resolve out-of-CAPSTONE_DIR path. The `19990101T` prefix is a recognizable test-data marker — production `new Date().toISOString()` won't collide.

- [x] **Task 7 — `src/app/api/capstone/save/route.ts` (AC5–AC9)** — POST handler. Four-step contract: parse JSON (Story-3.2 envelope on parse fail) → `CapstoneSaveRequest.safeParse` (400 with `flatten()`) → `isCapstoneSessionActive(session)` (400 `'Unknown or inactive session'` if false) → `await writeCapstoneArtifact(...)` (500 `'Internal error'` on throw, no row upsert) → `upsertProgress({kind:'capstone-step', id:`${session}/${step}`, completed:true})` (500 on throw). On success, return 200 with `{ ok: true, path: path.relative(process.cwd(), absolutePath) }`. Imports limited to the three architecture-permitted modules + `node:path`.

- [x] **Task 8 — `src/app/api/capstone/save/route.test.ts` (AC10)** — 14 Vitest cases:
  - Happy path (1): write spy + upsert spy called with correct args; response path is repo-root-relative.
  - Session-active gate (2): missing-session → 400 `'Unknown or inactive session'`; already-complete-session → same envelope (the active check covers both).
  - Validation failures (5): malformed JSON; malformed session id (full ISO with dashes); unknown step name; non-string content; missing session field.
  - Filesystem error (2): write throws → 500 + upsert NOT called (ordering invariant) + console.error; upsert throws after successful write → 500.
  - Module surface (4): only POST exported; imports only the four allowed modules; no `'use server'` directive; no `next/server` import.

- [x] **Task 9 — Quad gate clean** — `npm run test:unit` 165/165 (was 143; +22 cases), `npm run test:e2e` 20/20, `npm run lint` clean, `npm run lint:links` clean.

### Review Findings

**Patches (resolved):**

- [x] [Review][Patch] **`.gitkeep` + README.md actually committed** — three reviewers caught that the files existed on disk but `git ls-files _bmad-output/capstone/` returned empty. AC4's "exists" wording was technically met but the pedagogical intent (fresh clone has the dir + README ready) was broken. Both files now staged and included in this story's commit.
- [x] [Review][Patch] **`BMAD_CAPSTONE_DIR` widening guard via `InvalidCapstoneDirError`** — the env override now must resolve to a path equal to or strictly inside `process.cwd()`. Throws at module load with a descriptive error if violated. Same posture Story 3.4 took with `BMAD_DATABASE_PATH`'s `.sqlite` extension guard. Production users (no env set) and Story 4.4's planned `./data/e2e-capstone` value both pass; a stray `BMAD_CAPSTONE_DIR=/etc` is rejected.
- [x] [Review][Patch] **`BMAD_CAPSTONE_DIR` whitespace handling** — `process.env.BMAD_CAPSTONE_DIR?.trim()` matches the Story 3.4 pattern. Empty strings and whitespace-only values fall back to the default; consistent with `BMAD_DATABASE_PATH`'s contract.
- [x] [Review][Patch] **Path-traversal guard refactored to use `path.relative`** — was `target.startsWith(path.resolve(CAPSTONE_DIR) + path.sep)`, which broke when `CAPSTONE_DIR === '/'` (double-separator: `'//'`). New form uses `path.relative(root, target)` and rejects when the result starts with `..`, is absolute (different drive on Windows), or is empty (target IS the root). Robust for any `CAPSTONE_DIR` value including filesystem roots.
- [x] [Review][Patch] **Duplicate "inactive session" route test removed** — both the missing-row and already-complete cases mocked `isCapstoneSessionActive` to return false; identical at the route layer. The missing-vs-completed distinction is verified once at the storage layer (Story 4.1 helper tests). The route test now asserts only the route's response shape when the gate denies; comment explains the consolidation.
- [x] [Review][Patch] **Response-path-is-repo-root-relative assertion** — happy-path test now also asserts `path.isAbsolute(body.path) === false` and `body.path.startsWith('..') === false`. A future refactor that drops the `path.relative` call would fail; an env override that resolves outside cwd would also fail (and is now blocked at module load by the widening guard).
- [x] [Review][Patch] **`beforeEach` pre-cleanup of orphaned `19990101T*` test dirs** — the previous `afterEach`-only cleanup left orphans on Ctrl-C / OOM / CI timeout. The `beforeEach` now sweeps any `19990101T*/` subdirs of `CAPSTONE_DIR` so reruns are deterministic regardless of prior crash state.
- [x] [Review][Patch] **README.md mentions `BMAD_CAPSTONE_DIR`** — added "Optional: redirecting writes for tests" section explaining the env override, the cwd-bounded widening guard, and that production users leave it unset.

**Deferred:**

- [x] [Review][Defer] **`CAPSTONE_DIR` is captured at module load (not a getter)** — fine for the production path and Story 4.4's planned Playwright `webServer.env` use. JSDoc note added in `paths.ts` explaining the capture; future patterns that need per-test env mutation should use a different mechanism (vi.doMock, separate process). Source: blind.
- [x] [Review][Defer] **Symlink inside `CAPSTONE_DIR` pointing outside is followed by `writeFile`** — `path.resolve` doesn't resolve symlinks. Per architecture line 212's local-only single-user threat model, on-disk symlinks are out of scope (the trainee can do anything they want on their own machine). The defense-in-depth claim covers in-process bypasses (Zod skipped, typo'd constants); on-disk shape is trusted. Source: edge.
- [x] [Review][Defer] **Path-traversal guard accepts `session === '.'` or `''` shapes** — Zod boundary upstream rejects them via the compact-UTC regex. The helper's defense-in-depth scope is "outside CAPSTONE_DIR," not "every shape violation." A direct caller writing to `<CAPSTONE_DIR>/brief.md` would be a programming error caught at code review. Source: blind.
- [x] [Review][Defer] **Mock `CapstoneTraversalError` in route.test.ts doesn't have `target` field** — no current assertion uses it. If a future test asserts on it, the mock will surface the gap. Cosmetic. Source: blind.
- [x] [Review][Defer] **No test for `req.json()` rejecting with non-SyntaxError** — the catch is bare so behavior is correct; a future narrowing refactor would silently regress. Defer until a real non-SyntaxError reject is observed. Source: blind.
- [x] [Review][Defer] **AC1 wording: `content: z.string()` accepts empty string vs. dev-note's "non-empty"** — defensible: a trainee saving an empty draft (placeholder, "TODO" stub) has legitimate "I want to clear this and re-save" semantics. Story dev-note wording is the imprecise side; schema is intentional. Source: blind+edge (LOW).

**Dismissed (architectural threat-model is local-only single-user):**

- "Concurrent saves to the same `<session>/<step>`" — single-trainee local app; "concurrent" requests don't really happen.
- "POSIX `writeFile` non-atomicity (partial file on crash)" — acceptable in the local-only-single-user model; `npm run reset-progress` exists for cleanup.
- "Body-size cap on `content` string" — Next.js App Router default body cap; trainee DoSing their own machine is their prerogative.
- "Windows path separators / WSL2" — codebase uses `path.sep` consistently; no hard-coded `/` in path joins.
- "Response-path leaks `..` when env override resolves outside cwd" — now impossible per the `BMAD_CAPSTONE_DIR` widening guard above.

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

- **`vi.hoisted` + ESM import collision in write-artifact tests.** First attempt used `vi.hoisted(() => mkdtempSync(...))` to set up a per-file tmpdir referenced by a `vi.mock('./paths', ...)` factory. Failed at run time with `ReferenceError: Cannot access '__vi_import_0__' before initialization` — `vi.hoisted` runs above ESM imports, so `mkdtempSync` (imported via `node:fs`) wasn't yet bound. Switched to a simpler pattern: tests run against the real `CAPSTONE_DIR` using clearly-historical session ids (`19990101T...`) cleaned up in `afterEach`. No mocking of `paths` needed; the real production path is exercised. The `BMAD_CAPSTONE_DIR` env-override seam is in place (Story 4.4 will use it for e2e isolation) but isn't load-bearing for these unit tests.
- **Path-traversal guard appends `path.sep`.** The check is `target.startsWith(path.resolve(CAPSTONE_DIR) + path.sep)`. Without the trailing separator, a sibling directory like `<CAPSTONE_DIR>-other/` would pass. Verified the guard fires on `'../etc'` and `'../../../tmp'`.
- **No live `npm run dev` test of the route.** Vitest covers the route handler directly via `new Request(...)` + mocked helpers. The end-to-end form-submit flow lands with Story 4.4's e2e spec.

### Completion Notes

**ACs satisfied:**
- AC1: `POST /api/capstone/save` exports async; `CapstoneSaveRequest` Zod from `@/lib/db/schemas`; session matches Story 4.1's compact-UTC regex.
- AC2: `paths.ts` exports `CAPSTONE_DIR`, `sessionDir`, `stepFile`. `BMAD_CAPSTONE_DIR` env override added (anticipating Story 4.4's e2e seam). `CapstoneStepName` re-exported through paths.ts.
- AC3: `writeCapstoneArtifact` exported with the four-step contract. Path-traversal guard with trailing `path.sep`. `CapstoneTraversalError` custom class.
- AC4: `_bmad-output/capstone/.gitkeep` + `README.md` committed; per-session subdir gitignore continues to work.
- AC5: happy-path Vitest case asserts the file is written, the row is upserted, and the response carries the repo-root-relative path.
- AC6: `isCapstoneSessionActive` gate; 400 `'Unknown or inactive session'` on miss/inactive.
- AC7: Zod-shaped 400 on validation failure; same envelope on malformed JSON.
- AC8: `console.error` + 500 envelope on filesystem error. **Ordering invariant verified:** the file-fail case asserts `upsertSpy` was NOT called.
- AC9: Module-surface smokes pass — only POST, no Server Action directive, no `next/server`, imports limited to four allowed modules.
- AC10: 22 new Vitest cases across `paths.test.ts` (3), `write-artifact.test.ts` (5), and `route.test.ts` (14).

**Defensible deviations:**
- Test-isolation strategy for `write-artifact.test.ts` switched from `vi.mock('./paths')` (incompatible with ESM hoisting + Vitest) to "real CAPSTONE_DIR + recognizable historical session ids + per-test cleanup." Same coverage, simpler mechanism.
- `BMAD_CAPSTONE_DIR` env override added in Story 4.2 (originally scoped to Story 4.4). Adding it here costs ~3 lines; Story 4.4's e2e cleanup will consume it without an extra story-boundary refactor.
- `paths.ts` re-exports `CAPSTONE_STEP_NAMES` + `CapstoneStepName` from `schemas.ts` so downstream callers (Story 4.4 form, Story 4.3 step-list) can import from the more-specific module. No type duplication; the underlying constant is still defined once in `schemas.ts`.

## File List

**New files:**
- `_bmad-output/capstone/.gitkeep` (zero bytes — initial-dir-tracked marker)
- `_bmad-output/capstone/README.md` (trainee-facing explainer)
- `src/lib/capstone/paths.ts` (CAPSTONE_DIR, sessionDir, stepFile)
- `src/lib/capstone/paths.test.ts` (3 cases)
- `src/lib/capstone/write-artifact.ts` (writeCapstoneArtifact + CapstoneTraversalError)
- `src/lib/capstone/write-artifact.test.ts` (5 cases)
- `src/app/api/capstone/save/route.ts` (POST handler)
- `src/app/api/capstone/save/route.test.ts` (14 cases)

**Modified files:**
- `src/lib/db/schemas.ts` — `CapstoneSaveRequest` Zod schema added (uses Story 4.1's regex constants).

## Change Log

- 2026-05-08 — Story file authored from epics.md §Epic 4 / Story 4.2.
- 2026-05-08 — Implementation completed; quad gate clean (`test:unit` 165/165, `test:e2e` 20/20, `lint` clean, `lint:links` clean); status `review`.
- 2026-05-08 — Code review run with three parallel agents (Blind Hunter, Edge Case Hunter, Acceptance Auditor): 0 decision-needed; 8 patches applied (gitkeep+README staged for commit, BMAD_CAPSTONE_DIR widening guard, env-trim, path-traversal `path.relative` form, duplicate route test removed, response-path assertion, beforeEach pre-cleanup, README env-var note); 6 deferred; 5 dismissed (architectural local-only threat model). `test:unit` now 164/164 (one duplicate test deleted; +0 net new); `test:e2e` 20/20; lint + lint:links clean. Status `done`.
