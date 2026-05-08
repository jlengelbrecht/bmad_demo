# Story 3.1: SQLite progress store — connection, schema, and Zod types

**Epic:** 3 — Trainee Progress State & Reset
**Story Key:** 3-1-sqlite-progress-store
**Status:** done

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

### Review Findings

**Patches (resolved):**

- [x] [Review][Patch] **Schema path resolved via `import.meta.dirname`** — `connection.ts` and `progress-db.test.ts` both compute the schema path relative to the module, not `process.cwd()`. Invariant under any caller's working dir.
- [x] [Review][Patch] **HMR-safe singleton via `globalThis.__progressDb`** — Next.js dev edits no longer leak the previous file handle.
- [x] [Review][Patch] **Prepared statements cached per-connection** via a `WeakMap<Database, PreparedCache>`. Each `upsertProgress` / `getProgress` call now reuses a single `Statement` per connection.
- [x] [Review][Patch] **Schema CHECK** added: `CHECK (completed_at IS NULL OR completed_at LIKE '____-__-__T%Z')`. New Vitest case proves a literal `'banana'` insert is rejected.
- [x] [Review][Patch] **No-auth smoke tightened** — strips block comments, then line comments, then word-boundary-matches `\busers\b` and `\bsessions\b`. Banned-imports list expanded to 14 libraries (next-auth, @auth/core, all clerk variants, lucia, lucia-auth, iron-session, auth0, @auth0/nextjs-auth0, passport, better-auth, @supabase/auth-helpers-nextjs, firebase, firebase-auth).
- [x] [Review][Patch] **Zod `id` tightened** to `.trim().min(1).max(200)`. Two new test cases: whitespace-only id rejected; over-200-char id rejected.
- [x] [Review][Patch] **Test refactored** — busy-wait removed; the "no duplicate row" test now asserts what we actually care about (count == 1 + fresh ISO format on the surviving row).
- [x] [Review][Patch] **`createDb` close-on-failure** — schema `db.exec` and `pragma` are now in a try/catch that closes the connection before rethrowing.
- [x] [Review][Patch] **`.gitignore` extended** to `data/*.sqlite-wal` and `data/*.sqlite-shm` so WAL sidecar files don't leak into commits.

**Deferred:**

- [x] [Review][Defer] **Test-side production-singleton pollution risk** — current tests pass `db` arg explicitly, so `getDb()` is never called in tests. A future test author could forget. Defensive guard (throw from `getDb()` when `NODE_ENV='test'`) is heavy-handed; revisit if it actually bites. Source: edge.
- [x] [Review][Defer] **`getProgress` row cast trusts DB shape** — `as ProgressRecord | undefined` would silently lie if schema drifts. Schema is one table, one query shape; risk is low; Zod-on-read would land if the schema grows. Source: blind.
- [x] [Review][Defer] **`Date.now()` backward jump (NTP step-back)** — rare; would produce out-of-order ISO strings. Use a monotonic counter when sort-by-recency becomes load-bearing. Source: edge.
- [x] [Review][Defer] **No `(kind)` index for "list completed lessons" queries** — composite PK covers a prefix scan; revisit when Story 3.3 surfaces a query that's actually slow. Source: blind.
- [x] [Review][Defer] **`mkdirSync` doesn't handle ENOTDIR / EROFS gracefully** — production failure should bubble; wrapping for a clearer error message is polish. Source: edge.
- [x] [Review][Defer] **`synchronous` pragma not pinned** — default is FULL with WAL; if anyone flips to NORMAL the durability story changes. Pin explicitly when the matter actually surfaces. Source: blind.

**Dismissed:**

- "`ProgressKind` widens beyond Zod" — by design (capstone kinds are written through the Epic 4 harness, not `/api/progress`); architecture-aligned.
- "AC2 schema strengthens with `NOT NULL` on `kind`/`id`" — strictly stronger than AC; defensible improvement.
- "AC4 milliseconds in ISO timestamp" — story file's `(.sss)` clarification matches the implementation; ISO 8601 permits fractional seconds.
- "Singleton concurrency on first call" — Node is single-threaded for JS; createDb is synchronous; safe today.

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
- 2026-05-08 — Code review run: 0 decision-needed; 9 patches applied (schema-path module-relative, HMR-safe singleton, prepared-statement caching, schema CHECK, no-auth smoke tightening, Zod id constraints, test cleanup, close-on-failure, .gitignore WAL sidecars); 6 deferred; 4 dismissed. `test:unit` now 75/75 (was 72); `test:e2e` 16/16; lint clean; `lint:links` clean. Status `done`.
