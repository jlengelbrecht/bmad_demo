# Story 4.3: `/capstone` overview route with resume-or-start

**Epic:** 4 — Capstone Harness
**Story Key:** 4-3-capstone-overview
**Status:** ready-for-dev

## Story

As a trainee returning to the portal partway through a capstone,
I want `/capstone` to either resume my most recent in-progress session or offer to start a new one,
So that I never have to remember a session id and never accidentally clobber prior work.

## Acceptance Criteria

**AC1 — Server Component shape**
- `src/app/capstone/page.tsx` is a Server Component (no `'use client'`).
- Reads `searchParams.session` (Next.js 15+ async `searchParams` Promise pattern, matching the existing `/lessons/[slug]/page.tsx` conventions in this codebase).
- Branches on `session` query parameter:
  - If `?session=<id>` is present and matches `CAPSTONE_SESSION_ID` regex → load that specific session via `getCapstoneSessionById(id)`. If not in DB, the page calls Next.js `notFound()`.
  - Otherwise → load the most recent session via `getRecentCapstoneSession()` from Story 4.1.
- The page returns one of three view branches: **no-session**, **in-progress**, or **complete**.

**AC2 — No prior session ("Start your capstone")**
- When `getRecentCapstoneSession()` returns `null` (and no `?session=` query param), the page renders a "Start your capstone" panel with:
  - A short scope explainer: "You'll produce 1 product brief, 1 epic, 2 user stories, and 1 architecture decision record."
  - A `<StartCapstoneButton>` client component that, on click:
    1. Generates a fresh compact-UTC timestamp (`new Date()` formatted as `YYYYMMDDTHHMMSSZ`).
    2. POSTs `{ kind: 'capstone-session', id: <ts>, completed: false }` to `/api/progress`. (`completed: false` upserts the row with `completed_at = NULL`, marking it active per Story 4.1's encoding.)
    3. On 200, navigates to `/capstone/brief?session=<ts>` via `useRouter().push(...)`. The session directory `_bmad-output/capstone/<ts>/` is created lazily on the first artifact save (Story 4.2's `writeCapstoneArtifact` already does `mkdir({ recursive: true })`); explicit start-time directory creation is **defensibly deferred** to first-save (see Dev Notes — keeps the architecture's "two POST endpoints, period" lock intact).
    4. On non-2xx, surfaces an inline error via `<span role="status" aria-live="polite">` and re-enables the button (parallel to Story 3.3's mark-complete error UX).

**AC3 — In-progress session ("Resume your capstone")**
- When the loaded session has `completedAt === null`, the page renders a "Resume your capstone — last activity <ISO date>" panel with:
  - The session id surfaced as a small `<code>` block so the trainee can correlate it with the on-disk directory.
  - A "Continue with <step>" link pointing to `/capstone/<step>?session=<id>` where `<step>` is the result of `nextIncompleteStep(...)` — see AC5.
  - A small ordered list of the five canonical steps with completion status (each step rendered as `<step-name>` + a checkmark or "—" indicator).

**AC4 — Complete session ("Your last capstone")**
- When the loaded session has `completedAt !== null`, the page renders a "Your last capstone — <ISO date>" panel with:
  - A `<code>` block showing `_bmad-output/capstone/<session-id>/` so the trainee knows where to find the artifacts.
  - The same five-step list as AC3 (all should be ✓ for a completed session).
  - A `<StartCapstoneButton>` to begin a fresh session (creates a new compact-UTC id and navigates to `/capstone/brief?session=<new-id>`).

**AC5 — Next-incomplete-step computation**
- `src/lib/capstone/steps.ts` exports:
  - `CAPSTONE_STEP_ORDER: readonly CapstoneStepName[]` set to `['brief', 'epic', 'story-1', 'story-2', 'adr']` (canonical order — single source of truth consumed by Story 4.3 + Story 4.4 + the progress-completion check Story 4.4 introduces).
  - `nextIncompleteStep(completedSteps: ReadonlySet<CapstoneStepName>): CapstoneStepName | null` — walks `CAPSTONE_STEP_ORDER` and returns the first step not in the set, or `null` if all are complete.
- `nextIncompleteStep` is a pure function tested in isolation (`steps.test.ts`).
- The page derives `completedSteps` from `listCompleted('capstone-step')` filtered to ids that start with `<session-id>/` and suffix-stripped to bare step names. A small helper `completedStepsForSession(sessionId, db?)` lives in `progress-db.ts` so the SQL stays in the storage layer (composes the existing `listCompleted` prepared statement; no new prepared statement needed).

**AC6 — Historical session via `?session=`**
- A request to `/capstone?session=<existing-id>` renders that session's overview using the same complete/in-progress branching as AC3/AC4.
- A request to `/capstone?session=<unknown-or-malformed-id>` calls Next.js `notFound()` (renders the existing global 404 page from Story 1.x).
- Malformed session id (failing `CAPSTONE_SESSION_ID` regex) also `notFound()`s — never reaches the DB.

**AC7 — Keyboard accessibility**
- The primary call-to-action (Start / Resume / Start-new) is the first focusable element in the panel after the page header — reachable via Tab.
- The action is operable via Enter (default `<button>` and `<a>` semantics — no custom interactivity required).
- Each step in the AC3/AC4 step list with completion state has an accessible label (e.g. `aria-label="brief, completed"` or `aria-label="story-1, not yet"`).

**AC8 — Architecture compliance**
- The page is a Server Component. The only client component is `<StartCapstoneButton>` (in `src/app/capstone/start-capstone-button.tsx`, co-located per architecture line 381's "rule of three" — this is the second client component after `<LessonCompleteButton>`; promotion to `src/components/` happens when Story 4.4 adds the third).
- `<StartCapstoneButton>` does NOT import from `@/lib/db/*`, `@/lib/capstone/*`, or `server-only`. It uses `fetch('/api/progress')` and `useRouter` from `next/navigation`.
- The page renders inside the existing `<SiteHeader>` layout (no layout changes).

**AC9 — Vitest coverage**
- `src/lib/capstone/steps.test.ts`:
  - `CAPSTONE_STEP_ORDER` has exactly 5 entries in the documented order.
  - `nextIncompleteStep(new Set([]))` returns `'brief'`.
  - `nextIncompleteStep(new Set(['brief']))` returns `'epic'`.
  - `nextIncompleteStep(new Set(['brief', 'epic', 'story-1']))` returns `'story-2'`.
  - `nextIncompleteStep(new Set([...all five]))` returns `null`.
  - Out-of-order input: `nextIncompleteStep(new Set(['epic']))` returns `'brief'` (skips ahead based on order, not input).
- `src/lib/db/progress-db.test.ts` (extended):
  - `getCapstoneSessionById('20260507T143022Z')` on a fresh DB returns `null`.
  - `getCapstoneSessionById(id)` on a DB seeded with that session returns `{ id, completedAt: null }` for an active session.
  - `getCapstoneSessionById(id)` returns `{ id, completedAt: <iso> }` for a completed session.
  - `getCapstoneSessionById('non-existent')` returns `null`.
  - `completedStepsForSession('20260507T143022Z', db)` returns an empty `Set` for a session with no step rows.
  - With session `'A'` having steps `'brief'` + `'epic'` saved and session `'B'` having step `'story-1'`, `completedStepsForSession('A', db)` returns `Set(['brief', 'epic'])` and `completedStepsForSession('B', db)` returns `Set(['story-1'])`.
- `src/app/capstone/start-capstone-button.test.ts`:
  - Source-string smoke: `'use client'` directive present.
  - Source-string smoke: no imports from `@/lib/db/*`, `@/lib/capstone/*`, `better-sqlite3`, or `server-only`.
  - Source-string smoke: file references `fetch("/api/progress")` and `useRouter`.

**AC10 — Playwright E2E**
- New spec `tests/e2e/capstone-overview.spec.ts`:
  - **No-session branch** — fresh test DB has no capstone-session rows; visit `/capstone`; assert the "Start your capstone" panel and scope text are visible; assert the start button is keyboard-focusable; click; assert navigation to `/capstone/brief?session=<some-compact-utc>` (URL match against `^/capstone/brief\?session=\d{8}T\d{6}Z$`); assert a row was inserted (read-back via the db isolation seam — alternatively, navigate to `/capstone` and assert the resume panel now shows up).
  - **Resume branch** — seed a session row with `completed_at IS NULL` via `BMAD_DATABASE_PATH` (or a Playwright global-setup helper that exec's a SQL line); visit `/capstone`; assert the resume panel renders; assert the "Continue with brief" link points to `/capstone/brief?session=<id>`.
  - **Complete branch** — seed a session row with a non-NULL `completed_at`; visit `/capstone`; assert the "Your last capstone" panel renders with the on-disk path code-block; assert the start-new button is present.
  - **Historical 404** — visit `/capstone?session=20990101T000000Z` (well-formed but absent); assert the 404 page renders with "← Back to home".
  - **Malformed session 404** — visit `/capstone?session=not-a-timestamp`; assert 404 (no DB query attempted because the regex gates upstream).
- Each test resets state in afterEach so reruns are deterministic.

## Tasks/Subtasks

- [ ] **Task 1 — `src/lib/capstone/steps.ts` (AC5)** — Pure module. Export `CAPSTONE_STEP_ORDER`, `nextIncompleteStep`, and re-export `CapstoneStepName` from `paths.ts`. No `server-only` directive (this module is consumed by the Story 4.4 client component too).

- [ ] **Task 2 — `src/lib/capstone/steps.test.ts` (AC9)** — 6 Vitest cases for `nextIncompleteStep` + a smoke that `CAPSTONE_STEP_ORDER` matches the AC5 list verbatim.

- [ ] **Task 3 — Storage helpers (AC9)** — Extend `progress-db.ts`:
  - Add `getCapstoneSessionById(id, db?)` — uses a new prepared statement `SELECT id, completed_at AS completedAt FROM progress WHERE kind = 'capstone-session' AND id = ?`. Cache it in `PreparedCache`.
  - Add `completedStepsForSession(sessionId, db?)` — composes `listCompleted('capstone-step', db)` + filter rows where `id.startsWith(`${sessionId}/`)` + map to suffix. Returns `ReadonlySet<CapstoneStepName>`. (No new prepared statement; reuses Story 3.3's `listCompleted`.)
  - Both functions use the existing optional `db` arg pattern.

- [ ] **Task 4 — Storage tests (AC9)** — Add cases listed in AC9 to `src/lib/db/progress-db.test.ts`. Use `:memory:` fixtures. Seed via direct `db.prepare(INSERT INTO progress ...).run(...)` calls (bypass the typed helpers since `kind='capstone-session'` and `kind='capstone-step'` ids that fail the typed Zod aren't relevant here — the helpers are exercised on already-typed-valid data).

- [ ] **Task 5 — `src/app/capstone/start-capstone-button.tsx` (AC2, AC4, AC8)** — Client component. `'use client'`. Props: `onStartedHref?: string` (defaults to `/capstone/brief`). On click:
  - Compute `id = compactUtcNow()` — a tiny utility either in this file or in `src/lib/capstone/utc.ts` (decide based on rule-of-three: only one consumer today, so inline).
  - `setIsSaving(true)`; `fetch('/api/progress', { method: 'POST', body: JSON.stringify({ kind: 'capstone-session', id, completed: false }), headers: { 'content-type': 'application/json' } })`.
  - On 200: `router.push(`${onStartedHref}?session=${id}`)`.
  - On non-2xx: revert `isSaving`; render error in `<span role="status" aria-live="polite">`.
  - Use `useRef`-based in-flight guard (Story 3.3 pattern) so same-tick double-clicks don't double-POST.

- [ ] **Task 6 — `src/app/capstone/start-capstone-button.test.ts` (AC9)** — Source-string smoke: `'use client'` directive, no `@/lib/db/*` / `@/lib/capstone/*` / `better-sqlite3` / `server-only` imports, references `fetch("/api/progress")` and `useRouter`. Mirror the Story 3.3 lesson-complete-button.test.ts pattern.

- [ ] **Task 7 — `src/app/capstone/page.tsx` (AC1, AC2, AC3, AC4, AC6, AC7, AC8)** — Server Component. Reads `searchParams: Promise<{ session?: string }>`. Branches:
  ```
  const { session } = await searchParams;
  if (session) {
    if (!CAPSTONE_SESSION_ID.test(session)) notFound();
    const row = getCapstoneSessionById(session);
    if (!row) notFound();
    // render in-progress or complete branch based on row.completedAt
  } else {
    const row = getRecentCapstoneSession();
    if (!row) {
      // render no-session branch with <StartCapstoneButton />
    } else {
      // render in-progress or complete branch
    }
  }
  ```
  Render the step list in a small inline helper (no extracted component yet — rule of three not met; Story 4.4 may move it to a shared component if both pages render it). Use plain `<ol>` + `<li>` with `aria-label` per item. Link "Continue with <step>" uses `nextIncompleteStep(completedStepsForSession(row.id))`.

- [ ] **Task 8 — Playwright e2e (AC10)** — New spec `tests/e2e/capstone-overview.spec.ts` with the 5 cases from AC10. State seeding: write a small helper that opens the e2e SQLite (via `BMAD_DATABASE_PATH`) using `better-sqlite3` directly inside the test process and runs raw INSERTs. Tests reset state in afterEach by deleting the seeded rows. Add the spec to the existing Playwright config (no config change needed; auto-discovered).

- [ ] **Task 9 — Site-header forward link (walkability)** — Add a small "Capstone" link to the existing `<SiteHeader>` so the trainee can find the route from any page (today there's no entry point to `/capstone`). Mirrors the "← Begin Lesson 1" walkability pattern from Story 1.x. Update the existing site-header e2e test if necessary; the smoke from earlier polish work should auto-cover.

- [ ] **Task 10 — Quad gate clean** — `npm run test:unit`, `npm run test:e2e`, `npm run lint`, `npm run lint:links` all green.

### Review Findings

_(populated after code review)_

**Patches:** _(pending)_

**Deferred:** _(pending)_

**Dismissed:** _(pending)_

## Dev Notes

**Architecture references** (`_bmad-output/planning-artifacts/architecture.md`):
- Line 234 — capstone resume mechanism (FR-3.7) verbatim: query most-recent capstone-session by `id DESC`; if `completed_at IS NULL` → resume; else → offer to start new (with a fresh UTC id). Multiple historical sessions accessible via `?session=<timestamp>`.
- Line 222 — "Two POST Route Handlers, period." There is no third "start session" endpoint; the start action POSTs to `/api/progress` (with `kind=capstone-session, completed=false`). This is the architecture's intended use of `/api/progress`.
- Line 229 — Server Components by default; client components only for interactivity. The page is server-rendered; only the start button is client.
- Line 381 — Client components co-locate with their page; promote to `src/components/` only after the rule of three. `<StartCapstoneButton>` is the second client component (after `<LessonCompleteButton>` from Story 3.3); Story 4.4's `<CapstoneStepForm>` will be the third and trigger the rule-of-three relocation.

**Defensible deviation: directory creation deferred to first save**
- Architecture line 234 says start-action "creates `_bmad-output/capstone/<that-timestamp>/`." Architecture line 222 locks the API surface to "Two POST Route Handlers, period." Inserting a third endpoint just to mkdir would violate the lock; extending `/api/progress` to also do filesystem I/O would conflate two concerns. The simplest reconciliation: directory creation is lazy — `writeCapstoneArtifact` (Story 4.2) already does `mkdir({ recursive: true })` on the session dir, so the first artifact save creates the dir. The trainee's path through Story 4.3 → Story 4.4 → first save is short (one click → one navigate → one form submit), so the directory existing only after first save isn't a UX gap. Document this in Dev Agent Record → Defensible Deviations.
- Alternative considered: have the start-button client component fire a `POST /api/capstone/save` with empty content. Rejected — that creates a file with `<step>` semantics from the start, which the AC3 step list would then mis-render as "brief, completed."

**Why client-side compact-UTC generation:**
- Server-side ID generation would normally be safer (no client-clock skew). But: (a) architecture forbids Server Actions; (b) `/api/progress` would need to invent a `id?: undefined → server-generates` path that's a different shape from its current contract; (c) this is a single-user local app — clock-drift between client and server is non-existent (they're the same machine). Inline `new Date().toISOString()` + format-strip is the right answer.
- Format conversion: `new Date().toISOString()` produces `'2026-05-08T15:23:45.789Z'`; we strip dashes, colons, milliseconds, and the period to land on `'20260508T152345Z'`. Pure string manipulation; no library needed.

**Why `searchParams` is async (Promise) in this codebase:**
- Next.js 15+ migrated `searchParams` and `params` to async Promises. The existing `/lessons/[slug]/page.tsx` already uses this pattern. New pages must match. (Verify by reading the existing route file before implementing — see Task 7's pattern reference.)

**Why `notFound()` for both unknown and malformed session ids:**
- Treating malformed ids as 404 instead of 400 is the kinder UX — a trainee who fat-fingers a URL gets the same "page doesn't exist" experience as one who deep-links a session that's been reset. The Server Component just calls Next.js `notFound()` which renders the global not-found.tsx from Story 1.x — no custom error page needed.
- The regex gate happens before the DB query, so malformed ids don't add database load.

**Why `completedStepsForSession` reuses `listCompleted` instead of a new prepared statement:**
- `listCompleted('capstone-step')` returns the ids of all completed step rows across all sessions. A given trainee will have a small number of capstone sessions (most users one or two); filtering in JavaScript by `startsWith(<sessionId> + '/')` is O(n) over a tiny n. A dedicated prepared statement would save microseconds at the cost of a new cache entry. Rule of three: if a third caller wants per-session step listings, then we'd extract.

**Step-list rendering: no extracted component yet:**
- AC3 + AC4 both render a list of the five steps with completion indicators. Two surfaces today; rule of three says don't extract. Keep both inline in `page.tsx` initially. Story 4.4 may add a third surface (the per-step page's "where you are" indicator); if so, that story extracts.

**Why a "Capstone" link in the site header (Task 9):**
- Today the trainee has no way to find `/capstone` from the home page or any audience page. Adding the link is a tiny walkability fix that should land with the route, not as a separate cleanup story. Same shape as the "Begin Lesson 1 →" forward link added in Story 1.x.

**Edge case: `getRecentCapstoneSession` ordering vs. clock drift:**
- The `id DESC` sort works because the compact-UTC format is lexicographically chronological. If the trainee's machine clock is set wildly wrong (e.g. system date set to 1970), they could insert a session that sorts before existing sessions. This is a known limitation of "use the timestamp as the primary key" — it's the simplest correct thing in the local-only single-user model. Document in Dev Notes; not a Story 4.3 problem.

**No architecture-doc edit:**
- Architecture line 234 already specifies the resume mechanism; this story implements it. The defensible deviation on directory creation gets captured in Dev Agent Record → Completion Notes, not a doc edit.

**Test approach:**
- Vitest covers the pure logic (`nextIncompleteStep`, storage helpers).
- Playwright covers the page rendering branches end-to-end (no Server Component test layer per architecture line 254).
- Source-string smoke for `<StartCapstoneButton>` covers the `'use client'` + import-discipline contract (parallel to Story 3.3's `<LessonCompleteButton>` smoke).

**No-egress / runtime-fs sanity:**
- The page reads SQLite (`getRecentCapstoneSession`, `getCapstoneSessionById`, `completedStepsForSession`). No new fs writes. The start button POSTs to a same-origin endpoint. NFR-S1 invariant holds.

## Dev Agent Record

### Implementation Plan

1. **Steps module first** — Task 1 lands `CAPSTONE_STEP_ORDER` + `nextIncompleteStep` so subsequent code has the canonical order to consume.
2. **Steps tests** — Task 2 locks the contract.
3. **Storage helpers** — Tasks 3 + 4 land the data-flow primitives the page consumes.
4. **Start button** — Tasks 5 + 6 land the client component; smoke tests it without React-component testing (per architecture's "no React-component tests at v1").
5. **Page** — Task 7 wires the three branches.
6. **E2E** — Task 8 covers the user-visible flow.
7. **Walkability link** — Task 9 closes the navigation gap.
8. **Quad gate** — Task 10 closes the loop.

### Debug Log

_(populated during implementation)_

### Completion Notes

_(populated during implementation)_

## File List

_(populated during implementation)_

## Change Log

- 2026-05-08 — Story file authored from epics.md §Epic 4 / Story 4.3.
