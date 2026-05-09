# Story 6.2: Multi-step setup wizard page (Phase 1)

**Epic:** 6 — Setup Wizard + Bootstrap
**Story Key:** 6-2-multi-step-wizard-page
**Status:** done

## Story

As the developer landing FR-3.6 (multi-step wizard, not single form),
I want `/capstone/setup/wizard` to walk the trainee through six per-step screens — project name, target directory, communication language, document output language, skill level, output folder — with non-destructive per-step back nav and zero on-disk persistence until Phase 2 bootstrap completes,
So that a trainee who bails mid-wizard leaves no trace beyond the in-flight session row + tool selection from Story 6.1, and per-step validation surfaces failures locally instead of cascading at install time.

## Acceptance Criteria

**AC1 — Page exists at `src/app/capstone/setup/wizard/page.tsx`**
- Client Component (`'use client'`) — wizard state lives in `useState` + `useReducer`, NOT in URL or SQLite. Per FR-3.10, no setup state persists on disk before Phase 2.
- Reads `?session=<capstone-session-id>` from `searchParams`; redirects to `/capstone/setup` (Story 6.1) if absent or malformed.
- Renders one of six step screens via a step-index state variable. Header includes a 6-dot progress indicator with the current step highlighted; each completed-once step is clickable to jump back.
- Footer has Back / Next buttons. Next is disabled until the current step's local validation passes. Back never destroys the current step's data.
- After step 6 (output folder), Next navigates to `/capstone/setup/bootstrap?session=<id>` carrying the wizard state as URL-encoded JSON in `?wizard=<base64-json>` (small payload — six fields). Story 6.4 reads it.

**AC2 — Step 1: Project name**
- Text input. Required. Validation: `/^[a-z][a-z0-9-]{1,63}$/` (kebab-case, starts with letter, 2-64 chars, matches `bmad-method install --set core.project_name=` requirement).
- Live error: "Project name must be lowercase, start with a letter, and use letters/digits/hyphens only (2-64 chars)."
- Default value: empty.

**AC3 — Step 2: Target directory**
- Story 6.3 ships the path-picker component; Story 6.2 imports and embeds it. Required. Returns an absolute path or empty (path-picker handles its own validation against TM-2 / NFR-S7 allowlist).
- Default value: `~/projects/<project-name-from-step-1>` (auto-suggested; trainee can edit). On project-name change in step 1, the default updates ONLY if the trainee hasn't manually edited the target-dir field.
- Next disabled until path-picker reports `valid: true`.

**AC4 — Step 3: Communication language**
- Dropdown. Default: `English`. Options: `English`, `Spanish`, `French`, `German`, `Japanese`, `Mandarin Chinese` (matches the BMAD installer's supported set; configurable in `src/lib/capstone/bootstrap/languages.ts` so future expansion doesn't change the UI).
- Maps to `bmad-method install --set core.communication_language=<value>`.
- Always valid (dropdown has a default).

**AC5 — Step 4: Document output language**
- Dropdown. Default: same as step 3. Same options.
- Maps to `bmad-method install --set core.document_output_language=<value>`.

**AC6 — Step 5: Skill level**
- Three radio buttons: `beginner`, `intermediate` (default), `expert`. Maps to `bmad-method install --set core.user_skill_level=<value>`.
- Each option includes a one-line tooltip describing what BMAD's primer behavior changes at that level (text from BMAD installer documentation; vendored in `src/lib/capstone/bootstrap/skill-levels.ts`).

**AC7 — Step 6: Output folder**
- Text input. Default: `_bmad-output` (the BMAD installer's default). Required. Validation: must be a relative path (no leading `/`), no `..`, max 64 chars. The folder will be created INSIDE the target directory from step 2.
- Maps to `bmad-method install --set core.output_folder=<target-dir>/<value>`.

**AC8 — State machine + non-destructive back**
- A `useReducer` with action types: `SET_PROJECT_NAME`, `SET_TARGET_DIR`, `SET_COMM_LANG`, `SET_DOC_LANG`, `SET_SKILL`, `SET_OUTPUT_FOLDER`, `GO_NEXT`, `GO_BACK`, `JUMP_TO_STEP`.
- Going back never resets a forward step's value. Going forward always re-validates the current step before advance.
- `JUMP_TO_STEP` only allowed for steps the trainee has already passed once (the dot indicator gates this).

**AC9 — Vitest unit coverage at `src/app/capstone/setup/wizard/page.test.ts`**
- Per-step validation: each invalid → Next disabled; each valid → Next enabled.
- Reducer cases: each action transition asserts the expected state shape.
- Default-target-dir auto-suggest: changing project name in step 1 updates the default in step 2 IF step 2's value was untouched; does NOT update if step 2's value was edited.
- URL state propagation: completing step 6 with valid data builds the correct `?wizard=<base64-json>` payload; Story 6.4's URL parser (in this story, asserted against a fixture) decodes it back to the same shape.

**AC10 — Playwright e2e at `tests/e2e/capstone-setup-wizard.spec.ts`**
- Drives the full six-step flow with valid data; asserts the final navigation URL.
- Drives a back-step-edit-forward flow; asserts forward-step values preserved.
- Drives an invalid-step (e.g., spaces in project name) and asserts Next is disabled.
- Asserts no SQLite mutation occurs during the wizard (uses Playwright's `page.route()` to record all `/api/progress` calls; expects zero).

**AC11 — Lint, typecheck, quad gate**

## Tasks/Subtasks

- [ ] **Task 1 — Wizard scaffold + reducer (AC1, AC8)** — `wizard/page.tsx` Client Component with `useReducer`. State shape typed.
- [ ] **Task 2 — Step 1: project name (AC2)** — text input + regex validation. Live error.
- [ ] **Task 3 — Step 2: target dir (AC3)** — embeds Story 6.3's `<PathPicker>` (which lands in same epic; if Story 6.3 hasn't merged yet, ship a stub `<PathPicker>` in this story that's identical except no native-dialog button).
- [ ] **Task 4 — Steps 3-5: language + skill dropdowns/radios (AC4, AC5, AC6)** — straightforward selection components. Vendor language list + skill descriptions in `src/lib/capstone/bootstrap/`.
- [ ] **Task 5 — Step 6: output folder (AC7)** — text input + relative-path validation.
- [ ] **Task 6 — Step nav + dot indicator** — header + footer components; jump-to-step logic.
- [ ] **Task 7 — Final-step navigation (AC1)** — encode wizard state to base64 JSON; `router.push(/capstone/setup/bootstrap?session=<id>&wizard=<encoded>)`.
- [ ] **Task 8 — Vitest unit coverage (AC9)** — reducer + per-step validation cases.
- [ ] **Task 9 — Playwright e2e (AC10)** — full flow + back-step + invalid-step + no-SQLite-write assertion.
- [ ] **Task 10 — Quad gate clean (AC11)**.

## Dev Notes

**Architecture references:**
- §"Folder Layout" line 374 — `capstone/setup/wizard/page.tsx` path verbatim.
- §"Frontend Architecture → State management" line 244 — React local state + Server Components; this story is a rare exception (Client Component for wizard state). The reducer is in-component, not a global store. Lock honored.

**PRD references:**
- FR-3.6 line 524 — multi-step wizard with non-destructive back. AC1+AC8 implement.
- FR-3.10 line 528 — setup-bail safety: no on-disk persistence before Phase 2. AC1's "no SQLite mutation in wizard" + AC10's e2e assertion enforce.

**Brainstorm references:**
- Setup-4 line 96 — multi-step wizard, not single form. Story 6.2 IS this irreducible.

**Why URL-encoded wizard state on the bootstrap-page navigation:**
Six fields, ~200 bytes total. URL-encoded JSON is the smallest possible state-transfer mechanism. Alternative (POST to a temp-state endpoint, then GET) would mutate SQLite mid-wizard, violating FR-3.10. Alternative (sessionStorage) would not survive a hard navigation in some browser configs. URL is right.

## Dev Agent Record

### Implementation Plan

_To be filled in by the dev agent at implementation time._

### Debug Log

_To be filled in by the dev agent during implementation._

### Completion Notes

_To be filled in by the dev agent after the quad gate is clean._

## File List

**Expected new files:**
- `src/app/capstone/setup/wizard/page.tsx`
- `src/app/capstone/setup/wizard/page.test.ts`
- `src/app/capstone/setup/wizard/wizard-reducer.ts`
- `src/app/capstone/setup/wizard/wizard-reducer.test.ts`
- `src/lib/capstone/bootstrap/languages.ts`
- `src/lib/capstone/bootstrap/skill-levels.ts`
- `tests/e2e/capstone-setup-wizard.spec.ts`
- `_bmad-output/implementation-artifacts/6-2-multi-step-wizard-page.md` (this file)

**Expected modified files:**
- None.

## Change Log

- 2026-05-08 — Story file authored from FR-3.6 + brainstorm Setup-4 + architecture line 374.
