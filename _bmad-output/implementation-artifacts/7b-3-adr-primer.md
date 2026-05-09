# Story 7b.3: ADR primer (Phase 7)

**Epic:** 7b — HOW Phases
**Story Key:** 7b-3-adr-primer
**Status:** done

## Story

As the developer landing Phase 7's primer (Architecture Decision Record — short-form, single-decision artifact),
I want `src/lib/capstone/primers/adr.md` to drive the trainee's AI tool through reading prior brief + PRD + architecture and producing one ADR file at `<output-folder>/adr/<NNNN>-<slug>.md` capturing one specific decision deliberately separated from the broader architecture document,
So that trainees see how teams record post-architecture decisions (the "we changed our minds about X" beat) — and the capstone's CHOSEN_DIR ends up with a real adr/ directory teams can adopt as their decision-trail home.

## Acceptance Criteria

**AC1 — Phase 7 ADR primer at `src/lib/capstone/primers/adr.md`**
- Replaces Story 5.3's placeholder.
- Content (~500-700 words; ADR is the smallest artifact in the chain — primer reflects):
  1. **Role + intent** — "You are guiding a single ADR. The trainee already has brief + PRD + architecture + epics. ADRs capture decisions made AFTER the initial architecture document, OR explicit-rationale callouts for decisions worth their own file."
  2. **Cross-phase context** — read all four prior artifacts; recap one sentence per file.
  3. **ADR shape** — required sections: `## Status` (proposed/accepted/superseded), `## Context`, `## Decision`, `## Consequences`. Optional: `## Alternatives Considered`.
  4. **Topic suggestion** — "Pick one decision worth its own file. Examples from this trainee's session: a tool choice you made and want to lock; a deferred-but-known you want to make explicit; a constraint you want every future contributor to see."
  5. **File location** — write to `<output-folder>/adr/0001-<kebab-slug>.md`. Create the `adr/` directory if missing. The numbering convention starts at `0001`; the primer instructs the agent to scan existing ADRs in CHOSEN_DIR's adr/ dir before picking a number (rare for v1's first capstone but documented behavior).
  6. **Rhythm** — short turns. The agent picks a topic and writes; minimal back-and-forth needed compared to brief/PRD/architecture.

**AC2 — ADR shape validation (already in place from Story 7a.3)**
- Story 7a.3's adr shape with required sections `['Status', 'Context', 'Decision', 'Consequences']` and minSizeBytes=200 is correct as-is.
- Story 7b.3 verifies the shape table matches the primer's instructions (sanity check between primer + gate).

**AC3 — Stub-adapter canned response for Phase 7**
- Stub branch for `phase === 'adr'`:
  1. Mocks reading prior artifacts (4 tool-call cards).
  2. Writes a stub `<output-folder>/adr/0001-stub-decision.md` with the four required sections.
  3. The stub's behavior is deliberately minimal — Phase 7 is short.

**AC4 — Vitest unit coverage**
- Primer-load smoke: file loads; primer text mentions all four required sections + the file-naming convention `0001-<slug>.md`.
- Shape-validation: a valid ADR fixture passes; an ADR missing `## Status` fails.
- Validation glob: a CHOSEN_DIR with multiple ADRs (`0001.md`, `0002.md`) — the validator picks the first match correctly.

**AC5 — Playwright e2e at `tests/e2e/capstone-phase-adr.spec.ts`**
- Pre-populates brief/prd/architecture/epics in CHOSEN_DIR. Drives the stub to write `adr/0001-stub-decision.md`. Asserts:
  - `adr/` directory created in CHOSEN_DIR.
  - File matches the shape gate.
  - Phase-done advances to Phase 8 (`/capstone/chat/<id>/dev-story-1.1`).

**AC6 — Lint, typecheck, quad gate**

## Tasks/Subtasks

- [ ] **Task 1 — Author `adr.md` primer (AC1)** — distill from BMAD's ADR template; ~500-700 words.
- [ ] **Task 2 — Verify shape table matches primer (AC2)** — read both; assert section names align.
- [ ] **Task 3 — Stub-adapter Phase 7 branch (AC3)**.
- [ ] **Task 4 — Vitest unit coverage (AC4)** — primer-load + shape glob handling.
- [ ] **Task 5 — Playwright e2e (AC5)**.
- [ ] **Task 6 — Quad gate clean (AC6)**.

## Dev Notes

**Architecture references:**
- §"Folder Layout" line 404.

**PRD references:**
- FR-3.2 line 512 — phase-7 ADR is in the chain.
- FR-3.16 — cross-phase context.

**Brainstorm references:**
- End-2 line 209 — CODEOWNERS taught with placeholder usernames; ADR phase models a concrete artifact teams keep adding to (their decision trail).

**Why ADR is short:**

ADRs are intentionally lightweight per the standard convention. The primer matches: less Socratic discovery, more "pick one decision and write it." Trainees who breeze through Phase 7 in 5-10 minutes are doing it right; trainees stuck for 30+ minutes are likely re-debating decisions captured in earlier phases.

**Why glob path for adr (Story 7a.3's shape):**

ADRs are a directory of files, not a single file. The validator picks the FIRST match — which for v1 is the only match (trainees produce one ADR). v1.1 may extend to "validate the most-recent ADR by filename ordering."

## Dev Agent Record

### Implementation Plan

_To be filled in by the dev agent at implementation time._

### Debug Log

_To be filled in by the dev agent during implementation._

### Completion Notes

_To be filled in by the dev agent after the quad gate is clean._

## File List

**Expected new files:**
- `tests/e2e/capstone-phase-adr.spec.ts`
- `_bmad-output/implementation-artifacts/7b-3-adr-primer.md` (this file)

**Expected modified files:**
- `src/lib/capstone/primers/adr.md` (placeholder → real)
- `src/lib/capstone/adapters/stub.ts` (Phase 7 branch)
- `src/lib/capstone/adapters/stub.test.ts`
- `src/lib/capstone/primers/load.test.ts`
- `src/lib/capstone/phases/validate.test.ts` (multi-ADR glob case)

## Change Log

- 2026-05-08 — Story file authored from FR-3.2/3.16 + standard ADR template + brainstorm End-2.
