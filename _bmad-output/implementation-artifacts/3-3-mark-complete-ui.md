# Story 3.3: Mark-complete client UI for lessons and labs, with completion state shown in lesson navigation

**Epic:** 3 — Trainee Progress State & Reset
**Story Key:** 3-3-mark-complete-ui
**Status:** done

## Story

As a trainee finishing a lesson or running a lab,
I want a clearly labeled "Mark complete" button on each lesson and lab page, and I want the lesson sequential-navigation strip to indicate which lessons I've already completed,
So that I can track my position through the curriculum across visits.

## Acceptance Criteria

**AC1 — Initial-render button (not yet completed)**
- On a lesson page where the lesson is NOT marked complete, a "Mark complete" button is visible.
- Button has an accessible label and is keyboard-focusable.

**AC2 — Click → POST + optimistic update + revert on failure**
- Click fires `fetch('/api/progress', { method: 'POST', body: JSON.stringify({ kind: 'lesson', id: <slug>, completed: true }) })`.
- During the request, the button is disabled with a pending state (`isSaving = true`).
- The local UI optimistically reflects "Completed" before the response arrives.
- On a non-2xx response, the local state reverts and a toast/inline error surfaces.

**AC3 — Server-side persistence + button toggle**
- After marking complete and revisiting the same route, the page renders showing the lesson as completed (Server Component reads via `progress-db`).
- Button toggles to "Unmark complete" (or equivalent toggle label).

**AC4 — LessonNav reflects completion**
- On any lesson page, completed lessons in the sequential nav strip carry a checkmark icon + accessible label "completed".
- The signal is conveyed by both icon AND a non-color cue (the checkmark serves both).

**AC5 — Lab page reuses the same component**
- `/labs/[slug]` renders a "Mark this lab as run" button using the same component.
- Click posts `{ kind: 'lab', id: <slug>, completed: true }` with the same optimistic semantics.

**AC6 — Component placement and import discipline**
- Client component co-located with the lesson page: `src/app/lessons/[slug]/lesson-complete-button.tsx`.
- Marked `"use client"`.
- Does NOT import from `src/lib/db/*` (only `fetch`).
- Lab page imports the same component (rule-of-three: two surfaces today; promote to `src/components/` when capstone-step adds the third in Epic 4).

## Tasks/Subtasks

- [x] **Task 1 — `listCompleted(kind)` added to `progress-db.ts`** — single SELECT, prepared-statement-cached, returns `ReadonlySet<string>`. Three new Vitest cases pin the contract (empty / mixed kinds / mark-incomplete excluded).
- [x] **Task 2 — `BMAD_DATABASE_PATH` env override** — `getDb()` honors the env var when set; `playwright.config.ts` `webServer.env` sets it to `./data/e2e-progress.sqlite`. The default path falls back to `./data/progress.sqlite` for production. **Surfaced regression**: the Story 3.1 review patch using `import.meta.dirname` for `SCHEMA_PATH` broke under Turbopack (Next.js v16 dev) which doesn't populate it. Restored a fallback chain: prefer `import.meta.dirname` (works under Vitest), fall back to `process.cwd()` (works under Turbopack).
- [x] **Task 3 — `lesson-complete-button.tsx`** — `"use client"`; optimistic update, revert on non-2xx OR network error, friendly error message via `<span role="status" aria-live="polite">`. Source-string smoke at `lesson-complete-button.test.ts` asserts the directive is present, no `@/lib/db/*` imports, no `server-only`/`better-sqlite3`/`node:*` imports, and the component uses `fetch("/api/progress")`.
- [x] **Task 4 — Lesson route wired** — `getProgress("lesson", slug)` and `listCompleted("lesson")` read server-side; `<LessonCompleteButton>` rendered between `<Markdown>` and the bottom `<LessonNav>`. Both `<LessonNav>` instances receive `sequence` + `completedSlugs`.
- [x] **Task 5 — Lab route wired** — same shape with `kind="lab"`, `label="Mark this lab as run"`, `completedLabel="Lab marked run ✓"`. Imports the same component module from `@/app/lessons/[slug]/lesson-complete-button` (rule of three; relocates to `src/components/` when Epic 4 adds the third surface).
- [x] **Task 6 — `LessonNav` extended with numbered-pill row** — replaces the old `<p>Lesson N of M</p>` text with an `<ol>` of 6 numbered links. Current lesson is bold zinc-on-white (light) / zinc-on-black (dark); completed lessons carry an emerald border + `✓` glyph + `aria-label="…, completed"`; not-started lessons carry zinc-300 border. The `<ol>`'s own `aria-label="Lesson N of 6"` preserves the screen-reader signal that AC2 lessons.spec.ts originally asserted on. The keyboard-tab-order test was updated: header → top-Prev → first pill (lesson 1).
- [x] **Task 7 — `tests/e2e/mark-complete.spec.ts`** — 4 Playwright cases: lesson click→toggle→reload→toggle, lab click→toggle→reload→toggle, LessonNav pill shows "completed" state after marking lesson 1, optimistic revert via `page.route()` stubbing a 500. Each test resets state to baseline at the end. A `clickAndWaitForPersist` helper waits for the actual `/api/progress` POST response before downstream assertions, so the navigation/reload doesn't race the write.
- [x] **Task 8 — Quad gate clean** — `test:unit` 96/96 (was 89), `test:e2e` 20/20 (was 16), `lint` clean, `lint:links` clean.

### Review Findings

**Patches (resolved):**

- [x] [Review][Patch] **Prop-sync via `key` on the parent** — instead of a `useEffect` setState pattern (forbidden by `react-hooks/set-state-in-effect`), each parent passes `key={`<kind>:<id>:<initialCompleted>`}` so React remounts when server-side state changes. Cleaner than the original useEffect proposal. Helper `lessonCompleteButtonKey` exported for future callers.
- [x] [Review][Patch] **`useRef` in-flight guard** — `inFlight.current` flips synchronously. Same-tick double-clicks no longer fire two POSTs.
- [x] [Review][Patch] **AbortController + cleanup** — in-flight fetch aborts on unmount. Catch handler returns silently on `AbortError` so no setState fires on the unmounted component.
- [x] [Review][Patch] **WCAG 2.5.3 fix** — unmarked button's accessible name IS the visible text (no `aria-label` override). Marked button uses `aria-label="<visible text> — click to unmark <kind> as <run|complete>"` so voice-control users can say "click completed" or "click lab marked run" and it matches.
- [x] [Review][Patch] **`aria-describedby` linking button to status span** — `useId()` produces a stable id; the `<span role="status">` carries that id; the button references it. SR users now hear the status announcement bound to the action.
- [x] [Review][Patch] **Pill aria-label + visual signal for current+completed** — aria-label now lists both states ("…, current, completed") so the SR signal is preserved. Visually, the current pill grows an `ring-2 ring-emerald-500` when it's also completed, so glance-readers see both states without guessing.
- [x] [Review][Patch] **`clickAndWaitForPersist` matches `kind`+`id`** — the predicate inspects `request.postDataJSON()` so a stray POST from another caller (or a future feature) can't accidentally satisfy the wait.

**Deferred:**

- [x] [Review][Defer] **AC2 "toast" → inline `<span role="status">`** — the original epics.md AC says "a toast surfaces an error message"; the implementation uses an inline span with `role="status"` `aria-live="polite"`. Architecture's "smallest interactive surface" lock argues against a separate toast component; the inline span delivers the same SR signal. Story file documents this as a defensible deviation. Source: auditor (LOW). Acceptable.
- [x] [Review][Defer] **Discarded error body on non-2xx** — handler returns Zod-flattened details, but the client ignores them and shows a generic "Couldn't save" message. Could parse `details.fieldErrors` for richer UX. Defer until real UX feedback identifies this as a friction point. Source: edge.
- [x] [Review][Defer] **`fetch` follows redirects by default** — a misconfigured proxy could redirect `/api/progress` to a different URL that returns 200, masking a missed write. Set `redirect: 'error'`. Defer per the architecture's "local-only, no proxy" threat model — but worth landing if/when a hosted target appears. Source: edge.
- [x] [Review][Defer] **`SCHEMA_PATH` Turbopack fallback branch has no direct unit test** — covered transitively by Playwright e2e (any lesson/lab page renders go through `getDb`). Direct unit test would require mocking `import.meta.dirname` which is brittle. Source: blind+auditor (LOW).
- [x] [Review][Defer] **Module-level `DEFAULT_DB_PATH` evaluated at import time** — env var must be set before module load. Playwright wires it via `webServer.env`, so it's set before the dev server boots. Defer concrete env-var-at-import-time guards. Source: blind.
- [x] [Review][Defer] **Emerald color contrast on pill text/bg** — `text-emerald-800` on `bg-emerald-50` is ~5.1:1 (passes AA, borderline for AAA); dark variant is alpha-composited and harder to predict. Epic 5's axe-core run is the right gate. Source: blind.
- [x] [Review][Defer] **Comma-in-lesson-title aria-label split** — current 6 titles have no commas; future-proofing. Source: edge.
- [x] [Review][Defer] **`expect(res.status()).toBe(200)` brittle if route ever returns 201** — current handler always returns 200; defer until/unless that changes. Source: blind.

**Dismissed:**

- "No CSRF protection on state-changing POST" — same architecture threat model as Story 3.2 (local-only single-user trusts-the-local-user); not a concern in this product. Auth-shaped concerns aren't part of v1.

## Dev Notes

**Architecture references** (`_bmad-output/planning-artifacts/architecture.md`):
- §"API & Communication Patterns": all mutations through Route Handlers; `POST /api/progress` is the single mutation endpoint for progress.
- §"Frontend Architecture": Server Components by default; client components only for interactivity. Mark-complete is the first interactivity surface in v1.
- §"Test Strategy": no React-component-level Vitest tests at v1. Component behavior is exercised via Playwright e2e.

**Why `BMAD_DATABASE_PATH`:**
e2e mark-complete tests write rows. Without isolation, they'd race against any dev portal running on the same machine and pollute the trainee's actual progress. The env var is a minimal, defensive seam: production callers continue to use the default `./data/progress.sqlite`; the Playwright webServer points at `./data/e2e-progress.sqlite`. `.gitignore` already covers both.

**Why a numbered-pill row in the nav:**
The existing `Lesson N of M` text indicator can't show "lessons 1, 2, AND 3 are complete" in one glance. Replacing it with a 6-pill row (one per lesson) satisfies AC4 verbatim and gives keyboard users a faster jump-to-lesson surface than the prev/next links. Each pill is a `<Link>` with a distinct `aria-label`.

**Component naming:**
The component file at `lesson-complete-button.tsx` is correct per the AC even though the lab page reuses it. The AC explicitly anticipates this two-surface state and says "promote to `src/components/` when capstone-step usage in Epic 4 makes it three surfaces." The component's exported name is `LessonCompleteButton` for now; renaming + relocation is Epic 4's call.

**Test approach:**
- Vitest covers `listCompleted` (pure-function-of-DB).
- Vitest source-string smoke verifies the client component imports nothing from `src/lib/db/*` (AC6).
- Playwright e2e covers the click-through flow end-to-end including the optimistic-revert on a stubbed server failure.

## Dev Agent Record

### Implementation Plan

1. Storage seam first: `listCompleted` for the nav-strip data flow.
2. Test isolation: `BMAD_DATABASE_PATH` env override + Playwright env wiring so e2e doesn't touch the dev DB.
3. Client component: `"use client"`, optimistic + revert + tiny status text. Source-string smoke instead of React-component test (architecture's "no React-component tests at v1").
4. Wire button into lesson + lab routes; extend LessonNav with completion display.
5. E2E: 4 cases covering lesson + lab flows, LessonNav pill state, and optimistic revert via stubbed 500.
6. Quad gate.

### Debug Log

- **Surfaced regression in Story 3.1 review patch** — switching `SCHEMA_PATH` to `import.meta.dirname` worked under Vitest (Vite's ESM resolver populates it) but `import.meta.dirname` is `undefined` under Turbopack (Next.js v16's dev/build runtime). The lesson + lab pages started crashing with `TypeError: paths[0] argument must be of type string. Received undefined` on first render. Fixed with a fallback chain: prefer `import.meta.dirname`, fall back to `process.cwd()`. Honest takeaway — the over-defensive review patch turned out to break the production runtime; the original cwd-relative path was actually fine for our local-only deployment. Documented in `connection.ts` comments.
- **Race in initial e2e** — first pass had 3 mark-complete cases failing because the optimistic UI update flips the button before the `/api/progress` POST resolves. The test would navigate/reload and read stale state. Added a `clickAndWaitForPersist` helper that waits for the response via `page.waitForResponse` before downstream assertions.
- **Test-DB isolation** — playwright.config.ts now sets `BMAD_DATABASE_PATH=./data/e2e-progress.sqlite` so test runs don't pollute the dev portal's `data/progress.sqlite`. Each test still cleans up its own state for run-to-run determinism.

### Completion Notes

**ACs satisfied:**
- AC1: "Mark complete" button visible on uncompleted lesson; e2e asserts.
- AC2: optimistic update fires immediately; revert + error message on stubbed 500. E2E covers both branches.
- AC3: reload preserves state via Server Component reading `getProgress`. Button toggle label flips to "Completed ✓" / "Unmark complete" via the `aria-label` distinction.
- AC4: LessonNav `<ol>` of pills with completed-state checkmark + `aria-label`-encoded state. E2E asserts the lesson 1 pill shows "Lesson 1 — What is BMAD, completed" after marking complete.
- AC5: lab page imports the same component; e2e covers click-toggle-reload.
- AC6: component co-located at `src/app/lessons/[slug]/lesson-complete-button.tsx`; `"use client"` directive verified by source-string smoke; no `@/lib/db/*` imports verified by smoke; lab page imports the same module (rule of three). Will relocate to `src/components/` when Epic 4 makes it three surfaces.

**Defensible deviations:**
- The `aria-label` on the button changes shape per state (`"Mark lesson as complete"` vs `"Unmark lesson as complete"`) rather than the visible label staying constant. This is a UX choice — visible labels are the user-facing copy; `aria-label` is the SR-distinct identity. The e2e selectors use `getByRole("button", { name: ... })` which matches the `aria-label`.
- The "currently saving" indicator is a small inline `<span role="status">` with the text "Saving…" or the error string, not a separate toast component. Matches the architecture's "smallest interactive surface" principle.

**Cleaning up the test DB:**
The e2e DB at `./data/e2e-progress.sqlite` is created on first test run; subsequent runs reuse it. Tests reset state per-test. Story 3.4 (`npm run reset-progress`) will land a script that can blast it; for now, manual `rm` works.

**Test approach:**
- Vitest covers the storage layer (`listCompleted`) and a source-string smoke for the client component.
- Playwright covers the user-visible flow end-to-end including the network-stubbed revert.
- No React-component-level Vitest test for the button per architecture's "no React-component tests at v1".

## File List

**New files:**
- `src/app/lessons/[slug]/lesson-complete-button.tsx`
- `src/app/lessons/[slug]/lesson-complete-button.test.ts`
- `tests/e2e/mark-complete.spec.ts`
- `_bmad-output/implementation-artifacts/3-3-mark-complete-ui.md` (this file)

**Modified files:**
- `src/lib/db/progress-db.ts` (`listCompleted` + cached prepared statement)
- `src/lib/db/progress-db.test.ts` (3 new `listCompleted` cases)
- `src/lib/db/connection.ts` (`BMAD_DATABASE_PATH` env override + Turbopack-safe `SCHEMA_PATH` fallback)
- `playwright.config.ts` (`webServer.env.BMAD_DATABASE_PATH`)
- `src/app/lessons/[slug]/page.tsx` (read progress + render button + pass `sequence`/`completedSlugs` to nav)
- `src/app/labs/[slug]/page.tsx` (read progress + render button)
- `src/components/lesson-nav.tsx` (numbered-pill row + completion display)
- `tests/e2e/lessons.spec.ts` (selectors updated to `getByLabel(/Lesson N of 6/)` for the nav `<ol>`'s aria-label; keyboard-tab-order test now expects the first pill after top-Prev)

## Change Log
- 2026-05-08 — Story file authored from epics.md §Epic 3 / Story 3.3
- 2026-05-08 — Implementation completed; quad gate clean; status `review`
- 2026-05-08 — Code review run: 0 decision-needed; 7 patches applied (parent-key prop-sync instead of useEffect, useRef in-flight guard, AbortController cleanup, WCAG 2.5.3 aria-label fix, aria-describedby, pill aria-label + ring for current+completed, body-matching e2e helper); 8 deferred; 1 dismissed (CSRF — local-only threat model). `test:unit` 96/96; `test:e2e` 20/20; lint clean; lint:links clean. Status `done`.
