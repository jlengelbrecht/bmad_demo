# Story 3.2: `POST /api/progress` Route Handler

**Epic:** 3 — Trainee Progress State & Reset
**Story Key:** 3-2-progress-route-handler
**Status:** done

## Story

As a trainee clicking a "mark complete" button,
I want a `POST /api/progress` endpoint that validates my request and upserts a row in the progress table,
So that progress mutations have a single, validated, server-bound entry point.

## Acceptance Criteria

**AC1 — Route file shape**
- `src/app/api/progress/route.ts` exports an async `POST` handler.
- The body is parsed through `ProgressUpsertRequest` from Story 3.1 (`@/lib/db/schemas`).

**AC2 — Happy path**
- Valid request `{ kind: 'lesson', id: 'lesson-2', completed: true }` → row upserted with `completed_at` set to the current UTC ISO 8601 string; response `200` with body `{ ok: true }`.

**AC3 — Validation failure**
- Body that fails Zod validation (missing `kind`, unknown `kind` value, empty `id`, etc.) → response `400` with body `{ ok: false, error: 'Invalid request', details: <Zod flatten()> }`.
- No row is inserted or modified.

**AC4 — Server error**
- If the SQLite connection throws an unexpected error during upsert, the handler logs via `console.error(e)` (no logger library) and responds `500` with body `{ ok: false, error: 'Internal error' }`.
- Server-side stack traces are NOT exposed in the response body.

**AC5 — Import discipline**
- The handler imports from `@/lib/db/schemas` and `@/lib/db/progress-db` only.
- The handler does NOT use a Server Action — it is a Route Handler per architecture's "Plain `Response.json(...)`; Route Handlers for all mutations" lock.

## Tasks/Subtasks

- [x] **Task 1 — `src/app/api/progress/route.ts`** — async `POST(req)` only. Try/catch on `req.json()` surfaces malformed bodies as a Zod-shaped 400. `ProgressUpsertRequest.safeParse` gates the body; failure returns `parsed.error.flatten()` in `details`. Valid → `upsertProgress(parsed.data)` against the production singleton. DB exceptions caught: `console.error(err)`; 500 with bare `{ ok: false, error: 'Internal error' }`. Uses Web standard `Response.json(...)`. Imports exactly `@/lib/db/progress-db` and `@/lib/db/schemas`. No `NextResponse`, no `'use server'`.
- [x] **Task 2 — `src/app/api/progress/route.test.ts`** — 11 Vitest cases via `vi.mock("@/lib/db/progress-db")` so the route logic is exercised without touching the production DB:
  - happy lesson true (200, spy called with parsed entry)
  - happy lab false (200, spy called with `completed: false`)
  - malformed JSON (400, spy not called, error="Invalid request")
  - missing `kind` (400, fieldErrors.kind present)
  - unknown `kind` capstone-session (400, scope gate)
  - empty `id` (400)
  - whitespace-only `id` (400)
  - non-boolean `completed` (400)
  - DB throw (500, body has no stack/message leakage, `console.error` called once with the error)
  - import-discipline smoke: route.ts imports only `@/lib/db/schemas` + `@/lib/db/progress-db`
  - architecture-lock smoke: route.ts contains no `next/server` or `'use server'` strings
- [x] **Task 3 — Quad gate clean** — `test:unit` 86/86 (was 75), `test:e2e` 16/16, `lint` clean, `lint:links` clean.

### Review Findings

**Patches (resolved):**

- [x] [Review][Patch] **Architecture-lock test now targets the actual Server Action marker** — switched from substring `not.toContain("next/server")` to a regex `not.toMatch(/^\s*['"]use server['"]\s*;?\s*$/m)` that detects the `'use server'` directive specifically. Future refactors that legitimately type `NextRequest`/`NextResponse` won't be blocked.
- [x] [Review][Patch] **DB-error test loosened** — dropped the brittle `not.toContain("at ")` and `not.toContain("simulated SQLite failure")` substring checks. The exact-match `expect(await res.json()).toEqual({ ok: false, error: "Internal error" })` is the load-bearing assertion. `errorSpy` assertion loosened to `toHaveBeenCalled()` so a future "context-tagged" log call (`console.error('upsert failed', err)`) doesn't break the test.
- [x] [Review][Patch] **Spy typing tightened** — `upsertProgress as unknown as ReturnType<typeof vi.fn<typeof import("@/lib/db/progress-db").upsertProgress>>`. A future signature drift on `upsertProgress` will now fail the type-check.
- [x] [Review][Patch] **Module-surface contract guard added** — new test imports the route module via `* as routeModule` and asserts the exported handler list is exactly `["POST"]`. Future accidental `GET`/`PUT`/`DELETE`/etc handler additions will fail.
- [x] [Review][Patch] **`null` and array body negative tests added** — both go through `req.json()` cleanly, fail Zod, return 400 with `error: "Invalid request"`. Two new cases.

**Deferred:**

- [x] [Review][Defer] **`flatten().fieldErrors` echoes field names back to the client** — currently the schema only has `kind`, `id`, `completed` — no internal-only fields to leak. Revisit if `ProgressUpsertRequest` ever gains a field that shouldn't be enumerable. Source: blind.
- [x] [Review][Defer] **`console.error(err)` doesn't normalize non-Error throws** — defensive concern; rare in practice. Address if a real non-Error throw ever lands in logs. Source: edge.
- [x] [Review][Defer] **No NODE_ENV gate on `console.error`** — production deployment is local-only per architecture; Vercel-style log redaction is moot. Revisit if v1.1 introduces a hosted deployment target. Source: edge.
- [x] [Review][Defer] **Concurrent writes to same `(kind, id)` not documented** — better-sqlite3 is synchronous; second writer blocks the event loop. Last-writer-wins via upsert is semantically fine for a single-trainee local portal. Source: blind+edge.
- [x] [Review][Defer] **Multiline import statements would slip past the import-discipline test** — current line-oriented filter is naive. Switch to an AST parse if the import surface ever grows. Source: edge.

**Dismissed (architectural threat-model is local-only single-user — these don't apply):**

- "No CSRF / Origin check on state-changing POST" — architecture line 212: "Local-only; the threat model is 'the trainee runs their own clone.' We do not invent auth-shaped concerns." There is no logged-in victim because there is no login. CSRF is a non-issue.
- "No body-size cap → DoS" — Next.js App Router has a default body-size limit; in addition, the architecture's threat model is local-only. A user DoSing their own machine is their prerogative.
- "No `Content-Type` validation" — same threat model; no remote attacker, no preflight surface to exploit.
- "Race on concurrent upserts" — single-trainee local app per architecture; "concurrent" requests don't exist in normal use.
- "`upsertProgress` not awaited" — false positive from the blind reviewer who lacks project context: `upsertProgress` is synchronous (better-sqlite3 is synchronous; Story 3.1 returns `void`).
- "AC2 happy-path verifies the timestamp only via spy, not actual write" — auditor flagged at LOW. The behavior IS exercised end-to-end in Story 3.1's `progress-db.test.ts`. Layered seam, intentional.

## Dev Notes

**Architecture references** (`_bmad-output/planning-artifacts/architecture.md`):
- §"API & Communication Patterns": Two POST Route Handlers, period: `POST /api/progress` (this story) and `POST /api/capstone/save` (Epic 4). Reads happen directly in Server Components — no GET endpoint.
- §"API & Communication Patterns" line 222: "**Mutation idiom:** Route Handlers for all mutations. No Server Actions in v1." Lock applies here.
- §"API & Communication Patterns" line 223: "**Error model:** Plain `Response.json({ error: '…' }, { status: … })`; client surfaces a toast on non-2xx. No global error middleware; no error catalog."

**Why `vi.mock("@/lib/db/progress-db", ...)`:**
The route's production code-path calls `upsertProgress(parsed.data)` with no `db` arg, so it uses the production singleton. Tests should NOT touch the dev `data/progress.sqlite`. `vi.mock` swaps the module to a spy, isolating the route's logic from the storage layer.

**Why malformed JSON gets the same 400 shape as Zod failure:**
A trainee's "mark complete" button would never legitimately produce malformed JSON — it's either a buggy client or a hostile request. Treating both as "Invalid request" 400 is consistent with the architecture's "plain `Response.json` error model" + simplest-thing-that-works principle.

**Test approach:**
- Vitest covers the route handler directly via `new Request(...)` — no Next.js server boot needed, fast, deterministic.
- E2E coverage of the user-visible mark-complete flow lands with Story 3.3.

## Dev Agent Record

### Implementation Plan

1. Build the route handler — three branches (parse-fail, validate-fail, db-fail) each returning a clean envelope.
2. Test the handler directly via `new Request(...)` — no Next.js server boot, fast deterministic Vitest.
3. Use `vi.mock("@/lib/db/progress-db")` so tests don't touch the production singleton.

### Debug Log

- The route's `req.json()` was originally not in a try/catch — added one because malformed JSON would have thrown a stack into the route's outer try/catch and surfaced as a 500 instead of a 400. The 400 framing is more informative for clients.
- `Response.json` is the Web standard; chose it over `NextResponse.json` to honor the architecture's "minimal imports" principle and keep the route's import list to exactly `@/lib/db/schemas` + `@/lib/db/progress-db`.
- The `console.error` spy in the DB-error test must NOT swallow the call silently — the AC requires the handler to log; the spy asserts it was called once with the original error object.

### Completion Notes

**ACs satisfied:**
- AC1: `POST` exported async; body parsed through `ProgressUpsertRequest`.
- AC2: Vitest case asserts 200 + `{ ok: true }` on a valid lesson upsert; spy called with the parsed entry.
- AC3: Five validation paths all return 400 with `error: "Invalid request"` + `details: { formErrors, fieldErrors }` (from Zod `flatten()`); spy never called.
- AC4: Spy throws → 500 with bare `{ ok: false, error: "Internal error" }`. Body doesn't contain the error message or stack frames. `console.error` called once.
- AC5: Import-discipline test parses the route source and rejects any import that isn't `@/lib/db/schemas` or `@/lib/db/progress-db`. Architecture-lock test asserts no `next/server` import and no `'use server'` directive.

**Defensible deviations:**
- AC for malformed JSON wasn't enumerated explicitly in the story file's AC list, but the architecture's error-model lock applies: anything that reaches the handler with a body the schema can't parse is "Invalid request" (400). Treating malformed JSON the same way is consistent — matched up under the AC3 umbrella.

**No live UI consumer yet:**
The mark-complete button lands with Story 3.3. This story ships the server seam.

**Test approach note:**
- Vitest covers the handler directly (no Next.js dev server).
- E2E for the user-visible flow (click → POST → row persists → state shown) is Story 3.3 territory.

## File List

**New files:**
- `src/app/api/progress/route.ts`
- `src/app/api/progress/route.test.ts`
- `_bmad-output/implementation-artifacts/3-2-progress-route-handler.md` (this file)

## Change Log
- 2026-05-08 — Story file authored from epics.md §Epic 3 / Story 3.2
- 2026-05-08 — Implementation completed; quad gate clean; status `review`
- 2026-05-08 — Code review run: 0 decision-needed; 5 patches applied (architecture-lock test targets `'use server'` directive, DB-error test loosened, spy typing tightened, module-surface contract guard added, null/array body cases added); 5 deferred; 6 dismissed (CSRF / body-size / Content-Type / concurrent-write race all hit the architecture's "local-only single-user trusts-the-local-user" threat model wall). `test:unit` now 89/89 (was 86); `test:e2e` 16/16; lint clean; `lint:links` clean. Status `done`.
