---
title: BMAD Story Template
---

# BMAD story template

> **What this is.** The canonical BMAD per-story file format used in this curriculum. Pin a copy of this file in your team's repo (under `docs/`, `training/`, or wherever your team keeps reference docs) so anyone authoring a story has the load-bearing structure at hand.

> **When to use it.** Most of the time you don't write a story from scratch — you let `bmad-create-story` produce it for you. Use this template when (a) you're writing one by hand, (b) you're reviewing a story to check it has the right shape, or (c) you're teaching a teammate the format.

> **Why the structure matters.** Each section in this template prevents a specific failure mode at PR review time. Lesson 3 walks the failure modes; this template is what each section *looks like* in practice.

---

## How to use this template

1. **Copy the section between the two horizontal rules below into a new file** at `<your-output-dir>/<epic>-<n>-<short-slug>.md`. Convention in this repo: `_bmad-output/implementation-artifacts/3-3-mark-complete-ui.md` for "Epic 3, Story 3, mark-complete UI".
2. **Fill in every section.** If a section doesn't apply to your story, write *"N/A — <one-line reason>"* rather than deleting it. Future readers will assume an absent section was forgotten, not skipped.
3. **Keep the user story and acceptance criteria immutable** from the dev agent's side — the agent can edit the Dev Agent Record + Tasks/Subtasks + status; it must not rewrite the AC. (This is what keeps the story binding through review; see Lesson 3.)
4. **Number your acceptance criteria** (AC1, AC2, …). PR descriptions, code comments, and review threads will reference them by number.
5. **Link to upstream artifacts** in Dev Notes by relative path (e.g. `../../planning-artifacts/architecture.md#data-model`). The link checker (`npm run lint:links`) will catch broken paths.
6. **Optional fields can be omitted** when not relevant: "Tool used to implement" only matters when the implementer wants to record which AI tool produced the work for retrospectives or mixed-tool drift analysis.

---

## Template — copy what's below this line

```markdown
# Story <epic>.<n>: <One-line headline naming the change>

**Epic:** <epic-number> — <epic-name>
**Story Key:** <epic>-<n>-<short-slug>
**Status:** draft | ready-for-dev | in-progress | review | done | superseded

## Story

As a <role — engineer | PM | designer | lead | trainee>,
I want <the capability or change being added>,
So that <the user-facing or team-facing outcome the change unlocks>.

## Acceptance Criteria

**AC1 — <short headline naming the contract this AC pins down>**
- **Given** <precondition>
- **When** <action>
- **Then** <expected outcome>

**AC2 — <short headline>**
- **Given** <precondition>
- **When** <action>
- **Then** <expected outcome>

<!-- Add as many AC blocks as the story requires. Each AC should be testable. -->

## Dev Notes

- <Architectural context lifted from `_bmad-output/planning-artifacts/architecture.md` — only the parts relevant to this story.>
- <Reference to upstream story dependencies, e.g., "Story 3.1 introduced the schema; this story consumes it.">
- <Constraints carried over from PRD that the implementation must hold (e.g., "no egress per NFR-S1").>
- <Module / file / API surface that this story is allowed to touch; explicit no-go zones if relevant.>

## Tasks/Subtasks

- [ ] **Task 1 — <name>** — <one-line description of what gets implemented and any non-obvious detail>
- [ ] **Task 2 — <name>** — <…>
- [ ] **Task 3 — Quad gate clean** — `test:unit`, `test:e2e`, `lint`, `lint:links` all green.

<!-- The dev agent ticks these off as it works. Order matters; subsequent tasks may depend on earlier ones. -->

## Tool used to implement *(optional)*

<Claude Code | Codex | GitHub Copilot | OpenCode | other — fill in after implementation. Useful for mixed-tool retrospectives.>

## Dev Agent Record

> *Filled in during implementation, not at story-creation time. The dev agent updates this section as it works.*

### Debug log

<Notes the dev agent recorded during implementation. Failed approaches, surprising findings, decisions made.>

### Completion notes

<One paragraph after the work is done summarizing what shipped vs. what was planned, and any deviations.>

### File list

- <path/to/file/1.ts> — <new | modified>
- <path/to/file/2.test.ts> — <new | modified>
- <path/to/another/file> — <new | modified>

### Change log

| Date | Change |
|---|---|
| YYYY-MM-DD | <one-line summary of the commit or push> |

### Review findings *(optional, populated during code review)*

**Patches (resolved):**

- [ ] [Review][Patch] **<headline>** — <one-line description of the fix applied during review>

**Deferred:**

- [ ] [Review][Defer] **<headline>** — <one-line description and why it's deferred> Source: <reviewer-name | reviewer-layer> (<severity>).

**Dismissed:**

- <headline> — <one-line reason this finding was not actionable>
```

---

## Worked example

Below is a real story from this repo, rendered against the template above so you can see what each section looks like with content. It's a small story — under 100 lines — but every load-bearing field is present.

```markdown
# Story 3.4: Reset progress script

**Epic:** 3 — Trainee Progress State & Reset
**Story Key:** 3-4-reset-progress
**Status:** done

## Story

As a trainee whose local progress database has gotten into a stuck or confusing state,
I want a one-line `npm run reset-progress` script that deletes the SQLite file at the canonical path and prints what was deleted,
So that I can recover from corruption or test-pollution without needing to know where the database lives or how to find it.

## Acceptance Criteria

**AC1 — Script exists at the documented path**
- **Given** a fresh checkout of the repo
- **When** I read `package.json` scripts
- **Then** there is a `reset-progress` script that runs `tsx scripts/reset-progress.ts`

**AC2 — Script prints the absolute path it deleted**
- **Given** the SQLite file exists at `./data/progress.sqlite`
- **When** I run `npm run reset-progress`
- **Then** the script prints `Deleted: <absolute path to progress.sqlite>` and exits 0

**AC3 — Script handles the no-file case gracefully**
- **Given** the SQLite file does not exist
- **When** I run `npm run reset-progress`
- **Then** the script prints `No progress file at <path> — nothing to delete.` and exits 0

**AC4 — Dev-server hint surfaced in success output**
- **Given** the SQLite file existed and was deleted
- **When** the script completes successfully
- **Then** the success output ends with the line "If a dev server is running, restart it for the reset to take effect."

## Dev Notes

- The canonical DB path is `./data/progress.sqlite` (architecture §Data Model). The script must use the same module-level constant as `getDb()` so the path stays in lockstep.
- `BMAD_DATABASE_PATH` env override (added in Story 3.3) takes precedence; honor it in this script too.
- Use `unlinkSync` (not `unlink`) — this script is sync-by-design and we want stack traces on failure, not dropped promises.

## Tasks/Subtasks

- [x] **Task 1 — `scripts/reset-progress.ts`** — Imports `DEFAULT_DB_PATH` + the env-override resolver from `src/lib/db/connection.ts` so the path stays in sync.
- [x] **Task 2 — `package.json` script** — Added `reset-progress` runs `tsx scripts/reset-progress.ts`.
- [x] **Task 3 — Vitest cases** — happy path (file deleted, output asserted), no-file case, and an env-override case.
- [x] **Task 4 — Quad gate clean.**

## Dev Agent Record

### Debug log

`unlinkSync` on a non-existent file throws `ENOENT`; wrapped with `existsSync` check first to keep the no-file branch clean.

### Completion notes

Shipped as planned. Surfaced one deferral (the dev-server fs.watch enhancement — would let the running server pick up the reset without manual restart) — captured in `deferred-work.md`.

### File list

- `scripts/reset-progress.ts` — new
- `scripts/reset-progress.test.ts` — new
- `package.json` — modified (added script)

### Change log

| Date | Change |
|---|---|
| 2026-05-08 | Initial implementation + tests |
| 2026-05-08 | Added dev-server hint to success output (review patch) |
```

---

## Why this format

Each section in the template earns its place by preventing a specific failure mode:

| Section | Failure mode if missing |
|---|---|
| User story | Code that's technically correct but misses the user-facing intent |
| Acceptance criteria (Given/When/Then) | Stories that pass review by feel, not by spec |
| Dev Notes | Implementations that re-discover scope or contradict architecture decisions |
| Tasks/Subtasks | PRs that conflate two changes without naming them |
| Dev Agent Record | The most common AI-assisted failure: spec changing silently to match code |
| Tool used (optional) | Mixed-tool teams unable to retro on which tool produced what |
| Review Findings | Lost institutional knowledge about why a deviation was accepted |

If you find yourself wanting to drop a section, ask whether the failure mode it heads off is one your team won't hit. Most teams do hit all of them. The template is dense for a reason.

---

## See also

- [Lesson 3 — Stories as tool-agnostic contract](lessons/3-stories-as-tool-agnostic-contract.md)
- [Lesson 4 — CODEOWNERS and the gate](lessons/4-codeowners-and-the-gate.md) — what the lead reads for at the gate, expressed as a checklist that *uses* the structure of this template.
- [Lesson 5 — Working as a team](lessons/5-working-as-a-team.md) — five recovery loops, all of which involve modifying or replacing this file under different circumstances.
