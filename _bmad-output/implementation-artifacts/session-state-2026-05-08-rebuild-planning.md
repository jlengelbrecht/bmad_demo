# Session State — 2026-05-08 (Capstone Rebuild Planning)

**Purpose:** Single document a fresh session reads first to pick up where the previous session left off. Replaces `session-state-2026-05-08.md` (Epic 3 era) as the latest snapshot.

**Last session ended:** after architecture edit committed (`59eaa69`). Next step: epic + story drafting.

---

## TL;DR for the resuming agent

The trainee surfaced major feedback during a Playwright walkthrough of the Epic 4 capstone (textarea form): **the existing capstone is theatre.** Trainees type markdown into 5 textareas and the portal writes "dumb files" — they never interact with BMAD itself.

The rebuilt capstone shape: **the trainee experiences BMAD by chatting through the full artifact chain with their own local AI tool, while the portal scaffolds a fresh team repo at a path of their choosing.** Output: a working, BMAD-bootstrapped team repo with brief / PRD / architecture / epics / stories / ADR + working/tested code for story 1.1 + HANDOFF.md.

**Four planning artifacts now exist and are mutually consistent.** Your job in this session: generate Epics 5-10 + their stories from those artifacts via `bmad-create-epics-and-stories`. Story files go in `_bmad-output/implementation-artifacts/{epic-number}-{story-number}-{slug}.md`.

---

## Read these in this order (before doing anything else)

1. **This file** (you're here).
2. `_bmad-output/brainstorming/brainstorming-session-2026-05-08-1953.md` — 104 ideas across 3 techniques (Question Storming → Reverse Brainstorming → First Principles). The 22 irreducibles, 7 Critical Design Changes, 6 Threat-Model items, 6 Pedagogical defenses live here.
3. `_bmad-output/research/q-tech-decisions-2026-05-08.md` — 10 ADR-style decisions, primary-source verified (per-tool CLI surfaces, subprocess pattern, SSE choice, adapter format, ANSI handling, subprocess discipline non-negotiables).
4. `_bmad-output/planning-artifacts/prd.md` — FR-3 rewritten (7 → 30 sub-requirements); NFR-S1 + S4-S7 (subprocess discipline, sandbox, localhost-binding, path allowlist); FR-2 capstone session state; FR-5.13 Lesson 6 framing; FR-6.7 HANDOFF.md.
5. `_bmad-output/planning-artifacts/architecture.md` — new §"Capstone Runtime" section (between Frontend Architecture and Infrastructure & Deployment) with Adapter contract, v1 supported tools, Subprocess Discipline, Capstone Threat Model. Updated §API & Communication Patterns (broke "two POST endpoints" lock). Updated §Data Architecture (CHOSEN_DIR concept). Updated §Test Strategy (adapter integration tests). Updated §Folder Layout.
6. `_bmad-output/implementation-artifacts/4-1-capstone-schema.md` (and 4-2, 4-3, 4-4) — for the story-file template/shape pattern. Existing Epic 4 stories show the level of detail expected (Tasks/Subtasks with AC mapping, Dev Notes with architecture refs, Implementation Plan, Debug Log, etc.).

---

## What's locked (do not re-debate; cite when authoring stories)

### Vision (load-bearing — quote verbatim where appropriate)

> A trainee who finishes the capstone has **experienced BMAD by chatting through the full artifact chain with their AI tool**, and walks away with a fresh git repo at a path of their choosing — BMAD-installed, populated with brief.md + prd.md + architecture.md + epics.md + at least one story.md + an ADR + **working/tested code for story 1.1**, plus a HANDOFF.md they can show their team Monday morning.

### v1 capstone-runtime tools

**claude-code, codex, github-copilot.** OpenCode stays in friction-notes for portability lessons but is NOT a v1 capstone-runtime adapter (v1.1 candidate). Gemini fully out of scope (not even v2).

### Phase shape (10 phases)

| Phase | Name | Driver |
|---|---|---|
| 0 | Pre-flight (node/git/npx version checks) | wizard step |
| 0.5 | Tool selection + auth pre-check | wizard step |
| 1 | Setup wizard (project name, target dir, language, skill level) | wizard step |
| 2 | Bootstrap (`npx bmad-method install` + git init) | bootstrap subprocess |
| 3 | Brief — chat with AI tool | chat subprocess |
| 4 | PRD — chat (loads brief.md as primer) | chat subprocess |
| 5 | Architecture — chat (loads brief + PRD) | chat subprocess |
| 6 | Epics + stories — chat (loads brief + PRD + arch) | chat subprocess |
| 7 | ADR — chat (loads all prior) | chat subprocess |
| 8 | Dev story 1.1 — chat + green-tests gate | chat subprocess |
| 9 | Handoff — generate HANDOFF.md | bootstrap subprocess |

### Subprocess pattern

- Plain `child_process.spawn` (NO node-pty).
- **Spawn-per-message** with session continuity via tool-native `--resume <session-id>`. (Pivoted from "long-running per phase" because Claude Code's stdin NDJSON schema is officially undocumented; spawn-per-message gives free crash recovery via `--resume`.)
- Single `runStreaming(opts): AsyncIterable<ProcEvent>` module. Chat consumer streams to SSE; bootstrap consumer collects-and-returns.
- ANSI stripped server-side via `util.stripVTControlCharacters` (Node 20+).

### Browser transport

SSE via Next.js Route Handler with `runtime='nodejs'`, `dynamic='force-dynamic'`. Browser uses native `EventSource`. WebSocket and plain ReadableStream rejected (rationale in research doc).

### Adapter format

Hybrid TypeScript class + manifest. One adapter per tool. See architecture's §"Capstone Runtime → AI Tool Abstraction Layer" for the verbatim `ToolAdapter` interface.

### Subprocess discipline (NFR-S4 — 7 non-negotiables)

1. Drain stdout AND stderr unconditionally (anti-pipe-buffer-deadlock).
2. Never pass `detached: true`.
3. Honor `AbortSignal` from incoming Request; SIGTERM child on tab close.
4. Global `process.on('exit'|'SIGINT'|'SIGTERM')` SIGTERMs all tracked children.
5. Always pass `cwd` explicitly.
6. Always argv-style spawn (no shell-string interpolation).
7. Subprocess.log per session (every spawn writes stderr to `<session-dir>/subprocess.log`).

### Threat model (TM-1 through TM-6)

- TM-1: Adapter sandboxing (agent file ops constrained to CHOSEN_DIR).
- TM-2: Path-write allowlist (refuse cwd, ~/.ssh, etc.).
- TM-3: Subprocess lifecycle ownership.
- TM-4: Localhost-binding lock (127.0.0.1 only).
- TM-5: BMAD version pin (matches portal's `_bmad/_config/manifest.yaml`).
- TM-6: Tool-version drift detection per adapter.

### Architecture endpoints (locked)

- POST /api/progress (Epic 3 surface, stable)
- POST /api/capstone/setup/{preflight, tool-check, bootstrap, abort} (Epic 6)
- GET /api/capstone/chat/[sessionId]/stream (SSE — Epic 7+)
- POST /api/capstone/phase-done (Epic 7+)
- POST /api/capstone/handoff/generate (Epic 9)
- POST /api/capstone/save (Epic 4 — REMOVED by Epic 10 migration)

### Folder layout (locked)

```
src/lib/capstone/adapters/{index.ts, types.ts, claude-code.ts, codex.ts, github-copilot.ts}
src/lib/capstone/subprocess/{run-streaming.ts, tracked-children.ts}
src/lib/capstone/sessions/  bootstrap/  primers/  handoff/
src/app/capstone/setup/{page.tsx, wizard/page.tsx, bootstrap/page.tsx}
src/app/capstone/chat/[sessionId]/[phase]/page.tsx
src/app/capstone/handoff/[sessionId]/page.tsx
data/capstone-sessions/<session-id>/subprocess.log
```

---

## Epic structure to author

**PLAN order (numbering for the planning artifacts):**

| Epic | Title | Scope summary |
|---|---|---|
| 5 | Capstone runtime foundation | AI Tool Abstraction Layer (adapter interface + claude-code reference adapter), `runStreaming` module + subprocess discipline, SSE chat-stream Route Handler shape, Phase 0 pre-flight surface. |
| 6 | Setup wizard + bootstrap | Phases 0.5/1/2: tool selection + auth pre-check, multi-step wizard, path picker + allowlist, install-command transparency, abort+cleanup, post-bootstrap pause + "what BMAD just did" explainer. |
| 7a | WHY phases — brief + PRD | Phases 3-4. Open-ended Socratic chat shape. Phase-done gate (artifact-existence + shape validation + acknowledge). Cross-phase context loading from CHOSEN_DIR. |
| 7b | HOW phases — architecture + epics+stories + ADR | Phases 5-7. More structured chat shape. Same gate model as 7a. |
| 8 | Phase 8 — dev story 1.1 with green-tests gate | Code implementation phase. Phase-done refuses Done on red tests. |
| 9 | Handoff | HANDOFF.md generation, push helper instructions, end-of-capstone screen. |
| 10 | Migration (delete current Epic 4) | Delete `<CapstoneStepForm>`, `writeCapstoneArtifact`, `/api/capstone/save`, current `/capstone/[step]/page.tsx`. PRESERVE: `<StartCapstoneButton>` (repurposed), session schema (extended), reset-progress safety, `/capstone` overview shell. |

**DEV order (when implementation actually happens):** **Epic 10 first** (clears the surface, no two-capstones-in-parallel maintenance), then 5 → 6 → 7a → 7b → 8 → 9 in PLAN-numbering order.

Codex adapter (Epic 5) and github-copilot adapter (Epic 5) ship alongside claude-code; the brainstorm explicitly settled that 1 adapter at v1 risks baking claude-code-isms into the abstraction.

---

## Story authoring expectations

- Each story file lands at `_bmad-output/implementation-artifacts/{epic}-{n}-{slug}.md` (e.g., `5-1-tool-adapter-interface.md`, `6-3-path-picker-with-allowlist.md`).
- Story file format matches the Epic 3 / Epic 4 pattern visible in `4-1-capstone-schema.md` etc.: header (epic, story key, status=ready-for-dev), Story (As a / I want / So that), Acceptance Criteria (numbered + Given/When/Then), Tasks/Subtasks, Dev Notes (with architecture refs + brainstorm/research citations), Review Findings placeholder, Dev Agent Record placeholder, File List placeholder, Change Log.
- Each AC must be testable. Each task must reference an AC. Each story must trace back to one or more PRD FRs/NFRs and architecture decisions.
- Estimated story count: 25-35 across the 6 epics (Epic 5 likely 5-7 stories, Epic 6 likely 5-7, 7a likely 3-4, 7b likely 4-5, Epic 8 likely 2-3, Epic 9 likely 2-3, Epic 10 likely 2-3).

**Story granularity heuristic** (from Epic 3 retrospective): each story should land in 4-8 hours of focused dev work. If it's bigger, split. If smaller, combine.

---

## Patterns established by Epics 1-4 (carry into 5-10)

1. **Per-story CR cadence** with 3 parallel review agents (Blind Hunter / Edge Case Hunter / Acceptance Auditor) → triage → patches → commit. Caught real issues throughout Epic 4.
2. **Patches in a follow-up commit** (when the user requests them as separate commits) so review history stays visible.
3. **No React-component-level Vitest tests** at v1 (architecture lock). React surface gets source-string smokes + Playwright e2e.
4. **No AI attribution in commits/PRs/code/docs** (auto-memory).
5. **Git identity per command:** `git -c user.email=... -c user.name=...` — never modify config.
6. **Quad gate before status="review":** `npm run test:unit`, `npm run test:e2e`, `npm run lint`, `npm run lint:links` all green.

---

## Suggested first move for the resuming session

1. Read this file + brainstorm + research + PRD + architecture (~30 min context loading; in that order).
2. Invoke `bmad-create-epics-and-stories`.
3. Confirm with the user: PLAN order vs DEV order intent (the user already locked this; just verify they remember).
4. Generate Epic 5 stories first (foundational adapter + subprocess discipline). Get user feedback on the first 2-3 to calibrate granularity, then proceed through Epics 6 → 7a → 7b → 8 → 9 → 10.
5. Commit each epic's stories as a single commit (or each story as its own commit if more granular review is requested).

**Watch out for:**
- The PRD's FR numbering jumps may need cross-referencing per story (FR-3.1 through FR-3.30 are all capstone-rebuild). Don't lose the trace.
- The brainstorm's F-CRIT-N items map roughly 1:1 to architectural decisions; cite them in Dev Notes when relevant.
- Epic 10 (migration) needs a careful File List — it's a removal, not an addition. Preserve list is in this file's "What gets replaced" map and in Task #10's description.

---

## Existing tasks in the task-tracker (carry forward)

- **Task #9 (pending):** Walkability cleanup — UI nav paths to all training surfaces. Side feedback from the same walkthrough; not part of the capstone rebuild but should land at some point. ~1-2 stories.
- **Task #10 (pending):** Capstone rebuild — bootstrapping training, not textarea form. The umbrella task. Description has the full design positions + planning chain + next-action list.

---

## Commit chain at session end

```
59eaa69 Architecture: extend with Capstone Runtime + threat model + subprocess discipline
6311c53 PRD edit: FR-3 rewrite for capstone rebuild
78e0ffe Capstone rebuild planning: brainstorm + Q-Tech research
a9773df Story 4.4: /capstone/[step] per-step page with form (last pre-rebuild commit)
```

Working tree clean. Branch: `main`. No remote configured (local-only per architecture).
