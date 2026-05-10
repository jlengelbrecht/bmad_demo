---
title: The artifact chain
---

# Lesson 2 — The artifact chain

> **Reading time:** ~15–20 minutes. **Prerequisite:** Lesson 1.

## What you'll learn

- The full BMAD artifact chain: brief → PRD → (UX) → architecture → epics & stories → story → dev story → review.
- What each artifact contains, what skill produces it, and what the next artifact uses it for.
- How "the file is the contract" lets a team ship coherently across people, tools, and time.

You'll see all of this concretely, because every link in this lesson points at *this repo's own* artifacts under `_bmad-output/planning-artifacts/` and `_bmad-output/implementation-artifacts/`. The portal you're reading was built with BMAD; its planning trail is the lesson material.

---

## The chain at a glance

| # | Artifact | Produced by | Lives at | Used as input by |
|---|---|---|---|---|
| 1 | **Product brief** | `bmad-product-brief` | `_bmad-output/planning-artifacts/product-brief-<project>.md` | PRD |
| 2 | **PRD** | `bmad-create-prd` | `_bmad-output/planning-artifacts/prd.md` | UX design, architecture, epics & stories |
| 3 | UX design *(optional)* | `bmad-create-ux-design` | `_bmad-output/planning-artifacts/ux-design.md` | architecture |
| 4 | **Architecture** | `bmad-create-architecture` | `_bmad-output/planning-artifacts/architecture.md` | epics & stories |
| 5 | **Epics & stories list** | `bmad-create-epics-and-stories` | `_bmad-output/planning-artifacts/epics.md` | implementation-readiness check, sprint plan, per-story files |
| 6 | Implementation-readiness report | `bmad-check-implementation-readiness` | `_bmad-output/planning-artifacts/implementation-readiness-report-*.md` | gate to Phase 4 |
| 7 | **Per-story file** | `bmad-create-story` | `_bmad-output/implementation-artifacts/<epic>-<n>-<slug>.md` | dev story execution |
| 8 | **Dev story execution** | `bmad-dev-story` | (modifies code + story file's Dev Agent Record) | code review |
| 9 | Code review | `bmad-code-review` | (review report) | next story or epic retro |
| 10 | Retrospective | `bmad-retrospective` | (retro report) | next epic |

The bolded rows are the load-bearing artifacts every BMAD project produces. The others are standard but optional or situational.

Each row constrains the next via two mechanisms:

- **Persistent context.** Most BMAD skills load `_bmad-output/planning-artifacts/` (and a `project-context.md` if present) as foundational context on activation. Downstream skills read upstream artifacts automatically.
- **Workflow input checks.** Each skill's first step scans for the upstream artifacts it needs and refuses to proceed if they're missing. The implementation-readiness report (#6 above) formalizes this as a standalone validation pass.

---

## Walking the chain through this repo

Let's walk it. You'll click into each artifact below; this is the most concrete part of the lesson.

### 1. Product brief — the "why"

📄 [`product-brief-bmad_demo.md`](/source/_bmad-output/planning-artifacts/product-brief-bmad_demo.md) (134 lines)

Produced by `bmad-product-brief`. The brief is a 1–2 page executive summary that establishes the project's purpose, problem, and solution shape. Open it and skim:

- **Executive Summary** introduces the project in two paragraphs.
- **The Problem** names the five concrete pain points BMAD-on-a-team addresses (artifact drift, unreviewed AI code, mixed-tool conflicts, etc.).
- **The Solution** frames the curriculum's headline differentiator — the **story file as a tool-agnostic contract**.

There's also a **distillate** sibling at [`product-brief-bmad_demo-distillate.md`](/source/_bmad-output/planning-artifacts/product-brief-bmad_demo-distillate.md). This is the LLM-optimized version: dense, no narrative scaffolding, optimized for being loaded as context by the PRD skill. The dual-output design — readable brief + dense distillate — is one of the things that makes downstream PRD creation efficient.

**What the next skill uses from this:** the problem statement, the headline differentiator, and the success criteria. The PRD will read all three from disk and treat them as fixed.

### 2. PRD — the "what"

📄 [`prd.md`](/source/_bmad-output/planning-artifacts/prd.md) (656 lines)

Produced by `bmad-create-prd` through a strict twelve-step facilitated workflow. The PRD turns the brief's "why" into a concrete "what" — the functional requirements the system must support and the non-functional constraints it must hold.

Open the PRD and notice:

- It cites the brief explicitly. Every major design decision references back to a brief section. This is what "the file is the contract" looks like in practice.
- It has **functional requirements (FRs)** — load-bearing capabilities like `FR-3` (Capstone Harness) and `FR-5.4` (the five named failure-mode recovery loops you'll meet in Lesson 5).
- It has **non-functional requirements (NFRs)** — `NFR-S1` (no egress), `NFR-P4` (facilitator prep under 2 hours), etc.
- It contains explicit **journey narratives** (the trainee, the lead, the facilitator) that the architecture will turn into routes and components.

The PRD is rigorous because everything downstream depends on it. If the PRD is vague on a requirement, the architecture will guess; if the architecture guesses, the stories will be vague; if the stories are vague, the implementer will guess. BMAD calls this the artifact chain because slack at any link propagates.

**What the next skill uses from this:** every FR and NFR. The architecture document will quote them by ID and resolve each one to a concrete design choice.

### 3. UX design *(optional)*

📄 [`ux-design.md`](/source/_bmad-output/planning-artifacts/ux-design.md) (1352 lines)

Produced by `bmad-create-ux-design` — owned by the UX-designer agent. Optional in BMAD; load-bearing for any project with a non-trivial UI. Not every project needs it (a CLI or a backend service might skip).

This portal does have one. It walks every screen, every interaction, every breakpoint, and links each one back to the PRD's user-journey requirements.

### 4. Architecture — the "how"

📄 [`architecture.md`](/source/_bmad-output/planning-artifacts/architecture.md) (1160 lines)

Produced by `bmad-create-architecture` — owned by the system-architect agent. The architecture document turns the PRD's *what* into a concrete *how*: technologies, data models, route handlers, subprocess discipline, threat model, deployment shape.

Architecture documents in BMAD have a specific property worth noticing: they contain **decision records** inline. When the architecture made a choice between two viable options — SQLite vs. Postgres, SSE vs. WebSocket, server-component vs. client-component — the rationale lives in the architecture document itself. At the time of this curriculum's authoring, BMAD's architecture skill emits decision rationale inside `architecture.md` rather than as a separate ADR series; future BMAD versions may ship a dedicated ADR skill — check the skill manifest in your install for what's available.

**What the next skill uses from this:** every contract the implementation must hold. The epics-and-stories step reads the architecture and decomposes its commitments into stories the dev agent can execute against.

### 5. Epics & stories list — the **backlog**

📄 [`epics.md`](/source/_bmad-output/planning-artifacts/epics.md) (1638 lines, the largest artifact in the chain)

Produced by `bmad-create-epics-and-stories`. This artifact is the project's **backlog index** — every story the project needs, organized by user value into epics. An **epic** is a body of related stories that ships together (e.g., "Epic 3 — Trainee Progress State & Reset"). A **story** is a single, reviewable unit a developer can pick up and ship as one PR.

Each story entry in `epics.md` is **summary-level**: a one-line title, a brief user-story statement, 3–6 high-level acceptance criteria, maybe a sentence of context. ~10–20 lines per story.

This portal's `epics.md` lists Epics 1–13 with ~50 stories total. Each epic has a paragraph of context plus its story entries.

> **The distinction that matters here.** `epics.md` is the *index*, not the implementation specs. The detailed per-story spec (Given/When/Then ACs, dev notes, tasks/subtasks, Dev Agent Record) doesn't exist yet — it gets produced **lazily, one story at a time**, when implementation actually starts. See artifact #7 below for what that detailed file looks like.

### 6. Implementation-readiness report

📄 [`implementation-readiness-report-2026-05-08.md`](/source/_bmad-output/planning-artifacts/implementation-readiness-report-2026-05-08.md) (231 lines)

Produced by `bmad-check-implementation-readiness`. This is BMAD's gate between planning and implementation — a traceability check that walks every PRD requirement and asks: "Is there a story that implements this? Is there an architecture decision that supports it?" Drift between the PRD, the architecture, and the epics surfaces here, before any code is written.

Skim ours. It's where this portal caught its own gaps before Phase 4 kicked off.

### 7. Per-story implementation spec — the contract for one PR

📁 `_bmad-output/implementation-artifacts/` (about 50 files — see for example [`3-3-mark-complete-ui.md`](/source/_bmad-output/implementation-artifacts/3-3-mark-complete-ui.md))

Produced **one-at-a-time, lazily, at implementation time** by `bmad-create-story`. This is the artifact that makes the per-PR contract real. The skill's own description states it explicitly: *"Your purpose is NOT to copy from epics — it's to create a comprehensive, optimized story file that gives the dev agent EVERYTHING needed for flawless implementation."*

A per-story implementation spec contains:

- The user story (As a / I want / So that)
- **Full** acceptance criteria in Given/When/Then form (where the backlog had summary-level)
- A "Dev Notes" section with relevant context lifted from the **current** architecture
- A "Tasks/Subtasks" checklist the dev agent will tick off during implementation
- A "Dev Agent Record" section (filled in *during* implementation, not at story-creation time)

A story entry in `epics.md` is ~15 lines; the corresponding per-story spec file is **typically 100–300 lines**. The expansion is where summary-level intent becomes implementation-ready detail.

> **Why this is split into two artifacts.** You could imagine a single doc that contains every story at full implementation detail up front. BMAD deliberately doesn't:
>
> 1. **Most stories never ship.** Backlogs are aspirational; teams typically deliver ~60% of what gets planned. Producing 200-line implementation specs for every story up front would be wasted work.
> 2. **Architecture context drifts.** Story 1.1's Dev Notes pull from the current architecture; by the time Story 1.10 is implemented, that architecture has been refined by stories 1.2–1.9. Lazy expansion at implementation time pulls *current* context, not stale context.
> 3. **The detailed spec is the per-PR contract.** Lesson 3's *story-as-tool-agnostic-contract* is the per-implementation file, not the backlog entry. The backlog entry doesn't need to be tool-agnostic; the implementation spec does.

Open [`3-3-mark-complete-ui.md`](/source/_bmad-output/implementation-artifacts/3-3-mark-complete-ui.md) — and notice that you could hand this file to any of Claude Code, Codex, or GitHub Copilot and they'd produce the same set of files in the same shape. **That is the tool-agnostic contract claim made physical.** Lesson 3 returns to this property.

### 8. Dev story execution — implementation

Produced by `bmad-dev-story` — owned by the developer agent. The dev agent reads the story file, executes its tasks in order, modifies the codebase, and updates the story file's Dev Agent Record + status as it goes. The skill enforces single-shot execution: it does not stop at "milestones" or "session boundaries" — it runs until every acceptance criterion is satisfied or it hits an explicit halt condition.

What the dev agent is allowed to modify in the story file is bounded: tasks/subtasks checkboxes, the Dev Agent Record, the file list, the change log, and the status. The story's user-story text and acceptance criteria are immutable from the dev agent's side. *That* is what keeps the story binding even after it's been implemented — the lead, reviewing the PR later, can compare the produced code against the same acceptance criteria the implementer agreed to.

### 9 & 10. Review and retrospective

`bmad-code-review` runs three adversarial review layers in parallel against the produced code: a **Blind Hunter** that doesn't see the spec and tries to break the code from cold; an **Edge Case Hunter** that walks every branching path; an **Acceptance Auditor** that checks the code against the story's acceptance criteria. Findings get triaged into actionable categories.

`bmad-retrospective` runs at the end of an epic. You can find ours under `_bmad-output/implementation-artifacts/`: [`epic-1-retro-2026-05-08.md`](/source/_bmad-output/implementation-artifacts/epic-1-retro-2026-05-08.md), [`epic-3-retro-2026-05-08.md`](/source/_bmad-output/implementation-artifacts/epic-3-retro-2026-05-08.md), [`epic-5-and-6-retro-2026-05-09.md`](/source/_bmad-output/implementation-artifacts/epic-5-and-6-retro-2026-05-09.md). Each captures what went well, what didn't, and what changes carry forward to the next epic.

---

## Why the chain matters for a team

Three properties make the chain different from "just write good docs":

**1. Each artifact constrains the next.** This is mechanical, not aspirational. The PRD reads the brief from disk and refuses to invent goals not grounded in it. The architecture reads the PRD and refuses to design for requirements that don't exist. The story files read the architecture and decompose its commitments. Slack at any link propagates downstream — but so does *rigor*. The harder you push on the brief, the easier every downstream artifact is to write.

**2. The chain produces a contract, not a conversation.** Files are durable. Conversations are not. When an implementer picks up a story three weeks after the planning meeting, they don't have to remember what was said — they read the story file. When a new teammate joins mid-epic, they don't have to be brought up to speed verbally — they read the artifacts. This is what Lesson 5 will call "stories propagate; conversations don't."

**3. The chain is tool-agnostic by construction.** Every artifact is a markdown file with a known structure. Claude Code, Codex, GitHub Copilot, and any tool that comes after them can read the same files. Lesson 3 is the lesson that makes this real — and the capstone is where you'll experience it.

---

## Where to look next

You've now seen every artifact BMAD produces. The next two lessons go deeper on the most load-bearing one — the per-story file:

- **Lesson 3** — *Stories as tool-agnostic contract.* Why a story file is the unit of work, what makes a good one, and the canonical template you'll use.
- **Lesson 4** — *CODEOWNERS and the gate.* The team-rituals layer that turns a story file from a social agreement into an enforced contract.

For now, if anything in the chain felt unfamiliar, just open the linked artifact and skim. Every claim in this lesson resolves to a file you can read. That's the property the curriculum is built on.
