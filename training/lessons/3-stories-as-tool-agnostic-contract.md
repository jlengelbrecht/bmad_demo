---
title: Stories as tool-agnostic contract
---

# Lesson 3 — Stories as tool-agnostic contract

> **Reading time:** ~15 minutes. **Prerequisites:** Lessons 1 and 2.

## What you'll learn

- Why the **per-story file** is the unit of work in BMAD, not the planning conversation.
- The three layered artifacts that together make a story binding: the story file, `AGENTS.md`, and `.github/copilot-instructions.md`.
- What separates a good story file from a vague one — the load-bearing fields and what each is for.
- The canonical template at [`training/story-template.md`](/source/training/story-template.md) and how to use it.

This lesson is the curriculum's headline differentiator. Nothing else BMAD does matters if the story file isn't the contract.

---

## The mixed-tool team problem

Imagine two teammates working on the same epic.

Mira uses **Claude Code**. Jordan uses **GitHub Copilot**.

Without a contract, their tools default to different conventions. Mira's PR uses one error-handling pattern; Jordan's uses another. The lead opens the PRs and watches what's nominally a code review become a tooling argument: *"Why is this written this way?" "Because that's how Claude Code does it." "But Copilot does it the other way."* No one is wrong; both PRs are reasonable. But the codebase fragments.

Now imagine the same team with a story file that both Mira and Jordan read before they start. The story specifies the convention — it says *"errors flow through the central `ApiError` class; do not introduce new error shapes"* — and it carries the architecture-level context that both tools need. Mira feeds the story to Claude Code; Jordan feeds the same story to Copilot. Both PRs come back matching the spec. The lead reviews against the story, not against the tools.

That's the bet of this lesson: **the story file makes the tool difference stop mattering.** It's also the bet of the capstone — you'll experience this directly when you pick your tool and walk the same artifact chain three different teammates could walk with three different tools.

---

## The contract is layered

Calling it "the story file" is a useful shorthand, but the actual contract is three artifacts working together. All three must hold or the contract leaks.

### 1. The per-story file (per-feature context)

This is the unit of work. One story file = one PR. It contains everything the implementer needs to know about *this specific change* — the user story, the acceptance criteria, the dev notes lifted from the architecture, the tasks/subtasks. The story file is **per-feature**: it's specific to the change being made, not to the repo as a whole. You can see real ones in this repo under `_bmad-output/implementation-artifacts/` — for example [`3-3-mark-complete-ui.md`](/source/_bmad-output/implementation-artifacts/3-3-mark-complete-ui.md).

### 2. `AGENTS.md` at the repo root (per-repo context)

`AGENTS.md` carries conventions that apply across the *whole* repo and would be silly to repeat in every story: build commands, testing rules, framework version pins, no-go zones. This file is read by Claude Code, Codex, and OpenCode. When any of those tools opens the repo, it reads `AGENTS.md` first and treats it as foundational context.

`AGENTS.md` is converging as a cross-tool industry standard — in late 2025 it was donated to the Agentic AI Foundation under the Linux Foundation, with multiple CLI agents agreeing on the file format.

### 3. `.github/copilot-instructions.md` (Copilot's per-repo context)

GitHub Copilot does not (at the time of this curriculum's authoring) read `AGENTS.md`. It reads its own dotfile, `.github/copilot-instructions.md`. This file plays the same role as `AGENTS.md` for Copilot specifically. To make the contract hold across all four tools, the two files must carry **the same load-bearing constraints** — drift between them is a defect.

You can see both files at the root of this repo (after Story 12.8 lands): [`AGENTS.md`](/source/AGENTS.md), [`.github/copilot-instructions.md`](/source/.github/copilot-instructions.md). A common community pattern is making one a symlink to the other so they cannot diverge; the curriculum doesn't mandate this but it's defensible.

The headline phrase — *story-as-tool-agnostic-contract* — compresses these three artifacts into one. In practice the contract is layered: stories carry per-feature context; `AGENTS.md` and `.github/copilot-instructions.md` carry per-repo context. Both layers must hold for the contract to bite.

---

## What's in a story file

The canonical structure — the one you'll find in every story under `_bmad-output/implementation-artifacts/` — has six load-bearing sections. Each one exists for a specific failure mode it heads off.

### Title and metadata

A one-line title that names the change, plus an epic reference, a story key (used in branch names and PR titles), and a status field.

Failure mode this prevents: stories that drift from the epic they're nominally part of. The metadata makes the tie explicit.

### User story

Written in the **As a / I want / So that** form. This is the *why* — the user-facing intent of the change. The implementer reads this first to make sure they understand the goal before the acceptance criteria pin them down.

Failure mode this prevents: technically correct code that misses the point of the change.

### Acceptance criteria (AC)

The most load-bearing section. Each AC is written in the **Given / When / Then** form: a precondition, an action, an expected outcome. ACs are numbered (`AC1`, `AC2`, …) so that PR descriptions, code comments, and review threads can reference them precisely.

Good ACs are concrete enough to test against. Bad ACs are gestures — "the page should look nice" is not an AC. The skill that produces story files (`bmad-create-story`) is explicit about this; its own description warns against being lazy or skimming when extracting AC content from upstream artifacts.

Failure mode this prevents: stories that pass review by feel, not by spec.

### Dev Notes

Architectural and contextual lift from the upstream artifacts. The implementer should not have to re-read the entire architecture document to implement one story; the relevant pieces of the architecture get pulled into the story's Dev Notes. Same for upstream stories — if Story 3.3 depends on Story 3.1's database schema, the schema lives in 3.3's Dev Notes (or is referenced from it).

Failure mode this prevents: implementations that re-discover scope every time, or quietly invent behavior that contradicts an architecture decision the implementer didn't read.

### Tasks/Subtasks

A checklist the dev agent will tick off as it implements. The implementer reads this to know the order of operations. The reviewer reads this later to compare what the agent *did* against what was planned.

Failure mode this prevents: PRs that conflate two changes (refactor + feature) without naming them — making the reviewer untangle them.

### Dev Agent Record

This section is filled in *during* implementation, not at story-creation time. It contains a debug log, completion notes, the files touched, and a change log. The dev agent updates this section as it works; the human reviewer reads it to understand what shipped.

Critically, the user-story text and acceptance criteria are **immutable from the dev agent's side**. The dev agent can update the Dev Agent Record, the tasks-subtasks checkboxes, and the status field — but it cannot rewrite the AC. *This is what keeps the story binding even after the work is done* — the lead, reviewing the PR three days later, can compare the produced code against the same acceptance criteria the implementer agreed to before they started.

Failure mode this prevents: the most common AI-assisted coding failure mode — the spec changes silently to match what the code did, instead of the code changing to match the spec.

---

## A worked example

Open [`_bmad-output/implementation-artifacts/3-3-mark-complete-ui.md`](/source/_bmad-output/implementation-artifacts/3-3-mark-complete-ui.md). This is the story that produced the "Mark complete" buttons you see at the bottom of every lesson page.

Notice as you read:

- The **user story** in As/I want/So that form — three lines, but it pins down the *why* of the change.
- The **six numbered ACs** — each one in Given/When/Then form. The reviewer of the PR for this story walked these ACs, found them all met, and approved.
- The **Tasks/Subtasks** list with eight ticked-off items — and notice that the implementer's notes (e.g., "*Task 2 — `BMAD_DATABASE_PATH` env override*") flag a real surfaced regression discovered during implementation. The story carries that context forward.
- The **Review Findings** section at the bottom — patches that were applied during review (each one has a "[Review][Patch]" prefix) and items deferred to a later story (each "[Review][Defer]"). This section makes the story file a record of what shipped, not just what was planned.

This is what a good story looks like. It is not a haiku — it is dense — but every section earns its space. The implementer who picked this up could begin work without asking a single clarifying question. That is the property the curriculum is calling "the contract."

---

## What the contract DOESN'T do

Worth naming explicitly so this isn't read as a no-code framing: the story file is the *spec*, not the *work*. An engineer still:

- **Reads the produced code.** The dev agent writes against the spec, but the resulting diff is yours to review, push back on, refactor, or rewrite. The story file doesn't stop bad code from landing; the engineer reading the diff does.
- **Debugs when things go sideways.** AI-produced code fails for the same reasons human code fails — wrong assumptions, missed edge cases, framework quirks. Tracing the failure, fixing it, and re-running tests is engineering work that no contract substitutes for.
- **Owns the result.** Whatever ships under your name has your judgment behind it, regardless of which tool typed the keystrokes. The story-as-contract pattern makes review and accountability *easier*; it doesn't transfer them to the AI.

If the story is the contract, the engineer is the principal. That's the relationship to internalize before Lesson 4 (the gate) makes the contract enforceable.

---

## Where to find the canonical template

The canonical BMAD story template lives at [`training/story-template.md`](/source/training/story-template.md). Use it when:

- You are writing a story from scratch (which is rare — `bmad-create-story` does this for you).
- You are reviewing a story to check it has the load-bearing fields.
- You are pinning the format in your team's repo as a reference.

The template ends with a complete worked example so you can see the format in action.

---

## What's next

You now know what makes a story file the contract. **Lesson 4** turns the contract into something binding by introducing the **enforcement layer**: GitHub's CODEOWNERS file, branch protection rules, and the lead-approval gate. Lesson 4 also produces the [`training/lead-review-checklist.md`](/source/training/lead-review-checklist.md) — the pinnable checklist your team's lead can drop into your repo on Day 2 and use on real PRs.

Before Lesson 4, take five minutes to skim one or two more stories under `_bmad-output/implementation-artifacts/` — try [`5-1-run-streaming-subprocess-primitive.md`](/source/_bmad-output/implementation-artifacts/5-1-run-streaming-subprocess-primitive.md) or [`9-1-handoff-generator.md`](/source/_bmad-output/implementation-artifacts/9-1-handoff-generator.md). Notice how different the *content* is across stories but how identical the *structure* is. That structural consistency is exactly what makes the format binding across people, tools, and time.
