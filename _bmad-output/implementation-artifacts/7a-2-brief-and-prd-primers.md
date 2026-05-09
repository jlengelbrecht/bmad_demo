# Story 7a.2: Brief (Phase 3) + PRD (Phase 4) primers

**Epic:** 7a — WHY Phases (Brief + PRD)
**Story Key:** 7a-2-brief-and-prd-primers
**Status:** done — SUPERSEDED (2026-05-09)

> **⚠ Superseded by the PTY pivot (commit `d677123`).** The chat surface this story produced primer content for has been replaced with an interactive PTY where the trainee invokes BMAD's own `/bmad-product-brief` / `/bmad-create-prd` / `/bmad-create-architecture` / etc. skills directly inside the launched AI tool. Phase-specific primer content lives in BMAD's skills now (`.claude/skills/bmad-*/` after install) — the portal no longer injects portal-side primers. See architecture.md editHistory `2026-05-09 — PTY pivot`.

## Story

As the developer landing the actual Phase 3 (brief) and Phase 4 (PRD) BMAD-skill content per FR-3.15/3.16,
I want `src/lib/capstone/primers/brief.md` and `src/lib/capstone/primers/prd.md` to contain real BMAD-skill markdown that drives the trainee's AI tool through Socratic discovery — open-ended questioning that produces a structured `brief.md` (Phase 3) or a `prd.md` referencing the produced brief (Phase 4) — replacing Story 5.3's placeholder stubs,
So that trainees experience the BMAD method's WHY-phase rhythm authentically (the brainstorm's "experience BMAD by chatting" lock) and downstream phase-done validation (Story 7a.3) has a known artifact shape to validate against.

## Acceptance Criteria

**AC1 — Phase 3 brief primer at `src/lib/capstone/primers/brief.md`**
- Replaces Story 5.3's placeholder.
- Content (~600-800 words; the actual primer markdown) is structured as:
  1. **Role + intent block** — "You are guiding a BMAD-method product brief discovery. The trainee is your collaborator. Your job is to ask Socratic questions across discovery dimensions until you have enough to produce a structured brief."
  2. **CHOSEN_DIR awareness** — explicit instruction: "Write the produced brief to `<output-folder>/brief.md` in the current working directory. Do NOT modify any other files in this turn."
  3. **Discovery dimensions** — five required brief sections (lifted from the existing `_bmad-output/planning-artifacts/product-brief-bmad_demo.md` template, distilled): customer, problem, solution shape, success criteria, scope-tier preview.
  4. **Conversational rhythm** — instruct the agent to ask 2-3 questions per turn (not all at once), summarize understanding back periodically, and only write `brief.md` when the trainee says "let's write the brief" or after ~10-15 turns of discovery.
  5. **Output template** — the exact markdown shape `brief.md` must have. Required H1 + section headers per AC4 below.
- Sourced from: BMAD's own brief-creation skill (`bmad-product-brief`) — distilled to the v1 capstone's lighter-touch needs (no facilitator depth; trainee may be solo). Reference: BMAD installed under `_bmad/`, specifically the brief-creation skill markdown.

**AC2 — Phase 4 PRD primer at `src/lib/capstone/primers/prd.md`**
- Replaces Story 5.3's placeholder.
- Content (~600-800 words):
  1. **Role + intent** — "You are guiding a BMAD-method PRD discovery. The trainee already produced a brief (`<output-folder>/brief.md`). Your first action is to read that file."
  2. **Cross-phase context** — explicit instruction: "Read `<output-folder>/brief.md` from the current working directory. Show the trainee a one-paragraph recap of what the brief said, then proceed to PRD discovery."
  3. **PRD section dimensions** — minimum required sections per the BMAD PRD template: executive summary, success criteria, project scope (MVP / growth / vision), functional requirements (FR-1, FR-2, ...), non-functional requirements (selective).
  4. **Conversational rhythm** — same Socratic 2-3-questions-per-turn pattern; emphasize "FRs are testable; vague is the failure mode."
  5. **Output template** — exact markdown shape `prd.md` must have, with required H1 + sections.
- Sourced from BMAD's `bmad-create-prd` skill, distilled.

**AC3 — Cross-phase context loading is verbatim per FR-3.16**
- Both primers explicitly instruct the agent to read prior artifacts FROM DISK at the start of each turn — not from chat history. The brainstorm's "files are the contract" lock (Theme 3 line 487) is enforced via primer text.
- The phrasing for PRD primer's "read brief.md" is consistent across the three adapters (claude-code's tool-call card will say "▶ reading brief.md..."; codex's reasoning will mention reading; copilot will narrate "Reading the brief..."). The chat surface (Story 7a.1's `<ToolCallCard>`) renders these natively.

**AC4 — Brief-shape validation tokens**
- The brief.md primer instructs the agent to produce a file with EXACTLY this top-level structure (each `##` section is required for Story 7a.3's shape validation to pass):
  ```markdown
  # Product Brief — <project-name>

  ## Customer
  ## Problem
  ## Solution
  ## Success Criteria
  ## Scope
  ```
- Optional subsections under each `##` are encouraged but not required.

**AC5 — PRD-shape validation tokens**
- The prd.md primer instructs the agent to produce a file with this top-level structure:
  ```markdown
  # Product Requirements Document — <project-name>

  ## Executive Summary
  ## Success Criteria
  ## Product Scope
  ## Functional Requirements
  ## Non-Functional Requirements
  ```

**AC6 — Stub-adapter compatibility**
- Story 5.7's stub adapter (used in e2e tests with `CAPSTONE_USE_STUB_ADAPTER=1`) needs canned responses that:
  - For phase=brief, after a "write the brief" trigger message, simulate writing a brief.md with the AC4 shape into CHOSEN_DIR.
  - For phase=prd, after "write the prd" trigger, read the brief.md (mocked) and write a prd.md with the AC5 shape.
- The stub adapter's chat output references `brief.md` / `prd.md` so the chat-surface tool-call rendering can be e2e-validated.

**AC7 — Lint:links covers the new primers**
- `npm run lint:links` walks both primer markdown files; any inline links (e.g., to BMAD docs) must resolve to existing repo files OR documented out-links (the lint:links allowlist is extended if a new external link domain is referenced).

**AC8 — Vitest unit coverage**
- `primers/load.test.ts` (Story 5.5's helper): asserts both files load as non-empty markdown; sanity-checks that the AC4/AC5 required sections are mentioned in the primer text (a regex scan, not a structural parse — the test confirms the primer *instructs the agent* to produce those sections).
- `chat-page.test.ts` extension: visiting `/capstone/chat/<id>/brief` renders the brief primer in the panel; visiting `/capstone/chat/<id>/prd` renders the PRD primer.

**AC9 — Playwright e2e at `tests/e2e/capstone-phase-brief.spec.ts` + `capstone-phase-prd.spec.ts`**
- Brief: drive a trainee turn that triggers the stub adapter to "write the brief"; assert brief.md appears in CHOSEN_DIR with the required shape.
- PRD: pre-populate brief.md in CHOSEN_DIR; drive a turn that triggers the stub to "read brief, write PRD"; assert prd.md appears with the required shape.
- These e2e specs validate the full Story 5.7 stream + Story 7a.1 chat shell + Story 7a.2 primers chain.

**AC10 — Lint, typecheck, quad gate**

## Tasks/Subtasks

- [ ] **Task 1 — Author `brief.md` primer (AC1, AC4)** — distill from the existing `bmad-product-brief` skill content; ~600-800 words. Required-section enumeration is explicit.
- [ ] **Task 2 — Author `prd.md` primer (AC2, AC5)** — distill from `bmad-create-prd`; references brief.md.
- [ ] **Task 3 — Stub-adapter canned responses (AC6)** — extend `src/lib/capstone/adapters/stub.ts` with phase-aware response templates. The stub now branches on `phase` to produce different canned outputs.
- [ ] **Task 4 — Vitest unit coverage (AC8)** — primer-load smoke + chat-page primer rendering.
- [ ] **Task 5 — Playwright e2e (AC9)** — phase-brief and phase-prd specs.
- [ ] **Task 6 — `npm run lint:links` validation (AC7)** — confirm any out-links resolve.
- [ ] **Task 7 — Quad gate clean (AC10)**.

## Dev Notes

**Architecture references:**
- §"Folder Layout" line 404 — `src/lib/capstone/primers/` per-phase markdown.

**PRD references:**
- FR-3.15 line 540 — primer is the system-prompt-equivalent; this story produces real content.
- FR-3.16 line 541 — cross-phase context = files on disk; PRD primer's "read brief.md" instruction enforces.
- FR-3.18 line 543 — BMAD primer visible (collapsible) — Story 7a.1 renders these primers.

**Brainstorm references:**
- Prod-3 line 138 — each phase = separate conversation; cross-phase context = artifacts on disk.
- Theme 3 line 487 — files are the contract.
- Phase-3 Irreducible #12 line 408 — phases 3-7 (brief/PRD/architecture/epics+stories/ADR).

**Why distill from BMAD's own skills instead of writing from scratch:**

The brief and PRD skills already exist in BMAD's installed scaffolding. Distillation:
1. Validates that the capstone is "BMAD itself, lighter-touch" — not "a portal-specific reinterpretation."
2. Keeps the primers in sync with BMAD's evolution: the named maintainer's quarterly review (NFR-M2) re-distills if BMAD's skills change.
3. Trainee invokes the same skills natively post-capstone (per HANDOFF.md guidance, Epic 9). Symmetric experience.

**Why fixed-shape required sections:**

Story 7a.3's phase-done gate validates the artifact shape (FR-3.21). Without an enumerated required-section list in the primer, the agent's output would vary unpredictably and the gate would either be too strict (reject valid briefs that just used different section names) or too loose (accept low-quality briefs without the load-bearing dimensions). Five sections is enough to be load-bearing without being onerous.

**Defensible deviations:**

- The brief and PRD primers ship as Story 7a.2's deliverable; they are the FULL primers, not skeletons. Stories 7b.X will land architecture/epics/ADR primers; Story 8.X will land dev-story-1.1's primer. Each is bounded to its epic.
- The stub adapter's canned responses are extended in this story for phase awareness; this is a small, additive change to Story 5.7's `stub.ts`. Documented.

## Dev Agent Record

### Implementation Plan

_To be filled in by the dev agent at implementation time._

### Debug Log

_To be filled in by the dev agent during implementation._

### Completion Notes

_To be filled in by the dev agent after the quad gate is clean._

## File List

**Expected new files:**
- `tests/e2e/capstone-phase-brief.spec.ts`
- `tests/e2e/capstone-phase-prd.spec.ts`
- `_bmad-output/implementation-artifacts/7a-2-brief-and-prd-primers.md` (this file)

**Expected modified files:**
- `src/lib/capstone/primers/brief.md` (Story 5.3 placeholder → real content)
- `src/lib/capstone/primers/prd.md` (Story 5.3 placeholder → real content)
- `src/lib/capstone/adapters/stub.ts` (phase-aware canned responses)
- `src/lib/capstone/adapters/stub.test.ts` (new cases for phase-aware branches)
- `src/lib/capstone/primers/load.test.ts` (Story 5.5 — extend with primer-content sanity checks)

## Change Log

- 2026-05-08 — Story file authored from FR-3.15/3.16/3.18 + brainstorm Prod-3/Theme 3 + architecture line 404.
