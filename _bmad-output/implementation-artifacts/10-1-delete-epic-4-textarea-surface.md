# Story 10.1: Delete Epic 4 textarea surface (form, save endpoint, step pages)

**Epic:** 10 — Migration (Delete Current Epic 4)
**Story Key:** 10-1-delete-epic-4-textarea-surface
**Status:** ready-for-dev

## Story

As the developer landing the capstone-rebuild migration (per session-state's PLAN-vs-DEV order: Epic 10 ships FIRST in dev order to clear the surface),
I want a single surgical commit that removes the Epic-4 textarea-based capstone — `<CapstoneStepForm>`, `writeCapstoneArtifact`, `POST /api/capstone/save`, `/capstone/[step]/page.tsx` — while explicitly preserving the four load-bearing surfaces (`<StartCapstoneButton>`, session-schema rows, reset-progress NEVER-TOUCHES-CHOSEN_DIR safety, `/capstone` overview shell),
So that subsequent Epic-5+ stories build on a clean slate without two-capstones-in-parallel maintenance — and the trainee's existing CHOSEN_DIRs from prior Epic-4 sessions (the `_bmad-output/capstone/<timestamp>/` dirs) remain untouched (the migration deletes portal code, not trainee artifacts).

## Acceptance Criteria

**AC1 — Files deleted (Epic 4 surface)**
The following files are removed in this story's commit:
- `src/app/capstone/[step]/page.tsx`
- `src/app/capstone/[step]/capstone-step-form.tsx` (the `<CapstoneStepForm>` Client Component)
- `src/app/capstone/[step]/page.test.ts` and any colocated tests
- `src/app/capstone/[step]/capstone-step-form.test.tsx`
- `src/app/api/capstone/save/route.ts`
- `src/app/api/capstone/save/route.test.ts`
- `src/lib/capstone/write-artifact.ts` (the `writeCapstoneArtifact` helper)
- `src/lib/capstone/write-artifact.test.ts`
- `src/lib/capstone/paths.ts` IF it's used solely by the deleted code; otherwise PRESERVE (Story 10.1's Task 1 verifies — `paths.ts` exports `CAPSTONE_DIR` constant + `sessionDir(timestamp)` + `stepFile(...)`. After Epic 5+ stories, none of these are needed by the new flow either, so deletion is safe; but Task 1 confirms with grep before removing.)
- `tests/e2e/capstone-flow.spec.ts` IF it tests the textarea flow; if it tests the overview-shell aspect (which is preserved), the file is updated rather than deleted (Story 10.2's territory).

**AC2 — Files preserved (load-bearing across the rebuild)**
- `src/app/capstone/page.tsx` (the `/capstone` overview shell — Story 4.3 surface). Preserved verbatim in this story; Story 10.2 updates the prose.
- `src/app/capstone/start-capstone-button.tsx` (the `<StartCapstoneButton>`). Preserved verbatim in this story; Story 10.2 repurposes its onClick to point at `/capstone/setup`.
- `src/lib/db/schemas.ts` — the `ProgressUpsertRequest` discriminated union including capstone-session and capstone-step kinds (per Story 4.1) is PRESERVED. Epic 5-9 stories EXTEND with new kinds (`capstone-tool`, `capstone-target`, `capstone-tool-session`, `capstone-session-lock`).
- `src/lib/db/progress-db.ts` — `getRecentCapstoneSession`, `isCapstoneSessionActive`, `markCapstoneSessionComplete`, `getCapstoneSessionById` from Story 4.1 PRESERVED. Their tests preserved.
- `src/db/schema.sql` — table shape preserved.
- `scripts/reset-progress.ts` — preserved verbatim. The "reset-progress NEVER touches the trainee's chosen capstone target directories" semantic (NFR-R3) holds: this story DOES NOT modify reset-progress; it just deletes Epic 4 code that would have been a sibling concern.
- `tests/e2e/progress-and-reset.spec.ts` — verifies reset-progress doesn't delete CHOSEN_DIRs. Preserved.

**AC3 — `<StartCapstoneButton>` interim state**
- The button currently navigates to `/capstone/<new-session-id>/brief` (Epic 4 entry).
- Story 10.1 changes the button's onClick to: navigate to `/capstone/setup-coming-soon` (a placeholder page that explains the rebuild is in progress + includes a "Reset progress" link). This is INTERIM state for the duration of Epics 5-9 dev cycle.
- Story 10.2 (or whichever Epic-6 story lands the wizard) repoints the button to `/capstone/setup` and removes the placeholder page.
- Why the placeholder instead of disabled button: a disabled button with no explanation confuses the trainee. The placeholder explicitly names the "rebuild in progress" state.

**AC4 — `_bmad-output/capstone/` README updated**
- `_bmad-output/capstone/README.md` (per architecture line 622) currently explains the timestamp-directories structure of the textarea-form artifacts. Story 10.1 updates this README to:
  - Note: "The Epic-4 capstone wrote artifacts here. The rebuilt capstone (Epic 5-9) writes to a trainee-chosen path OUTSIDE this repo. Existing dirs here are PRESERVED — they belong to prior trainees — but no new content is written by the rebuilt portal."
  - The directory itself remains in tree (it's gitignored except for the README + .gitkeep).

**AC5 — Reset-progress safety preserved (test continues to pass)**
- `tests/e2e/progress-and-reset.spec.ts` (or wherever the safety check lives) is unchanged but MUST still pass post-deletion. Specifically: a fixture creates a fake CHOSEN_DIR at `/tmp/fake-trainee-dir/` containing a marker file, runs `npm run reset-progress`, and asserts the marker file still exists. Story 10.1's deletion of `writeCapstoneArtifact` does NOT impact this — `writeCapstoneArtifact` was the WRITE path; `reset-progress.ts` only deletes `data/progress.sqlite`.

**AC6 — `/capstone` overview shell loads without runtime errors**
- The overview page (`src/app/capstone/page.tsx`) is preserved. Pre-Story-10.1, it imported helpers that may have come from now-deleted files (e.g., a "list all capstone sessions" helper that read from `_bmad-output/capstone/`). Story 10.1's Task 2 audits all imports in the page; any that resolve to deleted code are replaced or removed.
- Vitest case: render the page (Server Component) against a clean SQLite + a clean filesystem. Asserts no thrown errors; renders a sensible empty state ("No capstone sessions yet — start one!").

**AC7 — Architecture-doc drift edits**
- The architecture's §"Folder Layout" lines 380 + 622-624 reference `_bmad-output/capstone/` as the textarea-artifact location. Story 10.1 updates the architecture doc:
  - Strike the "trainee-produced capstone artifacts" comment under line 622; replace with the "PRESERVED for historical Epic-4 artifacts; rebuilt capstone writes to CHOSEN_DIR outside this repo" comment per AC4.
  - The line 380 reference to `capstone/save/route.ts` (`POST /api/capstone/save`) — this was already noted as "REMOVED by Epic 10 migration" in session-state line 98. Story 10.1's commit deletes the file and removes the reference from architecture's endpoint table (line 232 currently lists it explicitly).
- The architecture-doc edit is part of this story's commit.

**AC8 — Quad gate clean post-deletion**
- `npm run lint` clean (no orphaned imports).
- `tsc --noEmit` clean (no broken types from deleted exports).
- `npm run test:unit` clean — the deleted files' tests are also deleted; the remaining tests pass without them.
- `npm run test:e2e` clean — `capstone-flow.spec.ts` either deleted or updated to match the new shell-only state (per Task 1).
- `npm run lint:links` clean — any lesson-to-artifact references to the deleted files (e.g., a Lesson 6 link to `/capstone/<step>/brief`) are updated to point at `/capstone/setup-coming-soon` or removed.

## Tasks/Subtasks

- [ ] **Task 1 — Audit before deletion** — `grep -r 'CapstoneStepForm\|writeCapstoneArtifact\|capstone/save\|capstone/\[step\]'` to enumerate all references. Confirm each is local to Epic 4 OR is in a test that exercises Epic 4. Document findings as a comment in the commit message.
- [ ] **Task 2 — Verify `/capstone/page.tsx` post-deletion imports** — read the file; identify any imports from deleted modules; replace with a simple placeholder ("No capstone sessions yet — start one!") that doesn't depend on Epic-4 code paths.
- [ ] **Task 3 — Delete files (AC1)** — single commit deleting all enumerated files.
- [ ] **Task 4 — `<StartCapstoneButton>` interim onClick (AC3)** — repoint to `/capstone/setup-coming-soon` placeholder. Create the placeholder page at `src/app/capstone/setup-coming-soon/page.tsx` with a one-paragraph explanation.
- [ ] **Task 5 — Update `_bmad-output/capstone/README.md` (AC4)** — single rewrite.
- [ ] **Task 6 — Update architecture doc (AC7)** — strike the relevant lines; commit in same change.
- [ ] **Task 7 — Final quad gate (AC8)**.

## Dev Notes

**Architecture references:**
- §"Folder Layout" lines 380 + 622 — pre-deletion references.
- §"API & Communication Patterns → Endpoints" line 232 — `POST /api/capstone/save` listed as "Epic 4 — REMOVED by Epic 10 migration" verbatim.
- §"Architectural Boundaries" line 769 — flagged the FR-3.7 schema design point as resolved by Story 4.1; preserved.

**PRD references:**
- Session-state document `_bmad-output/implementation-artifacts/session-state-2026-05-08-rebuild-planning.md` line 98 — explicitly lists `POST /api/capstone/save` as "REMOVED by Epic 10".
- Session-state line 125 — verbatim list of what's preserved.

**Brainstorm references:**
- Session-state line 127 — DEV-order locks Epic 10 first.

**Why DEV order Epic 10 first:**

Maintaining two capstones in parallel during Epics 5-9 dev cycle would mean every story must avoid breaking the textarea form OR migrate it incrementally. Both shapes are work without value — the textarea form is going away regardless. Clean deletion at the start of dev means Epics 5-9 implement against a known-clean surface.

**Why a placeholder page instead of disabled button:**

A disabled button with no explanation confuses the trainee. The placeholder explicitly names the state ("the rebuilt capstone is being built; in the meantime, here's what's coming").

**Why `<StartCapstoneButton>` is preserved (not deleted):**

The button's identity (a single CTA in the `/capstone` overview) is right; only its destination changes. Replacing it with a different component would force lesson-to-artifact links to update. Repurposing the existing component is the smallest delta.

## Dev Agent Record

### Implementation Plan

_To be filled in by the dev agent at implementation time._

### Debug Log

_To be filled in by the dev agent during implementation._

### Completion Notes

_To be filled in by the dev agent after the quad gate is clean._

## File List

**Files DELETED:**
- `src/app/capstone/[step]/page.tsx`
- `src/app/capstone/[step]/capstone-step-form.tsx`
- `src/app/capstone/[step]/page.test.ts`
- `src/app/capstone/[step]/capstone-step-form.test.tsx`
- `src/app/api/capstone/save/route.ts`
- `src/app/api/capstone/save/route.test.ts`
- `src/lib/capstone/write-artifact.ts`
- `src/lib/capstone/write-artifact.test.ts`
- `src/lib/capstone/paths.ts` (if Task 1 confirms unused)
- `tests/e2e/capstone-flow.spec.ts` (if Task 1 classifies as Epic-4-only; otherwise updated)

**Files MODIFIED:**
- `src/app/capstone/page.tsx` (remove imports of deleted code; render simple empty state)
- `src/app/capstone/start-capstone-button.tsx` (interim onClick repoint)
- `_bmad-output/capstone/README.md` (rewrite per AC4)
- `_bmad-output/planning-artifacts/architecture.md` (strike lines per AC7)
- Lesson markdown files (if any reference the deleted paths — Task 1's audit catches)

**Files NEW:**
- `src/app/capstone/setup-coming-soon/page.tsx` (interim placeholder; Story 10.2 + Epic 6 remove)
- `_bmad-output/implementation-artifacts/10-1-delete-epic-4-textarea-surface.md` (this file)

## Change Log

- 2026-05-08 — Story file authored from session-state-2026-05-08-rebuild-planning.md §"Epic structure to author" + §"Suggested first move" line 156 (DEV order: Epic 10 first).
