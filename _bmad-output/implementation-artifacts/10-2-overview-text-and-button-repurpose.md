# Story 10.2: `/capstone` overview text rewrite + `<StartCapstoneButton>` final repurpose

**Epic:** 10 — Migration (Delete Current Epic 4)
**Story Key:** 10-2-overview-text-and-button-repurpose
**Status:** ready-for-dev

## Story

As the developer landing the final migration story (after Epic-6's setup wizard ships, the placeholder coming-soon page from Story 10.1 must go away),
I want `/capstone/page.tsx` to carry the new chat-driven-capstone framing in its overview prose AND the `<StartCapstoneButton>` to point at `/capstone/setup` (the real Epic-6 wizard entry) — removing the `setup-coming-soon` interim placeholder,
So that the trainee's path from the overview to the rebuilt capstone is clean: `/capstone` → `<StartCapstoneButton>` click → `/capstone/setup` → tool selection → wizard → bootstrap → six chat phases → handoff.

**This story is sequenced LAST in the rebuild dev order.** It depends on Epic 6's `/capstone/setup` page existing (Story 6.1). The placeholder lives only during the Epic 5-6 dev cycle.

## Acceptance Criteria

**AC1 — `<StartCapstoneButton>` final onClick**
- Story 10.1 set the button's onClick to `/capstone/setup-coming-soon`. Story 10.2 changes it to `/capstone/setup` (Story 6.1's surface).
- Hover state + button label updated: button reads "Start the capstone" (vs. interim "Coming soon").
- Vitest case: clicking the button calls `router.push('/capstone/setup')`.

**AC2 — `/capstone/page.tsx` overview prose rewritten**
- The page's prose explains the rebuilt capstone shape:
  - "The capstone walks you through nine phases: pre-flight environment check, tool selection + auth, setup wizard, bootstrap (npx bmad-method install), then chat-driven artifact production for brief, PRD, architecture, epics+stories, ADR, and a working dev story 1.1 with green tests."
  - "You'll experience BMAD by chatting through the full artifact chain with your own local AI tool (Claude Code, Codex, or GitHub Copilot)."
  - "Time commitment: 90-120 minutes focused. You'll walk away with a fresh git repo at a path of your choosing — BMAD-installed, populated with your own brief/PRD/architecture/epics/stories/ADR + working tested code + a HANDOFF.md you can show your team Monday morning."
- The prose is committed as text in the page (Server Component) — NOT extracted to markdown. Rationale: this prose is the page's own content, not a curriculum lesson; lessons live in `training/`.
- Past-sessions list (Story 9.2 added) is preserved at the bottom of the page.
- Resume affordance (Story 4.3 already implemented; Story 9.2 extended) — preserved. If a session is in-progress, the page still offers "Resume" instead of "Start fresh".

**AC3 — `setup-coming-soon` page deleted**
- `src/app/capstone/setup-coming-soon/page.tsx` (Story 10.1's interim) is removed.
- Any lesson links pointing at it (Lesson 6's "Coming soon" framing during the dev cycle) are updated to point at `/capstone/setup` or to remove the interim mention entirely.

**AC4 — Lesson 6 framing alignment (FR-5.13)**
- `training/lessons/6-capstone.md` (the lesson that frames the capstone for the trainee per FR-5.13) needs to align with the rebuilt shape.
- Story 10.2 verifies Lesson 6's content references the new flow: tool selection, chat-driven phases, working code at the end. If the lesson was written against the Epic-4 textarea form, this story rewrites it; if it was already written against the rebuild (FR-5.13 was already in the PRD), this story just spot-checks alignment.
- Lesson 6 is plain markdown, no app-code surface — straightforward content edit.

**AC5 — `npm run lint:links` clean**
- All `/capstone/*` references in lesson markdown resolve to existing paths in the rebuilt app. Specifically:
  - `/capstone` → resolves (Story 4.3's overview).
  - `/capstone/setup` → resolves (Story 6.1).
  - Any old `/capstone/<step>/...` references (from Epic 4) — flagged + removed.

**AC6 — Vitest unit coverage**
- `<StartCapstoneButton>.test.tsx`: clicking dispatches navigation to `/capstone/setup`.
- `/capstone/page.test.ts`: renders the new prose; "Start the capstone" button visible; past-sessions list preserved.

**AC7 — Playwright e2e**
- `tests/e2e/capstone-overview.spec.ts` (or extension to existing): visits `/capstone`; clicks "Start the capstone"; lands at `/capstone/setup` (Story 6.1's tool-selection page).

**AC8 — Quad gate clean**

## Tasks/Subtasks

- [ ] **Task 1 — Verify Story 6.1's `/capstone/setup` page exists** — sanity check before repurposing the button. If 6.1 hasn't merged, this story is blocked (per the dependency note in the story header).
- [ ] **Task 2 — Repurpose button (AC1)** — change `<StartCapstoneButton>`'s onClick + label. Update tests.
- [ ] **Task 3 — Rewrite overview prose (AC2)** — server-component text. Preserve past-sessions list + resume logic.
- [ ] **Task 4 — Delete `setup-coming-soon` (AC3)** — remove the page; remove any lingering references.
- [ ] **Task 5 — Lesson 6 alignment (AC4)** — read; spot-check; rewrite if needed.
- [ ] **Task 6 — Lint:links sweep (AC5)** — fix any stragglers.
- [ ] **Task 7 — Vitest unit coverage (AC6)**.
- [ ] **Task 8 — Playwright e2e (AC7)**.
- [ ] **Task 9 — Quad gate clean (AC8)**.

## Dev Notes

**Architecture references:**
- §"Folder Layout" line 372 — `capstone/page.tsx` is the overview shell, preserved through migration.

**PRD references:**
- FR-5.13 line 593 — Lesson 6 frames the rebuilt capstone explicitly (tool selection, chat-driven phases, time commitment, artifact list). AC4 honors.

**Brainstorm references:**
- Setup-3 line 92 — tool selection comes FIRST. AC2's prose mentions tool selection prominently.
- The rebuild's "experience BMAD by chatting" core promise (line 32 of session-state) — AC2's prose is anchored on this verb.

**Why this story is sequenced LAST:**

Per session-state line 127's DEV order: "Epic 10 first (clears the surface, no two-capstones-in-parallel maintenance), then 5 → 6 → 7a → 7b → 8 → 9 in PLAN-numbering order." Story 10.1 is the FIRST dev work; Story 10.2 is the LAST because it depends on Epic 6's `/capstone/setup` existing. The "Epic 10" label spans both ends of the dev sequence — that's intentional and documented.

**Why prose in the page rather than a markdown file:**

The capstone overview's prose is the *portal's* content (a UI page), not a *lesson*. Lessons live in `training/lessons/` and are versioned + maintained on the quarterly cadence. The overview's prose is part of the application chrome. Mixing the two would conflate the lesson-content boundary with the app-content boundary.

## Dev Agent Record

### Implementation Plan

_To be filled in by the dev agent at implementation time._

### Debug Log

_To be filled in by the dev agent during implementation._

### Completion Notes

_To be filled in by the dev agent after the quad gate is clean._

## File List

**Files DELETED:**
- `src/app/capstone/setup-coming-soon/page.tsx` (Story 10.1's interim)

**Files MODIFIED:**
- `src/app/capstone/start-capstone-button.tsx` (final onClick repoint to `/capstone/setup`)
- `src/app/capstone/start-capstone-button.test.tsx`
- `src/app/capstone/page.tsx` (overview prose rewrite)
- `src/app/capstone/page.test.ts`
- `training/lessons/6-capstone.md` (FR-5.13 alignment, if needed)
- `tests/e2e/capstone-overview.spec.ts` (or new file if absent)

**Files NEW:**
- `_bmad-output/implementation-artifacts/10-2-overview-text-and-button-repurpose.md` (this file)

## Change Log

- 2026-05-08 — Story file authored from session-state line 127 (DEV order) + FR-5.13 + brainstorm Setup-3.
