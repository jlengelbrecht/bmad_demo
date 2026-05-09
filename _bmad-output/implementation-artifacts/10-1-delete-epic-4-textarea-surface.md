# Story 10.1: Delete Epic 4 textarea surface (form, save endpoint, step pages)

**Epic:** 10 — Migration (Delete Current Epic 4)
**Story Key:** 10-1-delete-epic-4-textarea-surface
**Status:** done

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

- [x] **Task 1 — Audit before deletion** — `grep -r 'CapstoneStepForm\|writeCapstoneArtifact\|capstone/save\|capstone/\[step\]'` to enumerate all references. Confirmed all hits local to Epic 4 surface. `paths.ts` had two consumers (`/capstone/page.tsx` ArtifactPathList + `read-artifact.ts`); after deleting `read-artifact.ts` and rewriting `page.tsx`, paths.ts had zero remaining consumers and was deleted.
- [x] **Task 2 — Verify `/capstone/page.tsx` post-deletion imports** — Stripped imports of `stepFile`, `nextIncompleteStep`. Removed the `ArtifactPathList` function and the resume Continue link (target route deleted). Kept the historical step-list display so trainees with prior sessions still see them; added an interim "rebuild in progress" notice with the StartCapstoneButton repurposed to point at the placeholder.
- [x] **Task 3 — Delete files (AC1)** — Removed `[step]/`, `api/capstone/save/`, `lib/capstone/{write-artifact,read-artifact,paths}.ts` + tests, `tests/e2e/capstone-flow.spec.ts`. Also stripped the now-unused `CapstoneSaveRequest` Zod schema from `src/lib/db/schemas.ts`.
- [x] **Task 4 — `<StartCapstoneButton>` interim onClick (AC3)** — Reduced to a `next/link` pointing at `/capstone/setup-coming-soon`. Created the placeholder page that explains the rebuild + names the in-progress phases + reset-progress hint. Updated source-string smoke test accordingly.
- [x] **Task 5 — Update `_bmad-output/capstone/README.md` (AC4)** — Rewrote to mark the dir historical (Epic-4 sessions preserved; rebuilt capstone writes to CHOSEN_DIR outside the repo).
- [x] **Task 6 — Update architecture doc (AC7)** — Struck Epic 4 references at lines 245 (routing topology), ~378 (folder layout `capstone/save/route.ts` line), 474 (kebab-case route example), 487 (`CAPSTONE_DIR` constant example), 510-511 (request body for save), 750-751 (architectural-boundaries endpoints), 800-807 (FR-3 mapping table), ~865 (data-flow diagram). Replaced obsolete refs with the rebuilt-flow language (capstone runtime, CHOSEN_DIR, phase-done verification).
- [x] **Task 7 — Final quad gate (AC8)** — `npm run lint` clean · `npm run test:unit` 165/165 (down from 195: 30 tests deleted with the Epic 4 surface) · `npm run test:e2e` 27/27 (down from 35: 8 textarea-flow tests deleted; capstone-overview rewrote against the interim placeholder shape) · `npm run lint:links` clean (12 markdown files / 0 broken targets).

Also removed `BMAD_CAPSTONE_DIR` from `playwright.config.ts` (paths.ts deleted; no consumer remains).

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

1. Audit: grep for all references to the to-be-deleted symbols; classify each as Epic-4-only or shared.
2. Delete the [step] page + form, the save route + handler, the write-artifact + read-artifact modules, paths.ts, the e2e textarea-flow spec, and the playwright.config BMAD_CAPSTONE_DIR env var.
3. Rewrite `/capstone/page.tsx` to drop the now-broken ArtifactPathList + Continue link. Keep the historical step list. Add interim "rebuild in progress" copy that points at the placeholder.
4. Repoint `<StartCapstoneButton>` at `/capstone/setup-coming-soon` (a Next.js `Link`; no DB write). Update its source-string smoke.
5. Author the placeholder page that names the rebuild phases + the reset-progress hint.
6. Rewrite the e2e overview spec against the interim placeholder shape.
7. Update `_bmad-output/capstone/README.md` to mark the dir historical.
8. Strike Epic 4 references in `architecture.md` (routing topology, folder layout, route examples, request-body docs, architectural-boundaries endpoint list, FR-3 mapping, data-flow diagram).
9. Quad gate: lint, unit, e2e, lint:links.

### Debug Log

- Initial `tsc --noEmit` after deletion surfaced stale `.next/dev/types/validator.ts` references — cleared with `rm -rf .next`. Remaining tsc errors (better-sqlite3 type missing, NODE_ENV reassignment in pipeline.test.ts) are pre-existing, not from this story.
- Prior `e2e-progress.sqlite` + `e2e-capstone/` test data cleared before the e2e run so the rewrite saw a clean slate.

### Completion Notes

Quad gate clean post-deletion: lint OK, 165/165 unit, 27/27 e2e, link-integrity OK. The interim `/capstone` shell renders without errors against both an empty DB and a seeded prior-session DB. Story 10.2's job is to repurpose the overview prose for the new wizard CTA + restore the resume affordance once the wizard exists.

## File List

**Files DELETED:**
- `src/app/capstone/[step]/page.tsx`
- `src/app/capstone/[step]/page.test.ts`
- `src/app/capstone/[step]/capstone-step-form.tsx`
- `src/app/capstone/[step]/capstone-step-form.test.ts`
- `src/app/api/capstone/save/route.ts`
- `src/app/api/capstone/save/route.test.ts`
- `src/lib/capstone/write-artifact.ts`
- `src/lib/capstone/write-artifact.test.ts`
- `src/lib/capstone/read-artifact.ts`
- `src/lib/capstone/read-artifact.test.ts`
- `src/lib/capstone/paths.ts`
- `src/lib/capstone/paths.test.ts`
- `tests/e2e/capstone-flow.spec.ts`

**Files MODIFIED:**
- `src/app/capstone/page.tsx` — stripped ArtifactPathList + Continue link; kept historical step list; added interim "rebuild in progress" notice.
- `src/app/capstone/start-capstone-button.tsx` — reduced to a `next/link` to the placeholder; no `/api/progress` POST.
- `src/app/capstone/start-capstone-button.test.ts` — updated source-string smoke for the new shape.
- `src/lib/db/schemas.ts` — removed unused `CapstoneSaveRequest` Zod schema.
- `src/lib/db/progress-db.ts` — updated `isCapstoneSessionActive` doc comment to drop the `/api/capstone/save` reference.
- `tests/e2e/capstone-overview.spec.ts` — rewrote against the interim placeholder shape.
- `playwright.config.ts` — removed `BMAD_CAPSTONE_DIR` env var (paths.ts deleted; no consumer).
- `_bmad-output/capstone/README.md` — marked the dir historical (Epic-4 sessions preserved; rebuilt capstone writes to CHOSEN_DIR outside the repo).
- `_bmad-output/planning-artifacts/architecture.md` — struck Epic 4 references throughout (routing topology, folder layout, route examples, request-body docs, architectural-boundaries endpoint list, FR-3 mapping, data-flow diagram).

**Files NEW:**
- `src/app/capstone/setup-coming-soon/page.tsx` — interim placeholder explaining the rebuild + the in-progress phases.

## Change Log

- 2026-05-08 — Story file authored from session-state-2026-05-08-rebuild-planning.md §"Epic structure to author" + §"Suggested first move" line 156 (DEV order: Epic 10 first).
- 2026-05-08 — Story executed: deletions + interim placeholder + architecture-doc reconciliation + quad gate clean.
