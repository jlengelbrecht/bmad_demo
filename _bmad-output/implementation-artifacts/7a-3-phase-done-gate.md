# Story 7a.3: Phase-done gate (`POST /api/capstone/phase-done`)

**Epic:** 7a — WHY Phases (Brief + PRD)
**Story Key:** 7a-3-phase-done-gate
**Status:** done

## Story

As the developer landing FR-3.21 (phase-done is artifact-existence + shape-validation gated) and FR-3.22 (acknowledge + review),
I want `POST /api/capstone/phase-done` to verify the expected artifact file exists in CHOSEN_DIR for the named phase AND parses as markdown with the required H1 + required `##` sections per phase, advancing the session's phase pointer only on success,
So that no trainee can blindly click through to the next phase without their AI tool having actually produced an artifact of the required shape — defending against agent hallucination, silent refusal, and clickthrough at the same gate.

## Acceptance Criteria

**AC1 — `POST /api/capstone/phase-done` Route Handler exists**
- File: `src/app/api/capstone/phase-done/route.ts`.
- Body (Zod):
  ```ts
  {
    sessionId: string,           // CAPSTONE_SESSION_ID format
    phase: CapstonePhase,
    acknowledged: boolean,       // FR-3.22's checkbox state
    dryRun?: boolean,            // when true, validate without advancing
  }
  ```
- Response shape:
  ```ts
  {
    ok: true,
    valid: boolean,
    advanced: boolean,                    // true only when valid && acknowledged && !dryRun
    nextPhase: CapstonePhase | null,      // null if just-completed phase was 'dev-story-1.1'
    validation: {
      artifactExists: boolean,
      artifactPath: string,               // resolved
      shapeValid: boolean,
      missingSections: string[],          // populated when shapeValid=false
      sizeBytes?: number,
    },
  }
  ```

**AC2 — Phase-to-artifact-shape mapping**
- File: `src/lib/capstone/phases/shapes.ts` exports per-phase shape descriptors:
  ```ts
  type PhaseShape = {
    artifactPath: (chosenDir: string, outputFolder: string) => string;
    requiredH1Pattern: RegExp;
    requiredSections: string[];
    minSizeBytes: number;
  };

  const PHASE_SHAPES: Record<CapstonePhase, PhaseShape> = {
    'brief': {
      artifactPath: (cd, of) => path.join(cd, of, 'brief.md'),
      requiredH1Pattern: /^# Product Brief — /m,
      requiredSections: ['Customer', 'Problem', 'Solution', 'Success Criteria', 'Scope'],
      minSizeBytes: 500,
    },
    'prd': {
      artifactPath: (cd, of) => path.join(cd, of, 'prd.md'),
      requiredH1Pattern: /^# Product Requirements Document — /m,
      requiredSections: ['Executive Summary', 'Success Criteria', 'Product Scope', 'Functional Requirements', 'Non-Functional Requirements'],
      minSizeBytes: 1000,
    },
    'architecture': {
      artifactPath: (cd, of) => path.join(cd, of, 'architecture.md'),
      requiredH1Pattern: /^# Architecture Decision Document/m,
      requiredSections: ['Project Context', 'Core Architectural Decisions', 'Project Structure'],
      minSizeBytes: 1500,
    },
    'epics-and-stories': {
      artifactPath: (cd, of) => path.join(cd, of, 'epics-and-stories.md'),
      requiredH1Pattern: /^# Epics and Stories/m,
      requiredSections: ['Epic 1'],
      minSizeBytes: 500,
    },
    'adr': {
      artifactPath: (cd, of) => path.join(cd, of, 'adr', /* glob */ '*.md'),  // first match
      requiredH1Pattern: /^# ADR /m,
      requiredSections: ['Status', 'Context', 'Decision', 'Consequences'],
      minSizeBytes: 200,
    },
    'dev-story-1.1': {
      // Story 8 owns this — phase-done for story-1.1 ALSO requires green tests.
      // 7a.3 lands the artifact-shape part; Epic 8 layers the test-run gate.
      artifactPath: (cd, of) => path.join(cd, of, 'stories', '1.1.md'),
      requiredH1Pattern: /^# Story 1\.1/m,
      requiredSections: ['Story', 'Acceptance Criteria', 'Tasks'],
      minSizeBytes: 300,
    },
  };
  ```
- The shapes for brief and PRD are tightly aligned with Story 7a.2's primer instructions (intentional — primers tell the agent what to produce; gates verify).
- Architecture/epics/adr/dev-story-1.1 shapes are placeholders here (their primers don't exist yet — Stories 7b.X / 8.X will refine). Story 7a.3 ships the full shape table so the validation logic is one piece of code.

**AC3 — Validation function**
- `src/lib/capstone/phases/validate.ts` exports `validatePhaseArtifact(sessionId, phase): Promise<PhaseValidation>` where `PhaseValidation` is the `validation` shape from AC1.
- Logic:
  1. Look up CHOSEN_DIR + outputFolder from SQLite for the session. Return artifactExists=false with the unresolved expected path if either is missing.
  2. For non-glob paths (brief/prd/architecture/epics/dev-story-1.1): `fs.existsSync(artifactPath)` decides existence.
  3. For glob paths (adr): list `<chosenDir>/<outputFolder>/adr/*.md`; exists=true if at least one matches; pick first for shape validation.
  4. If file size < minSizeBytes: shapeValid=false; missingSections=['(file too small — under <min> bytes)'].
  5. Read file as UTF-8; check `requiredH1Pattern` matches; check each `requiredSections` value appears as `## <Section>` in the file (case-sensitive header match anchored to start-of-line via `/^## ${escape(s)}\b/m`).
  6. Return populated `PhaseValidation`.

**AC4 — Advance logic**
- When `dryRun !== true` AND `valid === true` AND `acknowledged === true`:
  - Upsert `progress` row: `kind='capstone-step'`, `id='<sessionId>/<phase>'`, `completed_at=<now-ISO>` via Story 4.1's `upsertProgress`.
  - Compute `nextPhase` per the phase-chain ordering: `brief→prd→architecture→epics-and-stories→adr→dev-story-1.1→null`.
  - On final phase (`dev-story-1.1`): also write `kind='capstone-session'` `completed_at=<now-ISO>` (calls Story 4.1's `markCapstoneSessionComplete` if available).
- When `acknowledged === false`: response includes `valid: <derived>` but `advanced: false`. Client surfaces "Please confirm you've read the artifact" via the ack checkbox.
- When `dryRun === true`: ALWAYS `advanced: false`; pure validation read-out.

**AC5 — Story 7a.1's phase-done button now uses real validation**
- Story 7a.1 stubbed `POST /api/capstone/phase-done?dryRun=1` to enable/disable the button; Story 7a.3 wires the real handler.
- The dry-run pre-check fires (a) on page load, (b) when the ack checkbox is checked, and (c) on a 5-second polling interval while the page is open and ack is checked (so a trainee whose agent finishes mid-page-load gets the button enabled without manual reload).
- The polling stops when the page is hidden (visibilitychange).

**AC6 — Vitest unit coverage**
- `phases/shapes.test.ts`: each phase's pattern matches a sample valid artifact; mismatched H1 fails; missing sections are reported.
- `phases/validate.test.ts`: existence check on real fixtures (`mkdtempSync`); shape check with valid + invalid samples; glob path for adr; size-floor enforcement.
- `phase-done/route.test.ts`: Zod failures → 400; valid + acknowledged + non-dryrun → advances + writes progress row; valid + non-acknowledged → no advance; invalid → 200 with valid=false + populated missingSections; dryRun=true → no progress write regardless.

**AC7 — Playwright e2e at `tests/e2e/capstone-phase-done.spec.ts`**
- Drives a brief-phase scenario (using Story 7a.2's stub adapter that writes brief.md): submits a turn; clicks "View artifact" disclosure (renders content); clicks ack; asserts phase-done button enables; clicks; asserts navigation to `/capstone/chat/<id>/prd`.
- Drives an invalid-shape scenario: stub adapter writes a brief.md that's missing the `## Solution` section; ack is checked; phase-done button stays disabled; "View artifact" panel shows the validation error inline.

**AC8 — Lint, typecheck, quad gate**

## Tasks/Subtasks

- [ ] **Task 1 — Phase shapes module (AC2)** — `src/lib/capstone/phases/shapes.ts`. Lock the shape table.
- [ ] **Task 2 — Validation function (AC3)** — `validate.ts` + tests against real fs fixtures.
- [ ] **Task 3 — Route Handler (AC1, AC4)** — Zod + validate + conditional advance.
- [ ] **Task 4 — Story 7a.1 phase-done button real wiring (AC5)** — replace the stub fetch with the real call; add the polling logic.
- [ ] **Task 5 — Vitest unit coverage (AC6)**.
- [ ] **Task 6 — Playwright e2e (AC7)**.
- [ ] **Task 7 — Quad gate clean (AC8)**.

## Dev Notes

**Architecture references:**
- §"API & Communication Patterns → Endpoints" line 232 — `POST /api/capstone/phase-done` verbatim.
- §"Folder Layout" line 388 — `capstone/phase-done/route.ts` path.

**PRD references:**
- FR-3.21 line 549 — "Done with this phase" gated on artifact-existence + shape-validation.
- FR-3.22 line 550 — acknowledge + review.
- F-CRIT-3 lines 240-242 — single gate defending multiple failure modes.

**Brainstorm references:**
- F-CRIT-3 lines 240-242 — phase-done is artifact-existence + shape-validation gated. Story 7a.3 IS this critical-design-change.
- Prod-7 line 156 — phase-done = trainee click (not agent magic marker).
- Ped-1 line 360 — review-the-artifact panel (Story 7a.1's "View artifact" + Story 7a.3's validation feedback).
- Ped-2 line 363 — "I've read this and it represents my work" checkbox.

**Why all six phase shapes ship in 7a.3 even though only brief/PRD primers exist yet:**

The shape table is one piece of code; splitting forces incremental edits to a single file across 4+ stories (7a.3, 7b.X each adds a row, 8.X adds a row). Landing all six rows here, with explicit comments for the not-yet-primer-ed phases, keeps the table coherent and lets Stories 7b/8 focus on primer authoring + any phase-specific gate extensions (Epic 8's green-tests gate is the major one).

**Why polling for the phase-done dry-run pre-check:**

The agent might write the artifact mid-conversation (the trainee says "write the brief now"; the agent writes; the trainee waits). Without polling, the phase-done button only enables on page reload. 5-second polling is cheap (one fs.existsSync + one read on the server) and is gated by ack-checked + page-visible to avoid pointless work.

**Why size-floor instead of size-ceiling:**

Anti-minimum-effort (per F-CRIT-3 covering #38 — minimum-effort-pass). A 50-byte "brief.md" with the required sections is shape-valid but pedagogically empty. The size floor is conservative (500B for brief, 1000B for PRD); a real BMAD brief is 2-5KB, so 500B catches the "agent wrote literally one sentence per section" failure. v1.1 may add quality-checklist content gates (per PRD §Growth Features line 161).

## Dev Agent Record

### Implementation Plan

_To be filled in by the dev agent at implementation time._

### Debug Log

_To be filled in by the dev agent during implementation._

### Completion Notes

_To be filled in by the dev agent after the quad gate is clean._

## File List

**Expected new files:**
- `src/app/api/capstone/phase-done/route.ts`
- `src/app/api/capstone/phase-done/route.test.ts`
- `src/lib/capstone/phases/shapes.ts`
- `src/lib/capstone/phases/shapes.test.ts`
- `src/lib/capstone/phases/validate.ts`
- `src/lib/capstone/phases/validate.test.ts`
- `tests/e2e/capstone-phase-done.spec.ts`
- `_bmad-output/implementation-artifacts/7a-3-phase-done-gate.md` (this file)

**Expected modified files:**
- `src/app/capstone/chat/[sessionId]/[phase]/phase-done-button.tsx` (Story 7a.1 — replace stub fetch with real handler call + polling)
- `src/app/capstone/chat/[sessionId]/[phase]/phase-done-button.test.tsx`

## Change Log

- 2026-05-08 — Story file authored from FR-3.21/3.22 + brainstorm F-CRIT-3/Prod-7/Ped-1/Ped-2 + architecture line 232.
