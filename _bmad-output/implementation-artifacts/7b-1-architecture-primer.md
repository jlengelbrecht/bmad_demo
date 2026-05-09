# Story 7b.1: Architecture primer (Phase 5)

**Epic:** 7b — HOW Phases
**Story Key:** 7b-1-architecture-primer
**Status:** done — SUPERSEDED (2026-05-09)

> **⚠ Superseded by the PTY pivot (commit `d677123`).** The chat surface this story produced primer content for has been replaced with an interactive PTY where the trainee invokes BMAD's own `/bmad-product-brief` / `/bmad-create-prd` / `/bmad-create-architecture` / etc. skills directly inside the launched AI tool. Phase-specific primer content lives in BMAD's skills now (`.claude/skills/bmad-*/` after install) — the portal no longer injects portal-side primers. See architecture.md editHistory `2026-05-09 — PTY pivot`.

## Story

As the developer landing Phase 5's primer (architecture decision document, more structured than the WHY phases),
I want `src/lib/capstone/primers/architecture.md` to drive the trainee's AI tool through architectural decision-making — reading prior brief.md + prd.md from CHOSEN_DIR, producing architecture.md with required sections (Project Context, Core Architectural Decisions, Project Structure) per Story 7a.3's shape gate,
So that trainees experience BMAD's HOW-phase rhythm: structured tables of decisions with rationale, not Socratic exploration.

## Acceptance Criteria

**AC1 — Phase 5 architecture primer at `src/lib/capstone/primers/architecture.md`**
- Replaces Story 5.3's placeholder.
- Content (~700-900 words) structured as:
  1. **Role + intent** — "You are guiding a BMAD-method architecture decision document. The trainee already has a brief and PRD. Your job is to elicit architectural decisions with explicit rationale, NOT to invent the architecture for them."
  2. **Cross-phase context** — "Read `<output-folder>/brief.md` and `<output-folder>/prd.md` from the current working directory. Show the trainee a one-paragraph recap of each before starting decision elicitation."
  3. **Decision categories** — required architectural-decision domains: data architecture, API & communication patterns, frontend (or backend) architecture, infrastructure & deployment, test strategy. (Lifted from BMAD's `bmad-create-architecture` skill's section list.)
  4. **Per-decision rhythm** — instruct the agent to ask: "What problem does this decision solve? What alternatives did you consider? What's the trade-off?" before recording each decision. The decision table format is enforced (see AC2).
  5. **Output template** — exact markdown shape `architecture.md` must have. Required H1 + sections per AC3.
  6. **Anti-patterns** — explicit "DO NOT" list: don't invent technology choices the trainee didn't approve; don't bypass rationale capture for a single decision; don't conflate "decision" with "preference" (decisions have alternatives + rationale).

**AC2 — Decision-table format**
- Each `## <Category>` section requires a markdown table with columns: `Decision | Choice | Rationale`. Optional 4th column: `Version` (for tech-stack rows).
- The primer instructs the agent to enforce this format. Story 7a.3's shape validator does NOT enforce the table (too brittle — the section headers are validated but in-section structure is the agent's responsibility).

**AC3 — Architecture-shape validation refinement**
- Story 7a.3 already locked the architecture shape with required sections `['Project Context', 'Core Architectural Decisions', 'Project Structure']` and minSizeBytes=1500.
- Story 7b.1 EXTENDS the required sections to: `['Project Context', 'Core Architectural Decisions', 'Implementation Patterns', 'Project Structure', 'Validation']`. Five sections aligns with BMAD's full architecture template.
- The shape table at `src/lib/capstone/phases/shapes.ts` is updated in this story (Story 7a.3 noted these as placeholders).

**AC4 — Stub-adapter canned response for Phase 5**
- Extends Story 7a.2's stub.ts: when `phase === 'architecture'`, the stub:
  1. Mocks reading brief.md and prd.md from CHOSEN_DIR (responds with simulated tool-call cards).
  2. After a "let's write the architecture" trigger, writes a stub architecture.md with the AC3 required sections + a sample decision table per section.

**AC5 — Vitest unit coverage**
- `primers/load.test.ts` extension: architecture.md loads; primer text mentions all five required sections; mentions reading brief.md and prd.md.
- `phases/shapes.test.ts` extension: updated architecture shape validates a real architecture.md fixture; rejects one missing `## Implementation Patterns`.

**AC6 — Playwright e2e at `tests/e2e/capstone-phase-architecture.spec.ts`**
- Pre-populates brief.md + prd.md in CHOSEN_DIR. Drives a turn that triggers the stub to write architecture.md. Asserts shape validation passes; phase-done advances to Phase 6.

**AC7 — Lint, typecheck, quad gate**

## Tasks/Subtasks

- [ ] **Task 1 — Author `architecture.md` primer (AC1, AC2)** — distill from BMAD's `bmad-create-architecture` skill; ~700-900 words.
- [ ] **Task 2 — Update phase-shape table (AC3)** — extend the architecture row's `requiredSections` to five entries. Update Story 7a.3's tests for the new shape.
- [ ] **Task 3 — Stub-adapter Phase 5 branch (AC4)**.
- [ ] **Task 4 — Vitest unit coverage (AC5)**.
- [ ] **Task 5 — Playwright e2e (AC6)**.
- [ ] **Task 6 — Quad gate clean (AC7)**.

## Dev Notes

**Architecture references:**
- §"Folder Layout" line 404 — primers/ directory.

**PRD references:**
- FR-3.15/3.16/3.18 — chat surface + cross-phase context + primer visibility (same as 7a stories).

**Brainstorm references:**
- Phase-3 Irreducible #12 line 408 — phases 3-7.
- Theme 3 line 487 — files are the contract; cross-phase context loads from disk.

**Why "structured chat" not "Socratic":**

Architecture decisions HAVE specific shape requirements (decision table with rationale). The primer is more prescriptive than the brief/PRD primers because the artifact's shape is more constrained. Trainees experience this as "the agent is asking sharper, more pointed questions" — that's intentional.

## Dev Agent Record

### Implementation Plan

_To be filled in by the dev agent at implementation time._

### Debug Log

_To be filled in by the dev agent during implementation._

### Completion Notes

_To be filled in by the dev agent after the quad gate is clean._

## File List

**Expected new files:**
- `tests/e2e/capstone-phase-architecture.spec.ts`
- `_bmad-output/implementation-artifacts/7b-1-architecture-primer.md` (this file)

**Expected modified files:**
- `src/lib/capstone/primers/architecture.md` (placeholder → real content)
- `src/lib/capstone/phases/shapes.ts` (architecture row's required sections expanded to 5)
- `src/lib/capstone/phases/shapes.test.ts`
- `src/lib/capstone/adapters/stub.ts` (Phase 5 canned branch)
- `src/lib/capstone/adapters/stub.test.ts`
- `src/lib/capstone/primers/load.test.ts`

## Change Log

- 2026-05-08 — Story file authored from FR-3.15/3.16 + BMAD bmad-create-architecture skill content + architecture line 404.
