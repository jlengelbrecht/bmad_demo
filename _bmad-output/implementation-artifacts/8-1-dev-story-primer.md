# Story 8.1: Dev story 1.1 primer (Phase 8)

**Epic:** 8 — Phase 8 Dev Story 1.1 with Green-Tests Gate
**Story Key:** 8-1-dev-story-primer
**Status:** done

## Story

As the developer landing Phase 8's primer (the "ends with code, not docs" pivot per FR-3.23 / F-CRIT-7),
I want `src/lib/capstone/primers/dev-story-1.1.md` to drive the trainee's AI tool through reading the produced epics-and-stories.md and architecture.md, picking story 1.1 specifically, implementing the code with tests, and confirming the test command passes,
So that trainees walk away from the capstone with WORKING TESTED CODE — not another markdown phase wearing code clothes (the brainstorm's strongest lock per Phase-3 First Principles output line 408 + the "single most important addition" per line 219).

## Acceptance Criteria

**AC1 — Phase 8 dev-story-1.1 primer at `src/lib/capstone/primers/dev-story-1.1.md`**
- Replaces Story 5.3's placeholder.
- Content (~700-900 words):
  1. **Role + intent** — "You are implementing story 1.1 from the trainee's epics-and-stories.md. Your job: write code that makes the story's acceptance criteria pass — INCLUDING the tests for those ACs. The phase advances only when the test suite is green."
  2. **Cross-phase context** — read brief.md, prd.md, architecture.md, epics-and-stories.md from CHOSEN_DIR. The story 1.1 content is critical; recap its acceptance criteria back to the trainee.
  3. **Implementation rhythm** — a TDD-leaning rhythm: (a) write the failing test first, (b) write the minimum code to pass, (c) refactor. The primer instructs the agent to pause after each step for trainee review.
  4. **Test framework discovery** — instruct the agent to detect the test framework: read `package.json` for `"test"` script; respect what's there. v1 expects most capstone repos use a Node ecosystem (the trainee picked a target dir and ran `npx bmad-method install`; BMAD's bmm module is Node-based) so `npm test` is the most common command. The primer documents this expectation.
  5. **Test discovery** — if no test command exists, the agent should propose a minimal one (e.g., add `"test": "node --test"` for Node 20+'s built-in test runner) and ask trainee approval before committing.
  6. **Output destinations** — code lands in the appropriate src/ paths (per architecture.md's structure decisions); tests in the conventional test paths.
  7. **Anti-patterns** — DO NOT: skip writing tests; mark a TODO and call done; implement features outside story 1.1's ACs; modify files not directly related.

**AC2 — Phase shape for dev-story-1.1**
- Story 7a.3's placeholder shape: artifactPath = `<output-folder>/stories/1.1.md`, requiredSections = `['Story', 'Acceptance Criteria', 'Tasks']`, minSizeBytes=300.
- Story 8.1 RETAINS this shape (the primer instructs the agent to UPDATE the existing story 1.1 file with implementation notes — File List, Dev Notes, Completion section — under existing sections; not to re-author the story).
- The ADDITIONAL gate (test-run) is layered by Story 8.2; Story 8.1 is just the primer.

**AC3 — Stub-adapter canned response for Phase 8**
- Stub branch for `phase === 'dev-story-1.1'`:
  1. Mocks reading all four prior artifacts.
  2. Writes a stub implementation: a single source file (e.g., `src/lib/example.ts`) AND a passing test file (e.g., `tests/example.test.ts`).
  3. Updates `<output-folder>/stories/1.1.md` to add an "Implementation" section.
  4. The stub repo's `package.json` has a `"test"` script that runs the test file via `node --test`. This is critical for Story 8.2's green-tests gate to have something to validate against.

**AC4 — Vitest unit coverage**
- Primer-load smoke: file loads; mentions test framework discovery + TDD rhythm + green-tests requirement.
- (No shape-table changes; existing tests cover.)

**AC5 — Playwright e2e at `tests/e2e/capstone-phase-dev-story.spec.ts` (Story 8.1 portion)**
- Pre-populates a CHOSEN_DIR with all five prior artifacts. Drives the stub to write code + test files. Asserts:
  - The stub-implemented files exist in CHOSEN_DIR.
  - The story-1.1.md has an "Implementation" section appended.
- The green-tests assertion comes from Story 8.2.

**AC6 — Lint, typecheck, quad gate**

## Tasks/Subtasks

- [ ] **Task 1 — Author `dev-story-1.1.md` primer (AC1)** — distill from BMAD's `bmad-dev-story` skill content; ~700-900 words. Include the test-framework-discovery + TDD rhythm.
- [ ] **Task 2 — Stub-adapter Phase 8 branch (AC3)** — extends `stub.ts` to write an example src + test file pair. The stub's repo state needs a `package.json` with a `"test"` script.
- [ ] **Task 3 — Vitest unit coverage (AC4)**.
- [ ] **Task 4 — Playwright e2e (AC5)** — validates the file-write portion; green-tests assertion in Story 8.2.
- [ ] **Task 5 — Quad gate clean (AC6)**.

## Dev Notes

**Architecture references:**
- §"Folder Layout" line 404.

**PRD references:**
- FR-3.23 line 554 — Phase 8 implements story 1.1 with green-tests gate.
- FR-3.2 line 512 — phase chain ends with phase 8 dev story 1.1 + phase 9 handoff.

**Brainstorm references:**
- F-CRIT-7 lines 256-258 — Phase 8 requires green tests; without it, "the 'ends with code, not docs' promise is unkept."
- End-4 lines 217-219 — "BMAD ends with code, not docs. Single most important addition; alone justifies the rebuild."
- Phase-3 Irreducible #13 line 408 — Phase 8 dev story 1.1 with green-tests gate IS irreducible.

**Why TDD-leaning rhythm:**

The primer doesn't mandate strict TDD (red-green-refactor with literal-discipline) — many trainees won't have TDD background. But the rhythm of "test first → code → confirm" is closer to TDD than "code first → test maybe later" and produces tested code by construction. Aligns with the green-tests gate's purpose.

**Why test-framework discovery instead of mandating one:**

The trainee picked CHOSEN_DIR and ran `npx bmad-method install`. The resulting repo doesn't have a test framework wired up by default — it's a BMAD scaffolding install, not a project scaffold. The primer instructs the agent to PROPOSE a framework (typically Node 20+'s built-in `node --test`) and ask the trainee, rather than imposing one. Trainees who already know vitest/jest/mocha should be free to use them.

## Dev Agent Record

### Implementation Plan

_To be filled in by the dev agent at implementation time._

### Debug Log

_To be filled in by the dev agent during implementation._

### Completion Notes

_To be filled in by the dev agent after the quad gate is clean._

## File List

**Expected new files:**
- `tests/e2e/capstone-phase-dev-story.spec.ts` (Story 8.1 portion; Story 8.2 extends with green-tests assertion)
- `_bmad-output/implementation-artifacts/8-1-dev-story-primer.md` (this file)

**Expected modified files:**
- `src/lib/capstone/primers/dev-story-1.1.md` (placeholder → real)
- `src/lib/capstone/adapters/stub.ts` (Phase 8 branch with code + test file writes)
- `src/lib/capstone/adapters/stub.test.ts`
- `src/lib/capstone/primers/load.test.ts`

## Change Log

- 2026-05-08 — Story file authored from FR-3.23 + brainstorm F-CRIT-7/End-4 + BMAD bmad-dev-story skill content.
