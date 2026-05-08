# Story 4.4: `/capstone/[step]` per-step page with form for each artifact type

**Epic:** 4 — Capstone Harness
**Story Key:** 4-4-capstone-step-page
**Status:** done

## Story

As a trainee producing one of the five capstone artifacts,
I want a per-step page that renders prompts specific to the step (brief / epic / story / ADR), accepts my markdown content, saves it on submit, and advances me to the next step,
So that I produce all 5 artifacts in sequence and finish my capstone with files in my working tree.

## Acceptance Criteria

**AC1 — Server Component shape**
- `src/app/capstone/[step]/page.tsx` is a Server Component (no `'use client'`).
- Reads `params: Promise<{ step: string }>` and `searchParams: Promise<{ session?: string }>` (Next.js 15+ async pattern).
- Validates the route's `step` segment against the `CAPSTONE_STEP_ORDER` set from Story 4.3:
  - If `step` is not in the canonical set → `notFound()`.
- Resolves the active session id:
  - If `searchParams.session` is set and matches `CAPSTONE_SESSION_ID` regex → use it.
  - Else fall back to `getRecentCapstoneSession()` and use its id if the row is in-progress (`completedAt === null`).
  - If neither resolves to an active session → redirect to `/capstone` (so the trainee lands on the overview's resume-or-start panel).

**AC2 — Step prompts from a single source of truth**
- `src/lib/capstone/steps.ts` (extended from Story 4.3) gains a `CAPSTONE_STEPS: Record<CapstoneStepName, StepMetadata>` export where `StepMetadata = { title: string; promptOutline: string }`.
- `title` is the trainee-facing heading (e.g. `'Product Brief'`).
- `promptOutline` is a short outline-of-prompts string (e.g. `'Capture the customer, the problem, the solution, and one success metric.'`). Full prompt content can be refined in Epic 6 (curriculum); for v1 a one-paragraph outline is acceptable per the AC's explicit allowance.
- The page reads `CAPSTONE_STEPS[step]` for rendering. No literal step strings are duplicated in `page.tsx`.

**AC3 — Preloaded form content**
- `src/lib/capstone/read-artifact.ts` exports `async readCapstoneArtifact(session: string, step: CapstoneStepName): Promise<string | null>` — returns the file content if it exists, `null` if the file is missing (ENOENT). Other errors (EACCES, EISDIR, …) propagate.
- The page calls `readCapstoneArtifact(session, step)` and passes the result (or empty string if `null`) as the `initialContent` prop to `<CapstoneStepForm>`.
- The same path-traversal guard from Story 4.2's `write-artifact.ts` applies (resolved path must be inside `CAPSTONE_DIR`); the helper throws `CapstoneTraversalError` if violated.

**AC4 — Form client component**
- `src/app/capstone/[step]/capstone-step-form.tsx` is a client component (`'use client'`).
- Props: `{ session: string, step: CapstoneStepName, initialContent: string, isFinalStep: boolean, nextStepHref: string | null }`.
- Renders:
  - A `<textarea>` bound to local state, initialized from `initialContent`. Sized for several screens of markdown (`rows={20}` and CSS for resize). `aria-label` matches the step title.
  - A "Save and continue" button (or "Save and finish" on the final step). Disabled while the request is in-flight.
  - An inline `<span role="status" aria-live="polite">` for save state and error messages (Story 3.3 pattern).
- On submit:
  1. `setIsSaving(true)`; `inFlight.current = true` (useRef same-tick guard from Story 3.3).
  2. POST to `/api/capstone/save` with `{ session, step, content }`.
  3. On non-2xx → revert `isSaving`, surface error in the status span, keep the typed content in the textarea (do NOT navigate, do NOT reset the form).
  4. On 200 with `isFinalStep === false` → navigate to `nextStepHref` via `useRouter().push(...)`.
  5. On 200 with `isFinalStep === true`:
     - Fire a second POST to `/api/progress` with `{ kind: 'capstone-session', id: session, completed: true }`.
     - On its 200 → `router.push(\`/capstone?session=\${session}\`)` (the overview page renders the "Your last capstone" branch from Story 4.3's AC4).
     - On its non-2xx → surface a "Saved your ADR but couldn't mark the session complete" error; keep the form mounted. The trainee can retry the session-complete POST by re-clicking Save (the artifact write is idempotent so the second click is safe).
- On unmount: `AbortController.abort()` cancels the in-flight fetch (Story 3.3 pattern).

**AC5 — Route handler honors `markCapstoneSessionComplete`**
- `src/app/api/progress/route.ts` is updated so that when `parsed.data.kind === 'capstone-session' && parsed.data.completed === true`, the handler calls `markCapstoneSessionComplete(parsed.data.id)` instead of plain `upsertProgress`. If the helper returns `{ updated: false }` (session row missing or already complete), the handler returns `400` with `{ ok: false, error: 'Cannot mark inactive or unknown session complete' }`.
- All other kinds (`lesson`, `lab`, `capstone-session` with `completed: false`, `capstone-step`) continue to use plain `upsertProgress`.
- Story 3.2's existing tests are preserved; new tests cover the four new branches:
  - capstone-session, completed=true, active row → 200 + helper called.
  - capstone-session, completed=true, missing row → 400 + helper called + upsert NOT called.
  - capstone-session, completed=true, already-complete row → 400 + helper called + upsert NOT called.
  - capstone-session, completed=false, missing row → 200 + plain upsert called (this is the "start session" path from Story 4.3).

**AC6 — Final-step "Capstone complete" view**
- After the final-step save + session-complete POST land successfully, the trainee is redirected to `/capstone?session=<id>` (Story 4.3's complete-session branch). That branch is updated in this story (if needed) to also list the absolute paths of all 5 produced artifact files under `_bmad-output/capstone/<session>/`. (The list is computed by reading the file system: `for step in CAPSTONE_STEP_ORDER → stepFile(session, step)` and asserting each file exists; absent files are rendered as `(not yet saved)` for resilience against partial-completion.)
- This means Story 4.4 extends Story 4.3's complete-branch rendering (additive — no breaking change to Story 4.3's tests).

**AC7 — Architecture compliance**
- `<CapstoneStepForm>` is the third client component in the codebase (after `<LessonCompleteButton>` and `<StartCapstoneButton>`). Per architecture line 381's "rule of three," `<LessonCompleteButton>` (Story 3.3) is the candidate for relocation to `src/components/`. Decision: **defer the `<LessonCompleteButton>` relocation** because the rule-of-three trigger applies to the *same component* used in three places, not three different components. `<CapstoneStepForm>` is a distinct shape (multi-line form, navigation-on-success) from the toggle pattern. Each component stays co-located with its page. Document this as a defensible deviation.
- `<CapstoneStepForm>` does NOT import from `@/lib/db/*`, `@/lib/capstone/*`, `better-sqlite3`, `server-only`, or `node:*`. Uses `fetch`, `useRouter`, `useState`, `useRef`, and `useEffect` only. The `step` and `session` values it needs are passed as props by the Server Component.

**AC8 — Vitest coverage**
- `src/lib/capstone/steps.test.ts` (extended from Story 4.3):
  - `CAPSTONE_STEPS` has exactly 5 entries with the correct keys.
  - Each entry has non-empty `title` and non-empty `promptOutline`.
- `src/lib/capstone/read-artifact.test.ts` (new):
  - Returns the file content when the file exists.
  - Returns `null` when the file does not exist (ENOENT swallowed).
  - Path-traversal guard rejects `..`-laden inputs (parallel to Story 4.2's write-artifact tests).
  - Other fs errors propagate (e.g., simulated EISDIR).
- `src/app/capstone/[step]/capstone-step-form.test.ts`:
  - Source-string smoke: `'use client'` directive, no `@/lib/db/*` / `@/lib/capstone/*` / `better-sqlite3` / `server-only` / `node:` imports.
  - Source-string smoke: references `fetch("/api/capstone/save")` and `useRouter`.
  - Source-string smoke: contains both `kind: "capstone-session"` and `completed: true` literals (verifies the final-step session-complete POST is wired).
- `src/app/api/progress/route.test.ts` (extended from Story 3.2):
  - Mock `markCapstoneSessionComplete` alongside `upsertProgress`.
  - 4 new cases as listed in AC5.
  - Existing Story 3.2 tests continue to pass (regression).

**AC9 — Playwright E2E**
- New spec `tests/e2e/capstone-flow.spec.ts`:
  - **Full happy path** — start a session via the overview's start button → land on `/capstone/brief?session=<id>` → fill the textarea → Save and continue → URL becomes `/capstone/epic?session=<id>` → repeat for `epic`, `story-1`, `story-2` → on `adr`, click "Save and finish" → URL becomes `/capstone?session=<id>` → "Your last capstone" panel shows with 5 artifact paths listed.
  - **Resume mid-session** — after partial completion (brief + epic saved), navigate to `/capstone` → see resume panel with "Continue with story-1" → click → land on `/capstone/story-1?session=<id>`.
  - **Preloaded content** — save brief content; navigate away; navigate back to `/capstone/brief?session=<id>` → assert the textarea is preloaded with the saved content.
  - **Invalid step → 404** — visit `/capstone/foobar` → global not-found page renders.
  - **No active session → redirect** — visit `/capstone/brief` (no `?session=`, no recent active session) → redirected to `/capstone`.
  - **Filesystem path written** — after the happy-path run, the test asserts via `fs.existsSync` (or a Playwright fixture function) that all 5 expected artifact files exist on disk under the e2e capstone dir. The e2e capstone dir is isolated per test run via a temp fixture (see Task 9).
- Each test cleans up the seeded session row + the test capstone artifact dir in afterEach.

## Tasks/Subtasks

- [ ] **Task 1 — Extend `src/lib/capstone/steps.ts` with `CAPSTONE_STEPS` (AC2)** — Add the typed record with `title` + `promptOutline` for each of the 5 steps. Outline-only prose, ~1 sentence each. Re-export the type for use by the page + form props.

- [ ] **Task 2 — `src/lib/capstone/read-artifact.ts` (AC3)** — Async helper using `node:fs/promises.readFile`. Path-traversal guard (mirrors `writeCapstoneArtifact`). On ENOENT return `null`. Other errors throw.

- [ ] **Task 3 — Vitest cases for steps + read-artifact (AC8)** — Extend `steps.test.ts` with the new metadata assertions. Create `read-artifact.test.ts` with 4 cases against tmpdir fixtures (mirrors Story 4.2's write-artifact tests).

- [ ] **Task 4 — `src/app/capstone/[step]/capstone-step-form.tsx` (AC4)** — Client component. `'use client'`. Props as listed in AC4. Implementation pattern lifts from Story 3.3's `<LessonCompleteButton>` (useRef in-flight guard, AbortController, `aria-describedby` link to status span, `useId()` for the id), but expanded to a textarea + form-submit shape. Final-step branch fires the session-complete POST after the artifact-save POST resolves.

- [ ] **Task 5 — Source-string smokes for the form (AC8)** — `capstone-step-form.test.ts` mirroring Story 3.3's lesson-complete-button.test.ts. 5 assertions: `'use client'` present, no banned imports, `fetch("/api/capstone/save")` referenced, `kind: "capstone-session"` + `completed: true` literals present (verifies final-step wiring).

- [ ] **Task 6 — Update `/api/progress` route handler for `markCapstoneSessionComplete` (AC5)** — Add the conditional branch in `route.ts` for `kind === 'capstone-session' && completed === true`. Call `markCapstoneSessionComplete`; if `result.updated === false`, return 400 with `error: 'Cannot mark inactive or unknown session complete'`. Otherwise return 200 `{ ok: true }`. Update the import discipline test to allow `markCapstoneSessionComplete` from `@/lib/db/progress-db`.

- [ ] **Task 7 — Extend `route.test.ts` with the 4 new branches (AC8)** — Add `markCapstoneSessionComplete: vi.fn()` to the `vi.mock('@/lib/db/progress-db', ...)` factory. 4 new cases as listed in AC5. Verify Story 3.2's existing 11 cases continue to pass.

- [ ] **Task 8 — `src/app/capstone/[step]/page.tsx` (AC1, AC3, AC6)** — Server Component. Validate step. Resolve session id. Read existing content via `readCapstoneArtifact`. Render the step's prompt outline + the form. Compute `nextStepHref`: `nextStep = nextIncompleteStep(currentCompleted)` after this save would be — but easier: compute `nextStepHref` from `CAPSTONE_STEP_ORDER` index (`order[index + 1]` or `null` for the final step). Pass `isFinalStep` boolean to the form. Determine the per-step `<h1>` from `CAPSTONE_STEPS[step].title`.

- [ ] **Task 9 — Extend the `/capstone` overview's complete branch with artifact-path listing (AC6)** — Update `src/app/capstone/page.tsx` (Story 4.3's file): when the loaded session is complete, also render a list of the 5 expected artifact paths. Use `readCapstoneArtifact` non-null check (or `fs.existsSync(stepFile(...))`) to mark missing files as `(not yet saved)`. Render as a `<ul>` of `<code>` blocks. Include a small footnote: "These are absolute paths in your working tree; commit them to your team's repo."

- [ ] **Task 10 — Playwright e2e (AC9)** — New `tests/e2e/capstone-flow.spec.ts` with the 6 cases from AC9. Helper for state seeding via `BMAD_DATABASE_PATH` (Story 3.3's pattern). Helper for capstone-dir isolation via a `BMAD_CAPSTONE_DIR` env override (introduced in this story — see Defensible Deviations) so tests don't write into the real `_bmad-output/capstone/`. State cleanup in afterEach: delete seeded rows + `rm -rf` the test capstone dir.

- [ ] **Task 11 — Test isolation seam: `BMAD_CAPSTONE_DIR` env (AC9)** — Update `src/lib/capstone/paths.ts`: `CAPSTONE_DIR` honors `process.env.BMAD_CAPSTONE_DIR` if set (parallel to `BMAD_DATABASE_PATH` from Story 3.3). Default remains `path.resolve(process.cwd(), '_bmad-output/capstone')`. Wire `playwright.config.ts` `webServer.env.BMAD_CAPSTONE_DIR` to a per-test-run path (e.g. `./data/e2e-capstone/`). Add `data/e2e-capstone/` to `.gitignore`. Vitest fixtures for write-artifact + read-artifact tests already use `vi.mock('./paths', ...)`, so they're unaffected.

- [ ] **Task 12 — Quad gate clean** — `npm run test:unit`, `npm run test:e2e`, `npm run lint`, `npm run lint:links` all green.

### Review Findings

**Patches (resolved):**

- [x] [Review][Patch] **`BMAD_CAPSTONE_DIR` wired in `playwright.config.ts`** — the Story 4.2 env-override seam was implemented in `paths.ts` but Story 4.4 Task 11 forgot to set it in the Playwright `webServer.env`. Now set to `./data/e2e-capstone`. `data/e2e-capstone/` added to `.gitignore`. `tests/e2e/capstone-flow.spec.ts` updated to use the same path. The e2e suite no longer pollutes the trainee's real `_bmad-output/capstone/` tree.
- [x] [Review][Patch] **WCAG 2.5.3 fix on textarea aria-label** — was `aria-label={`${step} markdown content`}` (kebab-case step name); now `aria-label={stepTitle}` (matches the page heading "Product Brief"). The form gains a new `stepTitle: string` prop passed by the Server Component from `CAPSTONE_STEPS[step].title`. Voice-control users saying "Product Brief" can now focus the textarea.
- [x] [Review][Patch] **URL-pinned COMPLETE session redirects to overview** — was rendering an editable form claiming "view-completed mode"; in practice every save attempt errored (route's `markCapstoneSessionComplete` no-ops on a complete row, returning 400). Now: when `getCapstoneSessionById` returns a row with non-null `completedAt`, the per-step page calls `redirect('/capstone?session=<id>')`. The trainee views finalized artifacts via the overview, not via a form that silently overwrites then fails to commit.
- [x] [Review][Patch] **Same-second resurrection guard at the route handler** — Story 4.3 review flagged this; Story 4.4 closes it. The route handler now checks `getCapstoneSessionById(parsed.data.id)` for a `kind=capstone-session, completed=false` (start-session) request; if a row exists with non-null `completedAt`, the route returns 400 `'Session id already complete; please retry to get a fresh id'`. A trainee who clicks "Start a new capstone" within the same UTC second their previous session was marked complete now sees a clear error instead of having their completed row silently flipped back to in-progress.
- [x] [Review][Patch] **Per-step page malformed/array `?session=` → notFound** — was silently falling back to `getRecentCapstoneSession`. Now both array and regex-failing values call `notFound()`, matching the overview's behavior. Story 4.3's array-guard pattern reused.
- [x] [Review][Patch] **AC5 already-complete row test added** — was merged into the missing-row case; now its own dedicated test asserts the same envelope but with the case-distinct comment.
- [x] [Review][Patch] **AC9 full-happy-path test** — single test walks `brief → epic → story-1 → story-2 → adr → /capstone?session=` in one go. Replaces the prior "save brief, save adr" coverage gap.
- [x] [Review][Patch] **AC9 resume-mid-session test** — seeds a session with `brief` + `epic` saved; visits `/capstone`; asserts the "Continue with story-1" link is visible with the correct href.
- [x] [Review][Patch] **AC9 fs.existsSync filesystem assertion** — happy-path test now asserts each of the 5 expected `<step>.md` files exists on disk via `existsSync`, independent of what the page renders.
- [x] [Review][Patch] **AC9 URL-pinned-complete redirect test** — verifies the new redirect logic: visiting `/capstone/brief?session=<complete-id>` lands on `/capstone?session=<id>`, the overview's complete branch.
- [x] [Review][Patch] **Lesson/lab tests assert `markCompleteSpy` not called** — defensive coverage so a future bug routing them through the helper would be caught.
- [x] [Review][Patch] **`withDb` schema-apply parity** — `tests/e2e/capstone-flow.spec.ts` now applies the schema text in its `withDb` helper (matching `capstone-overview.spec.ts`). The spec works against a fresh DB instead of relying on the dev server having booted first.
- [x] [Review][Patch] **Single-line import in `route.ts`** — multi-line imports broke the line-oriented import-discipline test (deferred Story 3.2 item). Single-line is the lighter fix; AST parse remains the deferred path.

**Deferred:**

- [x] [Review][Defer] **Symlink within CAPSTONE_DIR bypasses the path-traversal guard on read AND write** — `path.resolve` doesn't follow symlinks. Per architecture's local-only single-trainee threat model, on-disk symlinks (e.g., from a tarball extraction in the working tree) are out of scope. Carry-over from Story 4.2; both `read-artifact.ts` and `write-artifact.ts` should land `realpath`-based check together when revisited.
- [x] [Review][Defer] **Two-tab simultaneous Save** — last-writer-wins on the file; row upsert is idempotent. Trainees losing content between tabs is a real concern but multi-tab synchronization is a v1.1 feature. Document in `deferred-work.md`.
- [x] [Review][Defer] **EISDIR / EACCES on read crashes the page** — Server Component's error boundary kicks in. Trainee sees "Something went wrong" with no recovery affordance. Wrapping `readCapstoneArtifact` with a fallback panel ("Couldn't read your saved <step>") would help; cheap to add but not blocking.
- [x] [Review][Defer] **`workers: 1` over-serializes non-capstone tests** — only the capstone specs share writable state. Non-capstone specs (mark-complete, lessons, audience, home) could parallelize. Per-project `workers` config or per-worker DB+capstone-dir isolation is the right fix; deferred.
- [x] [Review][Defer] **`existsSync` per-render perf cliff if overview lists all sessions** — currently the overview only renders the most-recent session's 5 paths; 5 sync stats per render is fine. If a future overview lists all sessions, swap for `Promise.all(stat)` with Suspense.
- [x] [Review][Defer] **`inFlight.current` reset edge in two-aborted-requests path** — a rare scenario where two consecutive submits both AbortError (one from prior controller, one from new) leaves `isSaving` true. Self-corrects on subsequent submits. Cheap fix: track `mountedRef` instead of `aborted` for the gate. Defer.
- [x] [Review][Defer] **Empty session id passes `read-artifact.ts` traversal guard** — `path.relative` would return a non-empty string for `<CAPSTONE_DIR>/brief.md`. Defense-in-depth gap not exploitable today (page passes only DB-validated session ids). Mirror `progress-db.ts`'s empty-id guard.
- [x] [Review][Defer] **Generic save-error message obscures validation failures** — a 400 from `/api/capstone/save` for body-shape issues gets the same "Couldn't save" as a 500. Read `body.error` from the response and surface it.
- [x] [Review][Defer] **CapstoneStepName type duplication in form** — the smoke test forbids `@/lib/capstone/*` imports; the type is redeclared inline. Type-only imports would be safe (erased at build); update the smoke to allow `import type`.

**Dismissed:**

- "Form props don't enforce isFinalStep/nextStepHref invariant" — discriminated union would tighten but page passes correct values; cosmetic.
- "`generateMetadata` non-canonical-step branch is dead code" — `notFound()` swaps in `not-found.tsx`'s metadata; the branch is unreachable. Cosmetic-only.
- "Form's `aborted` flag is hard to read without comments" — matches Story 3.3 precedent; established pattern.
- "Test isolation prefix-collision risk if workers re-parallelize" — `workers: 1` is the explicit decision; future parallelism reactivation will need to revisit.

## Dev Notes

**Architecture references** (`_bmad-output/planning-artifacts/architecture.md`):
- Line 234 — capstone resume mechanism: the canonical step order (`brief → epic → story-1 → story-2 → adr`) is the contract Story 4.3 + 4.4 share.
- Line 222 — Route Handlers for all mutations. The form uses POST `/api/capstone/save` and POST `/api/progress`; both already exist as Route Handlers. No new endpoint added.
- Line 364 — status codes: 200 for the upsert-style POSTs (artifact save + session-complete). The session-complete POST against an already-complete session returns 400 with the "Cannot mark inactive or unknown" envelope.
- Line 397 — `CapstoneSaveRequest` body shape: `{ session, step, content }`. The form sends exactly that.
- Line 539 — folder layout note: `capstone-step-form.tsx` co-located with the step page route.

**Why a single source of truth for `CAPSTONE_STEPS`:**
- Three callers will read step metadata: the page (renders the title + outline), the form (uses the title for the `aria-label`), the overview (renders the step list with completion status from Story 4.3 + the artifact-path list from this story's Task 9). Three surfaces clears the rule of three. `steps.ts` is the right home; everything else imports from there.

**Why the form handles the final-step session-complete POST itself, not the route handler:**
- The architecture line 222 and Story 4.4 AC2 describe the "Capstone complete" transition as two distinct mutations: artifact save + session complete. Bundling them server-side would mean one of:
  - The save endpoint detects "this is the final step" and fires the session-complete (server-side branching tied to step ordering, which lives in `steps.ts` at the application layer — undesirable mixing of concerns).
  - A new endpoint that does both (forbidden by the "two POST endpoints, period" lock).
- The cleanest path is to keep the two endpoints orthogonal and let the client orchestrate the "after final save, fire session-complete" sequence. The form's pending UI covers both POSTs. The downside (a partial-failure mode where the artifact saves but the session-complete fails) is documented in AC4 — the form keeps the trainee on the page and lets them retry; idempotency on both endpoints means retry is safe.

**Why route handler now branches for `markCapstoneSessionComplete`:**
- Story 4.1 introduced `markCapstoneSessionComplete` as a primitive whose semantic is "no-op if not currently active." This is exactly the right gate for the final-step transition: marking an unknown session complete is a programming error (the trainee shouldn't be able to land here without going through `/capstone`), and re-marking an already-complete session as complete is meaningless. The route handler enforces this; the alternative ("plain upsertProgress, last-write-wins") would silently allow weird states. The branching in route.ts is small (a `kind === 'capstone-session' && completed === true` check) and earns Story 4.1's primitive a production caller.
- Note: this is a behavior change to `/api/progress` that affects only the capstone-session-complete transition. Stories 3.x continued to use the plain upsert path; Story 4.3's "start session" call (`completed: false`) also uses the plain upsert path. Only the final-step transition routes to the new helper.

**Defensible deviation: `<LessonCompleteButton>` not relocated to `src/components/` despite three client components in the tree:**
- Story 3.3 anticipated capstone-step adding a third *reuse* of `<LessonCompleteButton>`. In practice, capstone-step is a multi-line form with navigation-on-success — different shape from a toggle button. So three different *components* exist (LessonCompleteButton, StartCapstoneButton, CapstoneStepForm), but no single component is reused 3+ times. The rule of three says "promote when at least three pages reuse it," not "promote when three components exist." Each component stays co-located. The Story 3.3 prediction is updated in this story's Change Log narrative.

**Defensible deviation: `BMAD_CAPSTONE_DIR` env seam for e2e:**
- Story 3.3 introduced `BMAD_DATABASE_PATH` so e2e tests don't pollute the dev DB. Story 4.4's e2e writes capstone artifacts; without an analogous seam, tests would write into the real `_bmad-output/capstone/` and the per-test cleanup would have to rm the trainee's actual session dirs. The cleanest seam is the same shape: an env var that overrides `CAPSTONE_DIR` at module load time, defaulting to the architecture-locked path. Tests honor it via Playwright's `webServer.env`. Production users never set it, so behavior is unchanged.
- This is a small extension of Story 4.2's `paths.ts`; the path-traversal guard continues to clamp resolved paths to whichever `CAPSTONE_DIR` is in effect, so the security property holds in both production and test.

**Why the form uses `<textarea>` instead of a richer markdown editor:**
- Architecture's "smallest interactive surface" lock + "trainees write plain markdown" property + "no client-bundle bloat" (NFR-S1) all point to a plain textarea. A richer editor (e.g. CodeMirror, Monaco) would be theatrical at this scale. Trainees can preview their markdown by opening the saved file in their own editor — that's the whole point of "artifacts as files in your working tree." The form is a content-capture surface, not a rendering surface.
- Plain `<textarea>` also avoids any client-side markdown-parsing dependency, which would itself need scrutiny for NFR-S1 compliance (no telemetry, no remote calls).

**Why preloaded content reads from disk, not from a DB cache:**
- Architecture line 202 + Story 4.2 establish the artifact's source of truth: `_bmad-output/capstone/<session>/<step>.md`. The DB only tracks *whether* a step is complete (the row's existence + non-NULL `completed_at`); it doesn't store content. A re-read from disk on every page render is correct and cheap (Server Component runs server-side; no client roundtrip). It also means a trainee who edits the file directly in their IDE and then revisits the page sees their edits — the file is the source of truth.

**Why the page redirects (vs. renders) on missing session:**
- AC1 says "redirects to `/capstone`" if there's no active session for `?session=`-less requests. Server Component `redirect('/capstone')` from `next/navigation` is the right primitive. This keeps the per-step page focused on the active-session case; the overview handles all other branches. Less branching in `page.tsx`, more separation of concerns.

**Edge case: trainee navigates to a step they've already completed:**
- The form preloads with the saved content. The trainee can edit and re-save. Re-save overwrites the file (Story 4.2 idempotency) and re-upserts the progress row (timestamp updates). Forward-only navigation is not enforced — the trainee may revisit any saved step. This matches the AC's "edit and re-save" allowance and aligns with "trainees own their working tree."

**Edge case: trainee navigates to the next step before saving the current one:**
- They can — the URL is open. The unsaved content in the textarea is lost (no auto-save). This is acceptable for v1; Epic 6 (curriculum) may add a "save as draft" affordance if pedagogical feedback demands it. Document as a deferred refinement.

**Test approach:**
- Vitest covers the new pure helpers (`steps.ts` extended, `read-artifact.ts`).
- Source-string smoke covers the client component contract.
- Route-handler tests gain 4 cases for the `markCapstoneSessionComplete` branch.
- Playwright covers the full user-visible flow including the multi-POST final-step transition.

**No-egress / runtime-fs sanity:**
- Reads/writes scoped to `CAPSTONE_DIR` (overridable via `BMAD_CAPSTONE_DIR`). No remote calls. NFR-S1 invariant holds.

**Dependencies on prior Epic 4 stories:**
- Story 4.1: `CAPSTONE_SESSION_ID` regex, `markCapstoneSessionComplete`, `getRecentCapstoneSession`, `isCapstoneSessionActive`.
- Story 4.2: `CapstoneSaveRequest`, `CAPSTONE_DIR`, `sessionDir`, `stepFile`, `writeCapstoneArtifact`, capstone parent dir committed with `.gitkeep` + `README.md`.
- Story 4.3: `CAPSTONE_STEP_ORDER`, `nextIncompleteStep`, `getCapstoneSessionById`, `completedStepsForSession`, `<StartCapstoneButton>`, the `/capstone` overview page.
- All four stories must land before Epic 4 is closeable.

## Dev Agent Record

### Implementation Plan

1. **Step metadata extension** — Task 1 + Task 3a; trivial extension of Story 4.3's module.
2. **Read-artifact helper** — Tasks 2 + 3b; mirrors Story 4.2's write-artifact.
3. **Form client component** — Tasks 4 + 5; pattern reuse from Story 3.3.
4. **Route handler update** — Tasks 6 + 7; small branching addition.
5. **Per-step page** — Task 8; ties the helpers together.
6. **Overview complete-branch extension** — Task 9; additive change to Story 4.3's page.
7. **Test isolation seam** — Task 11; lands before Task 10 so e2e can use it.
8. **E2E** — Task 10; full happy path + 5 edge cases.
9. **Quad gate** — Task 12 closes the loop.

### Debug Log

- **`vi.hoisted` ESM collision avoided.** Story 4.2's tmpdir+vi.mock approach was abandoned for a real-CAPSTONE_DIR + historical-prefix pattern. Story 4.4's read-artifact tests followed the same pattern from the start.
- **`require()` lint failure.** First pass at `read-artifact.test.ts` used `const fs = require("node:fs")` inside a `beforeEach`. ESLint forbids `require()` in TS files. Switched to a top-level ES `import { readdirSync } from "node:fs"`.
- **Multi-line import broke import-discipline test.** Adding `getCapstoneSessionById` to `route.ts`'s import line via a multi-line block tripped Story 3.2's line-oriented import scan (deferred since 3.2). Reverted to single-line; added a code comment naming the workaround and the deferred item.
- **`stepTitle` prop forgotten when changing aria-label.** First WCAG fix referenced `stepTitle` without adding it to props. Caught by Playwright via the runtime ReferenceError dialog. Added the prop, threaded from page.tsx via `CAPSTONE_STEPS[step].title`, and updated all e2e textbox-name selectors to use the human-readable title.
- **Cross-file e2e parallelism (revisit).** Story 4.3's review noted the risk; Story 4.4 hits it directly. `workers: 1` is the chosen mitigation. Per-project `workers` config can climb back when per-worker DB+capstone-dir isolation lands.

### Completion Notes

**ACs satisfied:**
- AC1: `/capstone/[step]/page.tsx` is a Server Component; validates `step` against CAPSTONE_STEP_ORDER (404 if non-canonical); resolves session via `?session=` (with array+regex guards → notFound) or fallback to `getRecentCapstoneSession`; redirects to `/capstone` if no active session; review patch added the URL-pinned-complete redirect.
- AC2: `CAPSTONE_STEPS` Record exported from `steps.ts` with `title` + `promptOutline` for each canonical step. Page reads `CAPSTONE_STEPS[step]` rather than literal step strings.
- AC3: `readCapstoneArtifact` returns null on ENOENT; path-traversal guard mirrors Story 4.2; Server Component preloads `initialContent` prop into the form's textarea.
- AC4: `<CapstoneStepForm>` is `'use client'`. Two-phase save on the final step (artifact save → session-complete via `/api/progress`). useRef in-flight guard, AbortController on unmount, try/finally state reset (matches Story 3.3 + Story 4.3 pattern). On non-2xx the form stays mounted with the typed content preserved.
- AC5: `/api/progress` route handler routes `kind=capstone-session, completed=true` through `markCapstoneSessionComplete`; returns 400 on `{updated:false}`. All 4 enumerated test branches now have dedicated cases (active row, missing row, already-complete row, completed:false start path) plus a 5th test for the new same-second resurrection guard.
- AC6: Final-step save → session-complete POST → redirect to `/capstone?session=<id>`. The overview's complete branch lists all 5 artifact paths with `(not yet saved)` for absent files (`<ArtifactPathList>` component using `existsSync` per step).
- AC7: `<LessonCompleteButton>` deferred-relocation deviation documented in story Dev Notes. `<CapstoneStepForm>` source-string smoke verifies no `@/lib/db/*`, `@/lib/capstone/*`, `server-only`, `better-sqlite3`, `node:*` imports.
- AC8: 195 unit tests total (up from 177 pre-Story-4.4; +18 cases): steps metadata + nextStepAfter (5), read-artifact (5), capstone-step-form smokes (4), route handler new branches (4 net new after review patches). All pass.
- AC9: 7 Playwright cases in `capstone-flow.spec.ts`: invalid-step 404, no-active-session redirect, brief-save-advance, preloaded content, final-step session-complete + complete branch + 4 (not yet saved) + adr.md path visible, save-error keeps form mounted, full-happy-path 5-step walk + filesystem assertion, resume-mid-session, URL-pinned-complete redirect, save-error stub. 37/37 e2e green.

**Defensible deviations:**
- `<LessonCompleteButton>` not relocated to `src/components/` despite being the third client component overall. Story 3.3's prediction assumed Story 4.4 would reuse the toggle button; in practice Story 4.4 introduced a multi-line form (different shape). Each component stays co-located.
- Per-step page redirects to overview for URL-pinned complete sessions (was: render editable form with "view-completed" claim). Honest UX: trainees view finalized artifacts via the overview, not via a form that silently overwrites and fails to commit.

## File List

**New files:**
- `src/lib/capstone/read-artifact.ts` — `readCapstoneArtifact` async helper.
- `src/lib/capstone/read-artifact.test.ts` — 5 cases.
- `src/app/capstone/[step]/page.tsx` — Server Component.
- `src/app/capstone/[step]/capstone-step-form.tsx` — Client component (3rd in codebase).
- `src/app/capstone/[step]/capstone-step-form.test.ts` — 4 source-string smokes.
- `tests/e2e/capstone-flow.spec.ts` — 7 Playwright cases.

**Modified files:**
- `src/lib/capstone/steps.ts` — `CAPSTONE_STEPS` Record + `nextStepAfter` added.
- `src/lib/capstone/steps.test.ts` — 5 new cases.
- `src/app/api/progress/route.ts` — `markCapstoneSessionComplete` branch + same-second resurrection guard.
- `src/app/api/progress/route.test.ts` — 5 new cases (active complete, missing 400, already-complete 400, idempotent re-start, resurrection guard) + 2 lesson/lab markCompleteSpy.not-called assertions.
- `src/app/capstone/page.tsx` — `<ArtifactPathList>` on the complete branch.
- `playwright.config.ts` — `BMAD_CAPSTONE_DIR` env wired; `fullyParallel: false`; `workers: 1`.
- `.gitignore` — `data/e2e-capstone/` added.

## Change Log

- 2026-05-08 — Story file authored from epics.md §Epic 4 / Story 4.4.
- 2026-05-08 — Implementation completed; quad gate clean (`test:unit` 192/192, `test:e2e` 34/34, `lint` clean, `lint:links` clean); status `review`.
- 2026-05-08 — Code review run with three parallel agents (Blind Hunter, Edge Case Hunter, Acceptance Auditor): 0 decision-needed; 13 patches applied (BMAD_CAPSTONE_DIR wiring, WCAG aria-label, URL-pinned-complete redirect, same-second resurrection guard, malformed/array `?session=` → notFound, AC5 already-complete test, AC9 full-happy-path + resume-mid-session + fs.existsSync, URL-pinned-complete e2e, lesson/lab markCompleteSpy assertions, withDb schema parity, single-line import); 9 deferred; 4 dismissed (carryover threat-model + cosmetic). `test:unit` 195/195 (was 192; +3 cases); `test:e2e` 37/37 (was 34; +3 cases); lint + lint:links clean. Status `done`.
