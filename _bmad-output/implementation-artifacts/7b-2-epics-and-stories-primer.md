# Story 7b.2: Epics+stories primer (Phase 6)

**Epic:** 7b — HOW Phases
**Story Key:** 7b-2-epics-and-stories-primer
**Status:** ready-for-dev

## Story

As the developer landing Phase 6's primer (epic decomposition into stories — the most-structured of the WHY-to-HOW chain),
I want `src/lib/capstone/primers/epics-and-stories.md` to drive the trainee's AI tool through reading prior brief + PRD + architecture from CHOSEN_DIR and producing a structured `epics-and-stories.md` with at least one epic + at least one story per epic — under the BMAD story-template format,
So that trainees see how their PRD's FRs map to executable epics + stories with story-as-contract shape — the Lesson 3 thesis the portal teaches becomes the artifact the capstone produces.

## Acceptance Criteria

**AC1 — Phase 6 epics+stories primer at `src/lib/capstone/primers/epics-and-stories.md`**
- Replaces Story 5.3's placeholder.
- Content (~700-900 words):
  1. **Role + intent** — "You are guiding BMAD epic decomposition. The trainee has a brief, PRD, and architecture. Your job: turn the PRD's FRs into 1-3 epics with 2-5 stories each, each story under the BMAD story-template shape."
  2. **Cross-phase context** — read brief.md, prd.md, architecture.md from CHOSEN_DIR; recap key FRs.
  3. **Epic shape** — each epic has: a one-line goal, a list of FRs it covers, and 2-5 stories.
  4. **Story shape** — each story uses the BMAD story-template format (referenced at `<output-folder>/templates/story-template.md` if present, OR inline-define): `## Story X.Y: <title>` + `### Story` (As a / I want / So that) + `### Acceptance Criteria` (numbered) + `### Tasks/Subtasks`.
  5. **Output destination** — write `<output-folder>/epics-and-stories.md` AND optionally per-story files at `<output-folder>/stories/<X>.<Y>.md` for each story (the per-story files are not required by Story 7a.3's shape gate at v1; encouraged in primer text).
  6. **Sizing rhythm** — instruct the agent: "Each story should be 4-8 hours of focused dev work. If bigger, split. If smaller, combine." (Story-granularity heuristic from session-state line 140.)
  7. **Anti-patterns** — DO NOT: invent FRs the PRD didn't have; create epics with zero stories; write stories without acceptance criteria.

**AC2 — Epics-and-stories shape validation refinement**
- Story 7a.3 placeholder required `['Epic 1']` with minSizeBytes=500. Story 7b.2 EXPANDS:
  - `requiredSections: ['Epic 1']` retained (at least one epic — the section header `## Epic 1` is required).
  - Adds a custom validator: the file MUST contain at least one `## Story 1.1` (i.e., epic 1 has a first story).
  - `minSizeBytes` raised to 800 (anti-thin-output).
- The custom validator is added to `src/lib/capstone/phases/validate.ts` as a per-phase optional `customValidator` field on `PhaseShape`.

**AC3 — Stub-adapter canned response for Phase 6**
- Stub branch for `phase === 'epics-and-stories'`:
  1. Mocks reading brief/prd/architecture (tool-call cards).
  2. After "let's write the epics" trigger, writes a stub epics-and-stories.md with one epic containing two stories (1.1 and 1.2), each with the required `### Story` / `### Acceptance Criteria` / `### Tasks/Subtasks` sections.

**AC4 — Vitest unit coverage**
- Primer-load smoke: file loads; mentions BMAD story-template format; mentions cross-phase reads.
- Shape-validation tests for the expanded epics shape: valid file with `## Epic 1` + `## Story 1.1` passes; missing story header fails.

**AC5 — Playwright e2e at `tests/e2e/capstone-phase-epics.spec.ts`**
- Pre-populates brief.md + prd.md + architecture.md. Drives the stub to write epics-and-stories.md. Asserts validation passes; phase-done advances.

**AC6 — Lint, typecheck, quad gate**

## Tasks/Subtasks

- [ ] **Task 1 — Author `epics-and-stories.md` primer (AC1)**.
- [ ] **Task 2 — Custom-validator surface in shapes.ts/validate.ts (AC2)** — extend `PhaseShape` with optional `customValidator?: (content: string) => string[]` (returns missing-section-style messages) so future phases can layer additional checks. Refactor Story 7a.3's `validate.ts` to invoke it.
- [ ] **Task 3 — Stub-adapter Phase 6 branch (AC3)**.
- [ ] **Task 4 — Vitest unit coverage (AC4)**.
- [ ] **Task 5 — Playwright e2e (AC5)**.
- [ ] **Task 6 — Quad gate clean (AC6)**.

## Dev Notes

**Architecture references:**
- §"Folder Layout" line 404.

**PRD references:**
- FR-3.15/3.16 — chat + cross-phase.
- FR-5.10 line 590 — canonical BMAD story-file template (Phase 6 produces files matching it).

**Brainstorm references:**
- Theme 2 line 484 — "experience BMAD by chatting" — Phase 6 is where the story-as-contract pedagogy lands as an artifact the trainee made themselves.
- Story-granularity heuristic from session-state line 140 — primer instructs the agent.

**Why custom validators:**

Story 7a.3's required-sections check is sufficient for brief/PRD/architecture. Epics needs an additional "at least one story" check that's structural, not header-based. Adding a `customValidator` field to `PhaseShape` keeps the primary required-sections check as the simple default while letting per-phase complexity layer in. Rule of three trip: if Phases 8 and ADR also need custom validators, the pattern is established.

## Dev Agent Record

### Implementation Plan

_To be filled in by the dev agent at implementation time._

### Debug Log

_To be filled in by the dev agent during implementation._

### Completion Notes

_To be filled in by the dev agent after the quad gate is clean._

## File List

**Expected new files:**
- `tests/e2e/capstone-phase-epics.spec.ts`
- `_bmad-output/implementation-artifacts/7b-2-epics-and-stories-primer.md` (this file)

**Expected modified files:**
- `src/lib/capstone/primers/epics-and-stories.md` (placeholder → real)
- `src/lib/capstone/phases/shapes.ts` (epics row updated; `customValidator` field added)
- `src/lib/capstone/phases/validate.ts` (invoke `customValidator`)
- `src/lib/capstone/phases/shapes.test.ts`
- `src/lib/capstone/phases/validate.test.ts`
- `src/lib/capstone/adapters/stub.ts` (Phase 6 branch)
- `src/lib/capstone/adapters/stub.test.ts`
- `src/lib/capstone/primers/load.test.ts`

## Change Log

- 2026-05-08 — Story file authored from FR-3.15/3.16 + FR-5.10 + BMAD bmad-create-epics-and-stories skill + session-state line 140.
