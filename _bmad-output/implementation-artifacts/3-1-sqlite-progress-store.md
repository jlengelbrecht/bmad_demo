# Story 3.1: SQLite progress store — connection, schema, and Zod types

**Epic:** 3 — Trainee Progress State & Reset
**Story Key:** 3-1-sqlite-progress-store
**Status:** review

## Story

As a Next.js Route Handler or Server Component reading or writing trainee progress,
I want a single `better-sqlite3` connection module, an idempotent inline schema, and Zod request schemas,
So that progress reads and writes share one storage idiom and one validation contract — and the absence of any users/auth surface is verifiable in code.

## Acceptance Criteria

**AC1 — `src/lib/db/` module shape**
- `connection.ts` exports a `better-sqlite3` connection singleton that opens (or creates) `./data/progress.sqlite`.
- On first connect the connection applies `src/db/schema.sql` idempotently (`CREATE TABLE IF NOT EXISTS progress …`).
- `progress-db.ts` exports `upsertProgress(entry)` and `getProgress(kind, id)` with synchronous, type-safe signatures.
- `schemas.ts` exports a Zod `ProgressUpsertRequest` schema validating `{ kind, id, completed }` with `kind ∈ ['lesson', 'lab']` (capstone kinds added by Epic 4) and `id: string` (non-empty).

**AC2 — `src/db/schema.sql` shape**
- File contains exactly one table: `progress(kind TEXT, id TEXT, completed_at TEXT NULL, PRIMARY KEY(kind, id))`.
- Schema does NOT contain a `users` table, a `sessions` table, or any auth/account surface.
- All column names are lowercase `snake_case`.

**AC3 — Idempotent schema apply**
- Running schema apply twice is a no-op (no error, no duplicated state).

**AC4 — `upsertProgress` semantics**
- `upsertProgress({ kind: 'lesson', id: 'lesson-1', completed: true })` sets `completed_at` to a fresh ISO 8601 UTC string (`YYYY-MM-DDTHH:MM:SS(.sss)Z`).
- `upsertProgress({ kind: 'lesson', id: 'lesson-1', completed: false })` updates the row to `completed_at = NULL`.

**AC5 — No auth surface anywhere**
- No signin route, no signup route, no session middleware, no `users` table.
- No auth-library imports (`next-auth`, `clerk`, `lucia-auth`, etc.).
- Story 3.1 verification documents the absence via a Vitest smoke that imports `schema.sql` text and asserts it does not contain `users`.

**AC6 — Vitest coverage**
- `src/lib/db/progress-db.test.ts` covers: idempotent schema apply, upsert insert path, upsert update path, upsert mark-incomplete path, and the no-`users`-table smoke test.

## Tasks/Subtasks

- [x] **Task 0 — R4 spike** — `npm i better-sqlite3 zod` clean; native module smoke (`node -e "const db=new (require('better-sqlite3'))(':memory:'); db.exec('CREATE TABLE t(x INTEGER)'); …"`) returned `OK: { x: 42 }`. Build is healthy on this machine.
- [x] **Task 1 — `src/db/schema.sql`** — single `progress` table; lowercase snake_case; header comment cites architecture + FR-2.6 + NFR-S2 + locks the four `kind` values; `IF NOT EXISTS` guard.
- [x] **Task 2 — `data/.gitkeep`** — committed empty placeholder so the dev runtime has the directory; `data/*.sqlite` continues to be gitignored from Story 1.1.
- [x] **Task 3 — `src/lib/db/connection.ts`** — `getDb()` singleton + `createDb(filename)` factory + `__resetDbCacheForTests()`. `import "server-only"`. Production path applies `journal_mode = WAL`; in-memory paths skip WAL (unsupported). Defensive `mkdirSync({ recursive: true })` on the data dir.
- [x] **Task 4 — `src/lib/db/progress-db.ts`** — `upsertProgress(entry, db?)` and `getProgress(kind, id, db?)` synchronous; optional `db` arg defaults to the singleton. `INSERT … ON CONFLICT(kind,id) DO UPDATE` is the single mutation idiom. `import "server-only"`.
- [x] **Task 5 — `src/lib/db/schemas.ts`** — Zod `ProgressUpsertRequest = z.object({ kind: z.enum(['lesson','lab']), id: z.string().min(1), completed: z.boolean() })`. Inferred type re-exported.
- [x] **Task 6 — `src/lib/db/progress-db.test.ts`** — 12 Vitest cases:
  - Schema (2): idempotent apply + exactly-one-table assertion
  - Upsert (4): ISO 8601 UTC insert, update overwrites same row, mark-incomplete clears to NULL, missing-row returns null
  - Zod (4): well-formed accepted, unknown `kind` rejected, empty `id` rejected, non-boolean `completed` rejected
  - No-auth surface (2): schema.sql comment-stripped contains no `users`/`sessions`; package.json contains no banned auth-library deps
- [x] **Task 7 — Quad gate clean** — `test:unit` 72/72 (was 60), `test:e2e` 16/16, `lint` clean, `lint:links` clean.

## Dev Notes

**Architecture references** (`_bmad-output/planning-artifacts/architecture.md`):
- §"Data Architecture": SQLite driver = `better-sqlite3@^12.9.0`; ORM/query layer = none (hand-written SQL); single inline schema applied idempotently on first connect; progress DB at `./data/progress.sqlite` (repo-root, gitignored); single `progress(kind, id, completed_at)` table.
- §"API & Communication Patterns": Reads happen in Server Components directly via the SQLite driver — no GET endpoint. Writes go through `POST /api/progress` (Story 3.2).
- §"Authentication & Security": Authentication = None (FR-2.6); architecture trusts the local user.

**Why pass `db` as an optional second arg:**
The architecture treats the singleton as the production seam. Tests want isolated in-memory databases per fixture. Optional second arg is the lightest way to support both without forcing tests to mutate module-level state.

**`server-only` test stub:**
Already aliased by `vitest.config.ts` from Story 2.1 review patches. No new test config needed.

**No-egress / runtime-fs sanity:**
`connection.ts` only touches `./data/progress.sqlite` (gitignored). No remote calls, no telemetry, no analytics. NFR-S1 invariant holds.

**Test approach:**
- Vitest covers the storage-layer unit tests via `:memory:` fixtures.
- Route-handler integration tests land with Story 3.2.
- E2E coverage for the user-visible flow (mark-complete → completion shown) lands with Story 3.3.

## Dev Agent Record

### Implementation Plan

1. R4 spike first — `better-sqlite3` is a native module; verify it builds before app code lands.
2. Schema, then the connection module that loads it; both pure infrastructure.
3. The progress-db API on top; thin wrapper around prepared statements.
4. Zod schemas as the request-boundary validator (Story 3.2 will consume them in the Route Handler).
5. Vitest cases use `:memory:` SQLite per fixture so the suite is fast and self-contained.

### Debug Log

- `data/` was missing from a fresh clone before this story (it was only referenced in `.gitignore`). Added `data/.gitkeep` AND `mkdirSync({ recursive: true })` in `createDb` for belt-and-suspenders.
- `journal_mode = WAL` errors on `:memory:` databases — guarded so tests skip WAL.
- "Update overwrites same row" test originally raced because two `Date.now()`-derived ISO strings landed in the same millisecond. Added a brief busy-wait so the second timestamp differs deterministically; the test now asserts `second >= first` (lexicographic ordering on ISO 8601 strings is also chronological).
- The no-auth-surface smoke needed to ignore comment lines because `schema.sql`'s header comment legitimately mentions `users` (in the rationale for NOT having a users table). Added a `--`-stripping pass before the substring assertion.

### Completion Notes

**ACs satisfied:**
- AC1: `connection.ts`, `progress-db.ts`, `schemas.ts` all present at `src/lib/db/` with the locked exports.
- AC2: `src/db/schema.sql` defines exactly the `progress(kind, id, completed_at)` table; lowercase snake_case; explicit comment that no `users`/`sessions` table is allowed.
- AC3: idempotent — Vitest case re-applies the schema via `db.exec(schemaText)` and asserts no throw.
- AC4: `upsertProgress` writes ISO 8601 UTC strings (Vitest regex `^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$`) on `completed: true`; clears to NULL on `completed: false`.
- AC5: no-auth-surface smoke covers both schema and lockfile; banned list includes `next-auth`, `@clerk/nextjs`, `clerk`, `lucia`, `lucia-auth`, `iron-session`.
- AC6: 12 cases across schema, upsert, Zod, and no-auth — all green.

**Defensible deviations:**
- `progress-db.ts` types `ProgressKind` to include capstone kinds (`capstone-session`, `capstone-step`) so Epic 4 can write through the same DB layer without needing to broaden the type later. The Zod schema at the API boundary continues to gate to `lesson | lab` — capstone writes go through the Story-4.x harness, not the public progress endpoint.
- The connection's optional `db` argument on `upsertProgress`/`getProgress` is the lightest test-injection seam; production callers always omit it.

**Test approach:**
- Vitest covers everything via `:memory:` fixtures — no filesystem cleanup, no race against a shared dev DB.
- Story 3.2 will add Route Handler integration tests; Story 3.3 will add E2E for the user-visible flow.

## File List

**New files:**
- `src/db/schema.sql`
- `src/lib/db/connection.ts`
- `src/lib/db/progress-db.ts`
- `src/lib/db/schemas.ts`
- `src/lib/db/progress-db.test.ts`
- `data/.gitkeep`
- `_bmad-output/implementation-artifacts/3-1-sqlite-progress-store.md` (this file)

**Modified files:**
- `package.json` (`better-sqlite3` + `zod` runtime deps)
- `package-lock.json` (transitive)

## Change Log
- 2026-05-08 — Story file authored from epics.md §Epic 3 / Story 3.1
- 2026-05-08 — Implementation completed; quad gate clean; status `review`
