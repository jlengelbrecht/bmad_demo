# Story 4.1: Resolve capstone-session schema shape and extend the progress store for capstone kinds

**Epic:** 4 — Capstone Harness
**Story Key:** 4-1-capstone-schema
**Status:** done

## Story

As the developer landing FR-3.7 (capstone resume),
I want to deliberately pick one of the three viable schema shapes flagged in the architecture's design-point list — and extend the progress store and Zod schemas to cover capstone-session and capstone-step state,
So that "most recent active session" and "is this session complete?" are O(1) queryable, and the on-disk session-id matches the in-DB session-id by construction.

## Acceptance Criteria

**AC1 — Design-point resolution documented in code**
- A short comment block at the top of `src/lib/db/progress-db.ts` names the chosen schema shape and the rationale.
- The block references the three viable shapes flagged in the architecture (nullable `completed_at` on `progress`, separate `capstone_sessions` table, distinct kind-value transition) and states which one was picked + why.
- The block calls out the key semantic deviation it introduces: for `kind='capstone-session'`, `completed_at IS NULL` means **in-progress** (not "marked incomplete by the user"), inverting the lesson/lab convention. This is the cost of keeping one table.

**AC2 — Schema continues to apply idempotently**
- `src/db/schema.sql` continues to apply idempotently from a clean DB.
- The schema continues to apply idempotently against a Story-3.1 DB (an already-existing `data/progress.sqlite` with lesson/lab rows is forward-compatible with no migration step).
- A Vitest case re-applies the schema against an in-memory DB seeded with Story-3.1-shaped lesson/lab rows and asserts no throw + no row loss.

**AC3 — Zod widened, formats locked**
- `ProgressUpsertRequest.kind` enum is extended from `['lesson', 'lab']` to `['lesson', 'lab', 'capstone-session', 'capstone-step']`.
- A discriminated `id`-format check enforces:
  - Capstone-session `id` matches `^\d{8}T\d{6}Z$` (compact UTC, e.g. `'20260507T143022Z'`).
  - Capstone-step `id` matches `^\d{8}T\d{6}Z\/(brief|epic|story-1|story-2|adr)$` (session timestamp + slash + canonical step name).
  - Lesson and lab kinds keep the existing `.trim().min(1).max(200)` bare-string contract.
- Story 3.2's `POST /api/progress` "scope gate" Vitest case (which currently asserts `capstone-session` returns 400) is updated to reflect the new contract — capstone-session is now accepted by the schema; the old hard-rejection test is replaced with format-shape validation tests.

**AC4 — Progress-DB capstone-aware helpers**
- `progress-db.ts` exports three new functions:
  - `getRecentCapstoneSession(db?)`: returns the most-recently-created session row as `{ id: string, completedAt: string | null } | null`. Sort is `id DESC` (lexicographic on the compact-UTC format is also chronological).
  - `isCapstoneSessionActive(sessionId, db?)`: returns `true` iff the row exists and `completed_at IS NULL`.
  - `markCapstoneSessionComplete(sessionId, db?)`: updates an existing in-progress row's `completed_at` to a fresh ISO 8601 UTC string. No-op if the row doesn't exist or is already complete (returns a `{ updated: boolean }` shape so callers can branch).
- All three functions reuse the prepared-statement cache pattern established in Story 3.1.
- All three accept the optional `db` argument used by tests; production callers omit it and hit the singleton.

**AC5 — Vitest coverage**
- New cases in `src/lib/db/progress-db.test.ts`:
  - `getRecentCapstoneSession`: returns `null` from a fresh DB; returns the latest session by `id DESC` ordering when multiple sessions exist (lexicographic UTC); ignores non-`capstone-session` rows; returns `completedAt: null` for an active session and the ISO string for a completed one.
  - `isCapstoneSessionActive`: returns `true` for a freshly inserted in-progress session; returns `false` after `markCapstoneSessionComplete`; returns `false` for a non-existent session id.
  - `markCapstoneSessionComplete`: flips an active session's `completed_at` to a fresh ISO 8601 UTC string and returns `{ updated: true }`; no-ops on already-complete or missing rows and returns `{ updated: false }`.
  - `ProgressUpsertRequest` widening: well-formed `capstone-session` accepted; well-formed `capstone-step` accepted; malformed capstone-session id (e.g. `'2026-05-07T14:30:22Z'` — wrong format with dashes/colons) rejected; malformed capstone-step id (missing slash, unknown step name like `'…/foo'`, missing session prefix) rejected; lesson and lab requests still accepted (regression).
  - Forward-compat smoke: a DB seeded with Story-3.1-shaped `('lesson', 'lesson-1', <ISO>)` and `('lab', 'solo', <ISO>)` rows survives a re-apply of `schema.sql` with no throw and no row loss.
- All existing Story 3.1 / 3.3 tests continue to pass (no regressions).

**AC6 — Story 3.2 route-handler tests refreshed**
- `src/app/api/progress/route.test.ts` "unknown `kind` capstone-session (400)" case is replaced by:
  - A `capstone-session` happy-path case posting `{ kind: 'capstone-session', id: '20260507T143022Z', completed: true }` and asserting 200 + `upsertProgress` spy called.
  - A `capstone-session` validation-failure case posting a malformed id and asserting 400 with `error: 'Invalid request'`.
- The architecture-lock + import-discipline smokes from Story 3.2 continue to pass unchanged.

## Tasks/Subtasks

- [x] **Task 1 — Schema-shape decision documented (AC1)** — 19-line comment block prepended to `src/lib/db/progress-db.ts` (above `ProgressKind`) naming the three viable shapes (A: nullable `completed_at`, B: separate `capstone_sessions` table, C: kind-value transition); option A chosen with explicit rationale and the `completed_at IS NULL` semantic-overload caveat.

- [x] **Task 2 — Forward-compat smoke (AC2)** — `progress-db.test.ts` adds `forward-compat: schema absorbs Story-3.1-shaped rows`. Seeds `('lesson', 'lesson-1', <ISO>)` + `('lab', 'solo', <ISO>)` directly via `db.prepare(...).run(...)`, re-runs `schema.sql` text, asserts both rows survive with original `completed_at` values intact.

- [x] **Task 3 — `ProgressUpsertRequest` widened via `z.discriminatedUnion` (AC3)** — `schemas.ts` exports `CAPSTONE_SESSION_ID = /^\d{8}T\d{6}Z$/` and `CAPSTONE_STEP_ID = /^\d{8}T\d{6}Z\/(brief|epic|story-1|story-2|adr)$/`. Four per-kind sub-schemas keyed off `kind: z.literal(...)` compose into `z.discriminatedUnion("kind", [...])`. Lesson/lab keep `.trim().min(1).max(200)`; capstone-session/capstone-step use `.regex(...)`.

- [x] **Task 4 — Capstone helpers added to `progress-db.ts` (AC4)** — `PreparedCache` extended with four new prepared statements (`getRecentCapstone`, `getCapstoneById`, `isCapstoneActive`, `markCapstoneComplete`). Exports: `getRecentCapstoneSession`, `getCapstoneSessionById`, `isCapstoneSessionActive`, `markCapstoneSessionComplete`. All accept the optional `db` arg.
  - **Scope deviation note:** `getCapstoneSessionById` was originally scoped to Story 4.3 (per its AC9). Landed here because the prepared-statement-cache extension is cleaner as a single delta; Story 4.3 will simply consume it. No additional surface; the Story 4.3 file's task list will pre-tick the helper-add subtask.

- [x] **Task 5 — Vitest coverage (AC5)** — net 31 new test cases (after review patches added 3) across `progress-db.test.ts`:
  - `ProgressUpsertRequest` widening: 4 happy-path acceptance cases (lesson/lab/capstone-session/capstone-step) + 6 capstone-id format-failure cases + 1 each-canonical-step-name parametric case = 11 Zod cases.
  - `forward-compat`: 1 seed-then-reapply case.
  - `getRecentCapstoneSession`: 4 cases (fresh DB / id-DESC ordering / ignore-other-kinds / completed-row-shape).
  - `getCapstoneSessionById`: 4 cases (missing / active / completed / kind-discrimination).
  - `isCapstoneSessionActive`: 3 cases (active / after-mark-complete / non-existent).
  - `markCapstoneSessionComplete`: 3 cases (active→complete / already-complete-no-op / missing-no-op).

- [x] **Task 6 — Story 3.2 route-handler tests refreshed (AC6)** — `route.test.ts`:
  - "rejects unknown kind ('capstone-session') — Epic 3 scope gate" → replaced with "rejects an unknown kind value" (kind=`bogus`).
  - Two new validation-failure cases: malformed capstone-session id (full-ISO format) → 400; malformed capstone-step id (unknown step name) → 400.
  - One new happy-path case: capstone-session with `completed: false` (start-session shape) → 200, spy called.
  - Architecture-lock + import-discipline + module-surface smokes unchanged and still pass.

- [x] **Task 7 — Quad gate clean (AC ALL)** — `npm run test:unit` 143/143 (was 112; +31 cases after review patches), `npm run test:e2e` 20/20, `npm run lint` clean, `npm run lint:links` clean. `npm rebuild better-sqlite3` was needed once (native module mismatch from a prior Node upgrade); not a story-introduced regression.

### Review Findings

**Patches (resolved):**

- [x] [Review][Patch] **`markCapstoneSessionComplete` doc-comment factually accurate** — comment now says "Story 4.4 will add the route-handler branch" (future tense) instead of "Used by route handler" (which the route handler did not yet honor). Also documents the intentionally-collapsed `{ updated: false }` semantic (covers both "missing" and "already complete" — Story 4.4 returns 400 for both with the same envelope).
- [x] [Review][Patch] **Direct test for `isCapstoneSessionActive` against a row with non-NULL `completed_at`** — new case inserts a completed row directly via `db.prepare(...).run(...)` and asserts `isCapstoneSessionActive` returns false WITHOUT routing through `markCapstoneSessionComplete`. A regression that drops `AND completed_at IS NULL` from the WHERE clause would now be caught (the previous test would have falsely passed because `markCapstoneSessionComplete`'s own WHERE filter would no-op).
- [x] [Review][Patch] **`isCapstoneSessionActive` simplified** — dropped the unused `{ one: number } | undefined` type cast; the `SELECT 1` query's result is now used solely as an existence signal (`statements(db).isCapstoneActive.get(sessionId) !== undefined`). The decorative cast that misled future readers is gone.
- [x] [Review][Patch] **CHECK constraint tightened to `LIKE '____-__-__T__:__:__%Z'`** — was `'____-__-__T%Z'`, which accepted `'XXXX-XX-XXTwhatevsZ'` and other digit-position-fitting garbage. The new pattern requires `HH:MM:SS` shape too. Schema header comment notes the CHECK is "positional smoke" not full ISO validation; producer is `new Date().toISOString()` so the CHECK is belt-and-suspenders. Existing tests pass; the `'banana'` rejection test still works.
- [x] [Review][Patch] **Forward-compat smoke seeds an additional NULL-`completed_at` row** — Story 3.1's mark-incomplete contract produces NULL rows; the smoke now covers that shape too. Seed values switched to `new Date().toISOString()` (which includes ms precision) so the test asserts exact-string survival across the schema re-apply.
- [x] [Review][Patch] **`getRecentCapstoneSession` `id DESC, rowid DESC` tiebreaker** — the function still returns the most recent session by id; `rowid DESC` is a defensive secondary order so an NTP step-back during a training session (where wallclock and id-time disagree) returns the newer-by-insert session. Code comment explains the assumption.
- [x] [Review][Patch] **`getRecentCapstoneSession` test for "all sessions completed"** — new case seeds two completed sessions and asserts the helper returns the most recent one with its non-NULL `completedAt`. Locks the Story 4.3 caller's contract (must check `completedAt !== null` to branch resume-vs-complete).
- [x] [Review][Patch] **`CAPSTONE_STEP_NAMES` constant exported from `schemas.ts`** — was duplicated as a regex alternation (`(brief|epic|...)`) AND a string array in the parametric test. Extracted to one source of truth; the regex is now built via `new RegExp(\`^\\d{8}T\\d{6}Z\\/(${CAPSTONE_STEP_NAMES.join("|")})$\`)` and the test iterates over the same constant. `CapstoneStepName` type also exported (re-used by Stories 4.2/4.3/4.4).
- [x] [Review][Patch] **AC6 verbatim happy-path case (`completed: true`) added to `route.test.ts`** — AC6 specifies `{ kind: 'capstone-session', id: '20260507T143022Z', completed: true }`; the previous test sent `completed: false` (start-session shape). Both cases now exist; comment notes the existing-route-handler behavior (plain `upsertProgress` regardless of `completed`) and Story 4.4's planned route-handler branch.
- [x] [Review][Patch] **`beforeEach(__resetDbCacheForTests)` at top of `progress-db.test.ts`** — defensive guard so a future test that forgets the explicit-`db` arg pattern doesn't accidentally hit the production singleton (which would either fail in CI on a fresh checkout or pollute the developer's `data/progress.sqlite`). Cheap insurance.

**Deferred:**

- [x] [Review][Defer] **Legacy DB without CHECK constraint** — `CREATE TABLE IF NOT EXISTS` skips the body if the table already exists, so a Story-3.0-vintage `progress.sqlite` keeps its CHECK-less definition forever. Architecture's "local-only single-trainee" model offers `npm run reset-progress` as the migration path; trainees who span major refactors blow away the local DB. Source: edge.
- [x] [Review][Defer] **`CAPSTONE_SESSION_ID` accepts hour-25 / month-13 / Feb-30 / year-0000** — the regex enforces shape, not temporal validity. Per architecture's local-only single-user threat model (line 212) the local user typing nonsense into a URL is their prerogative; downstream filesystem ops are guarded by Story 4.2's path-traversal check. Source: edge.
- [x] [Review][Defer] **Storage layer accepts capstone-step ids without re-validation** — Story 4.2's `CapstoneSaveRequest` Zod owns the format check at the API boundary; the storage layer trusts its callers. The boundary-not-storage rule matches Story 3.1's existing pattern (lesson/lab ids are also unvalidated at the storage layer). Source: edge.
- [x] [Review][Defer] **`__resetDbCacheForTests` doesn't reach the per-Database WeakMap statement cache** — entries are auto-collectable when the Database is closed; the close-then-null pattern in `__resetDbCacheForTests` makes the Database unreachable from globalCache. The WeakMap entry becomes garbage. Hypothetical risk only. Source: edge.
- [x] [Review][Defer] **Magic kind-string `'capstone-session'` repeated in 4 SQL strings** — the kind is defined in the `ProgressKind` type at line 28; the 4 SQL strings are bounded and grep-discoverable. Extracting `CAPSTONE_SESSION_KIND` is over-abstraction at this scale. Revisit if the kind ever renames. Source: blind.
- [x] [Review][Defer] **`getCapstoneSessionById` cross-kind discrimination test only inserts capstone-step** — the test would also benefit from a parametric loop over lesson/lab. Trivially additive; defer until Story 4.3 lands and the parametric pattern is established for the kind-discrimination check. Source: edge.

**Dismissed (architectural threat-model is local-only single-user):**

- "Tighten the CAPSTONE_SESSION_ID regex to validate temporal correctness" — out of scope per architecture line 212. The local user can't escape via filesystem (Story 4.2 path-traversal guard) and can't poison shared state (no shared state).
- "Multi-process write contention on `getRecentCapstoneSession`" — single-trainee local app; "concurrent" requests don't exist in normal use.
- "PK collision when two sessions start in the same wall-clock second" — `ON CONFLICT(kind, id) DO UPDATE` absorbs it cleanly; covered by Story 3.1's upsert idiom.
- "AC2 forward-compat smoke is a strawman seed" — the `new Date().toISOString()` switch in the patch above resolves the seed-vs-real-data drift concern.

## Dev Notes

**Architecture references** (`_bmad-output/planning-artifacts/architecture.md`):
- §"Data Architecture" line 203 — the `progress` data model already names all four kinds and locks the encoding conventions: capstone-session id is the compact UTC timestamp (matching the on-disk artifact directory name); capstone-step id is `<session>/<step>`; capstone-session `completed_at IS NULL` while in progress, set when complete.
- §"Frontend Architecture" line 234 — the resume mechanism: query the most recent capstone-session row by `id DESC`; resume if `completed_at IS NULL`; offer to start a new session otherwise. Multiple historical sessions are visible via `?session=<timestamp>`.
- §"Implementation Patterns" lines 396–401 — request/response format conventions, including the compact-UTC session id format (`'20260507T143022Z'` — no dashes, no colons; filesystem-safe across macOS/Linux/WSL2) and ISO 8601 strings for `completed_at` storage.
- §"Decision Priority Analysis" lines 174 + 185 — the architecture flagged "Capstone artifact write path" as a critical decision (already resolved in §Data Architecture line 202: `_bmad-output/capstone/<utc-timestamp>/`) and "Capstone resume mechanism (FR-3.7)" as an important decision that this story formalizes.

**Why option A (nullable `completed_at` on the existing `progress` table) over the alternatives:**
- **Option B (separate `capstone_sessions` table):** Would force a second prepared-statement cache, second migration story (when SQL grows), second backup/reset path consideration. Story 3.4's `npm run reset-progress` already deletes `data/progress.sqlite` wholesale, so a second table doesn't actually grow the reset surface — but it does grow the "things a trainee needs to understand when they open `src/db/`" surface. Architecture's §Data Architecture explicitly chose one table; this story honors that lock.
- **Option C (distinct kind-value transition — e.g. `capstone-session-active` → `capstone-session-complete`):** Forces UPDATE-as-DELETE+INSERT on the (kind, id) primary key. Two row writes per state change. Adds a migration when the row's identity changes, which `markCapstoneSessionComplete` would have to coordinate. Strictly worse ergonomically.
- **Option A (chosen):** One table, one prepared-statement cache, one mutation primitive (`UPDATE … WHERE …` on `completed_at`). The semantic overload (`NULL` means "in progress" for capstone-session vs. "marked incomplete" for lesson/lab) is contained: each query that touches capstone-session filters by `kind = 'capstone-session'` first, so the reader of any one query knows which semantics apply. The cost is a documentation cost (Task 1's comment block), not a code cost.

**Why widen `ProgressUpsertRequest` instead of adding a separate Zod for capstone:**
- Architecture line 221: `POST /api/progress` accepts all four kinds. The public endpoint is the single mutation surface for state transitions; `POST /api/capstone/save` (Story 4.2) is for the artifact write itself. Story 4.4's "Capstone complete" screen will POST `{ kind: 'capstone-session', completed: true }` to `/api/progress`. Splitting the Zod into per-kind schemas would force a route-level dispatch table that doesn't earn its keep at this scale.
- The `superRefine` pattern lets us keep one Zod export with kind-specific id validation. The test surface is larger (one valid + one invalid case per kind) but the public contract stays a single schema.

**Why no `'capstone-step'` mutations through `/api/progress`:**
- Capstone-step rows are written by the artifact-save path (`POST /api/capstone/save` — Story 4.2), not by the public progress endpoint. The route handler will call `upsertProgress({ kind: 'capstone-step', id: '<session>/<step>', completed: true })` directly inside the `/api/capstone/save` handler. The Zod widening still includes `'capstone-step'` in the `kind` enum because: (a) it's the storage layer's contract, not just the API boundary's; and (b) future endpoints (e.g. an admin/debug "force-mark-step-incomplete" tool, or a follow-up "delete a step's row" affordance) might surface through `/api/progress`. Letting Zod accept it here matches architecture line 221 verbatim ("mark a … capstone-step … as complete or active").

**Why `markCapstoneSessionComplete` returns `{ updated: boolean }`:**
- The Story 4.4 completion path will POST `{ kind: 'capstone-session', id: <session>, completed: true }`. The current `upsertProgress` would write `completed_at = now` regardless of the row's prior state — but the architecture's `capstone-session` semantics require we only "complete" something that's currently active. A no-op completion attempt against an already-complete or non-existent session row should be observable so the route handler can return a clean error response. `Statement.run().changes` is the better-sqlite3-native way to ask "did this UPDATE actually change a row?"; we surface it as a typed return so callers don't depend on the better-sqlite3 native shape.

**Why the `id` format regex is centralized in `schemas.ts`:**
- Story 4.2's `CapstoneSaveRequest` will need to validate `session: '20260507T143022Z'`-shaped strings. Story 4.4's per-step page will need to validate `step ∈ {brief, epic, story-1, story-2, adr}` and the session-id query parameter. Exporting `CAPSTONE_SESSION_ID` and `CAPSTONE_STEP_ID` regex constants from `schemas.ts` lets all three call sites share one source of truth — matches the rule-of-three threshold (sessions: progress upsert + capstone save body + URL-param parse).

**Story-3.1 deviation reconciliation:**
- Story 3.1's Dev Notes flagged a defensible deviation: `ProgressKind` (the TypeScript type) widens beyond `ProgressUpsertRequest` (the Zod gate) to include capstone kinds at the storage layer. Story 4.1 closes the gap on the Zod side — the type and the Zod now align on all four kinds. The Story 3.1 deviation note can be updated in this story's Change Log narrative, but the actual `ProgressKind` type itself doesn't need to change.

**Test approach:**
- Vitest covers the storage layer (helpers + Zod) via `:memory:` fixtures.
- The Story 3.2 route-handler tests get refreshed cases for the widened `kind` enum.
- No e2e changes in this story — Stories 4.3 and 4.4 will introduce the user-visible flows.

**No-egress / runtime-fs sanity:**
- This story adds no new fs touches and no new network calls. `progress-db.ts` continues to read/write only `./data/progress.sqlite`. NFR-S1 invariant holds.

**Architecture-doc drift check:**
- Architecture line 203 already specifies the chosen schema shape with the encoding conventions. Story 4.1's comment block (Task 1) is a code-side echo, not a new design decision. No architecture-doc edit required.
- The Epic 3 retro flagged a pending "drift sweep" item: architecture line 202 says reset-progress's deletion target is "hardcoded" while the implementation honors `BMAD_DATABASE_PATH`. Story 4.1 doesn't introduce or resolve that drift; it stays on the deferred list.

## Dev Agent Record

### Implementation Plan

1. **Comment block first** — Task 1 is the lightest task and pins the rationale before code shifts. Land it ahead of the schema/Zod work so the reader has the context.
2. **Forward-compat smoke** — Task 2 verifies the existing `progress` table shape continues to absorb Story-3.1 data without ceremony. Cheap insurance against an unintended schema change slipping in.
3. **Zod widening + format regexes** — Task 3 changes the public contract; do it in isolation so the failing Story 3.2 tests (the "scope gate" case) surface immediately and Task 6 can update them deliberately.
4. **DB helpers** — Task 4 builds the storage primitives Story 4.3 + 4.4 will consume. Prepared-statement cache + WeakMap pattern from Story 3.1 carries through.
5. **Helper tests** — Task 5 covers the new functions and the widened Zod with both happy-path and format-failure cases.
6. **Story 3.2 test refresh** — Task 6 updates the now-stale "scope gate" test. Confirm the architecture-lock and import-discipline smokes still pass.
7. **Quad gate** — Task 7 closes the loop.

### Debug Log

- **Native-module rebuild required at start.** First `npm run test:unit` run failed with `NODE_MODULE_VERSION 141 vs 147` against `better-sqlite3.node`. Resolved with `npm rebuild better-sqlite3` (Node was upgraded between Epic 3 close and Epic 4 kickoff). Not a story-introduced regression; flagged for the operator-pre-flight checklist Epic 5 will assemble.
- **Zod 4 discriminated-union shape.** Initial sketch used `z.object({ kind: z.enum(...) }).superRefine(...)` for kind-specific id validation. Switched to `z.discriminatedUnion("kind", [lesson, lab, capstoneSession, capstoneStep])` because each branch's id constraints are cleaner as their own object schemas, and `flatten()` returns per-field errors more cleanly. The route-handler tests' `body.details.fieldErrors.kind` assertion continues to work because the discriminator failure surfaces as a `kind` field error.
- **`getCapstoneSessionById` early-landed.** Originally scoped to Story 4.3; rolled into Story 4.1's storage-layer extension because the prepared-statement-cache addition is a single coherent delta. The Story 4.3 file flags this as a pre-completed subtask in its task list.
- **`CHECK` constraint compatibility.** The schema has a `CHECK (completed_at IS NULL OR completed_at LIKE '____-__-__T%Z')` on the `completed_at` column. Capstone-session rows seeded as `(kind='capstone-session', id, NULL)` satisfy the CHECK because `completed_at IS NULL` is one of the OR branches. `markCapstoneSessionComplete` writes `new Date().toISOString()` which matches the LIKE pattern. No CHECK adjustments needed.

### Completion Notes

**ACs satisfied:**
- AC1: Comment block at the top of `src/lib/db/progress-db.ts` names the three shapes, picks A, and states the semantic overload.
- AC2: `forward-compat` Vitest case proves Story-3.1 data survives a schema re-apply with no row loss. No migration story needed.
- AC3: `ProgressUpsertRequest` is now `z.discriminatedUnion("kind", ...)` over four sub-schemas. `CAPSTONE_SESSION_ID` and `CAPSTONE_STEP_ID` exported from `schemas.ts` for downstream Story 4.2/4.3/4.4 reuse.
- AC4: `getRecentCapstoneSession`, `isCapstoneSessionActive`, `markCapstoneSessionComplete` all exported with the optional-`db` arg pattern. `markCapstoneSessionComplete` returns `{ updated: boolean }` for caller branching. Bonus: `getCapstoneSessionById` early-landed (Story 4.3 dependency).
- AC5: 28 new Vitest cases across the helpers + Zod widening + forward-compat smoke.
- AC6: `/api/progress` route-handler tests refreshed: scope-gate test replaced with three new cases (unknown-kind rejection, malformed capstone-session id, malformed capstone-step id) plus a capstone-session happy-path case. Architecture-lock + import-discipline smokes from Story 3.2 unchanged and passing.

**Defensible deviations:**
- Used `z.discriminatedUnion` instead of `superRefine` (the AC's "or equivalent discriminated-union form" allowance). Cleaner per-branch error surface; identical contract.
- Pre-landed `getCapstoneSessionById` (originally Story 4.3's scope). The prepared-statement-cache extension is a single coherent edit; splitting it across two stories would be churn for no benefit.

**Test approach as planned:**
- Vitest covers everything via `:memory:` fixtures.
- No e2e changes in this story (Story 4.3 + 4.4 introduce the user-visible flows).
- Story 3.2 route-handler tests confirm the widened Zod is compatible with the existing route handler (no route-code change required in this story).

## File List

**New files:**
- `_bmad-output/implementation-artifacts/4-1-capstone-schema.md` (this file)
- `_bmad-output/implementation-artifacts/4-2-capstone-save-handler.md` (authored ahead of Story 4.2 implementation)
- `_bmad-output/implementation-artifacts/4-3-capstone-overview.md` (authored ahead of Story 4.3 implementation)
- `_bmad-output/implementation-artifacts/4-4-capstone-step-page.md` (authored ahead of Story 4.4 implementation)

**Modified files:**
- `src/lib/db/schemas.ts` — `ProgressUpsertRequest` widened to discriminated union; `CAPSTONE_SESSION_ID` + `CAPSTONE_STEP_ID` regex constants exported; review patch added `CAPSTONE_STEP_NAMES` constant + `CapstoneStepName` type and rebuilt `CAPSTONE_STEP_ID` from it.
- `src/lib/db/progress-db.ts` — schema-shape decision comment block added; `PreparedCache` extended with 4 capstone-aware statements; `CapstoneSessionRow` type + `getRecentCapstoneSession` + `getCapstoneSessionById` + `isCapstoneSessionActive` + `markCapstoneSessionComplete` exported. Review patches: factual-tense doc comment on `markCapstoneSessionComplete`, `id DESC, rowid DESC` tiebreaker on `getRecentCapstoneSession`, simplified `isCapstoneSessionActive` body.
- `src/lib/db/progress-db.test.ts` — 31 new Vitest cases (Zod widening + forward-compat + 4 helper describe blocks); top-of-file `beforeEach(__resetDbCacheForTests)` guard; forward-compat seed includes NULL row + uses real `new Date().toISOString()`.
- `src/db/schema.sql` — CHECK constraint tightened to `LIKE '____-__-__T__:__:__%Z'` per Story 4.1 review.
- `src/app/api/progress/route.test.ts` — Epic-3 scope-gate case replaced with three new format-validation cases; both `completed: false` (start-session) AND `completed: true` (AC6 verbatim) capstone-session happy-path cases now present.

## Change Log

- 2026-05-08 — Story file authored from epics.md §Epic 4 / Story 4.1.
- 2026-05-08 — Implementation completed; quad gate clean (`test:unit` 140/140, `test:e2e` 20/20, `lint` clean, `lint:links` clean); status `review`.
- 2026-05-08 — Code review run with three parallel agents (Blind Hunter, Edge Case Hunter, Acceptance Auditor): 0 decision-needed; 10 patches applied (factual-tense doc comment, direct completed-row test for `isCapstoneSessionActive`, body simplification, CHECK tightening, NULL-row in forward-compat seed, `rowid DESC` tiebreaker, all-completed-sessions test, `CAPSTONE_STEP_NAMES` extraction, AC6 `completed:true` happy-path, `__resetDbCacheForTests` beforeEach); 6 deferred; 4 dismissed (architectural threat-model). `test:unit` now 143/143 (was 140); `test:e2e` 20/20; lint + lint:links clean. Status `done`.
