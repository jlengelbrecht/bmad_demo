---
title: "Research: BMAD Team Rituals"
type: curriculum-research-input
purpose: "Planning input for the 6-lesson BMAD training curriculum — the team-rituals leg of the research tripod (alongside bmad-mechanics.md and github-governance.md)."
audience: "Curriculum author (a separate downstream agent)."
not-for: "Trainees. This is research, not lesson prose."
created: "2026-05-09"
sources:
  - _bmad-output/planning-artifacts/prd.md
  - _bmad-output/planning-artifacts/product-brief-bmad_demo.md
  - _bmad-output/planning-artifacts/product-brief-bmad_demo-distillate.md
  - _bmad-output/planning-artifacts/architecture.md
  - _bmad-output/planning-artifacts/epics.md
  - _bmad-output/implementation-artifacts/session-state-2026-05-09.md
  - _bmad-output/implementation-artifacts/9-1-handoff-generator.md
  - _bmad-output/implementation-artifacts/9-2-handoff-page.md
  - training/lessons/{1..6}*.md (placeholders at time of writing)
  - training/labs/{solo,sync,async-story-review}.md (placeholders at time of writing)
  - AGENTS.md (current minimal Next.js-rules stub)
  - https://agents.md/
  - https://developers.openai.com/codex/guides/agents-md
  - https://www.augmentcode.com/guides/how-to-build-agents-md
  - https://www.infoq.com/news/2026/03/agents-context-file-value-review/
  - https://blog.netizen.net/2026/05/07/what-security-teams-are-seeing-in-ai-generated-code/
  - https://www.aviator.co/blog/code-reviews-at-scale/
---

# BMAD Team Rituals — Research Artifact

> **Scope.** This artifact documents *BMAD-on-a-team* — the layer that sits on top of BMAD-the-framework. It is the third leg of a research tripod that grounds the 6-lesson curriculum:
>
> 1. `bmad-mechanics.md` — what BMAD-the-framework does (skills, agents, artifact chain).
> 2. `github-governance.md` — CODEOWNERS + branch protection + PR template mechanics.
> 3. **`bmad-team-rituals.md` (this file)** — what BMAD-on-a-team looks like: the *rituals*, *recovery loops*, and *dual-role files* that make BMAD adoption viable in mixed-tool teams.
>
> The thesis this artifact is grounding: **BMAD-the-framework is necessary but insufficient for a team.** Individuals can run BMAD without rituals; teams cannot. The team layer is what the official BMAD project (PRD §"What Makes This Different") and Spec Kit do not provide.

---

## 1. What "BMAD on a team" actually means

The PRD and brief frame BMAD-on-a-team as the answer to a recognized open problem in spec-driven development: **implementation faithfulness** (PRD Executive Summary; brief "The Problem" §). Beautiful planning artifacts, code that drifts from spec intent, no human gate that catches it. BMAD-the-framework produces the artifacts; BMAD-on-a-team is the discipline that makes the artifacts *bind* on the merged code.

### 1.1 The five concrete pain points the team layer addresses

From the brief's "The Problem" section:

1. **Artifact drift.** Engineers produce inconsistent specs because nothing on the team makes consistency a precondition for merging.
2. **Vibe-coded contributions land unreviewed.** AI-generated code reaches `main` without alignment.
3. **Mixed-tool teams have no shared protocol.** Different agentic tools produce different conventions.
4. **Non-engineering contributors are excluded.** PMs/designers can contribute under AI assistance but no governance pattern lets them do it safely.
5. **BMAD docs and SDD tools don't address the team layer.** Official BMAD covers the framework; Spec Kit covers spec/plan/task primitives; neither prescribes how a team adopts the rituals or gates the merge.

The team-rituals layer is the unowned wedge between (a) what BMAD itself teaches and (b) the team-coordination problem AI tooling has created. The rest of this document characterizes that layer.

### 1.2 A week in the life of a team running BMAD

Synthesized from PRD Journey 1 (Mira), Journey 2 (Priya), the FR-3 capstone phase chain (FR-3.2), the FR-5 curriculum requirements, and the brief's vision section. The intent is to give the curriculum author concrete day-to-day scenarios to translate into trainee-facing prose.

#### Monday — story-shaping (the planning beat)

- **Who writes the brief / PRD / architecture.** In a small team (~5–8 engineers, plus a PM and possibly a designer), the brief is typically authored by a PM or tech lead with PM input. The PRD is jointly authored — the lead drives, the PM contributes user-journey content, the engineers contribute technical-feasibility and FR-shape. The architecture document is owned by the lead or senior engineer. *(Source: brief "Who This Serves" — "engineers, PMs, designers, leads. Mixed coding skill, mixed AI-tool preferences"; FR-5.7 explicit coding-skill-neutral framing.)*
- **The artifact chain is run with AI tools, not by hand.** Per the rebuilt capstone (FR-3.15, FR-3.16): the team chats with their AI tool through `bmad-product-brief`, `bmad-create-prd`, `bmad-create-architecture`, `bmad-create-epics-and-stories`. Each phase reads prior artifacts from disk as context, not from chat history (FR-3.16). This matters for teams: the PM can pick up where the lead left off because the *files* are the contract, not the conversation.
- **Stories are the propagation unit.** The brief's "load-bearing abstraction" is the **story file as a tool-agnostic contract** (brief §"The Solution"; PRD §"What Makes This Special"). Once stories exist, anyone on the team — engineer, PM, designer — can pick one up and run it through their own AI tool.

#### Tuesday – Thursday — implementation (the dev beat)

- **Story propagation to implementers.** Implementer reads the story file. They run their AI tool (`bmad-dev-story <story-file>`) which produces a PR. The story file is the input; the PR is the output; nothing in the middle is private to the implementer's tool choice.
- **Mixed-tool reality.** One engineer uses Claude Code; another uses Codex; a PM uses GitHub Copilot. The PRD makes mixed-tooling a first-class lesson, not a footnote (PRD §"What Makes This Different"). What makes their PRs converge is the story file plus the dual-role context files (AGENTS.md / copilot-instructions.md — see §4).
- **The recovery loops fire here.** When an implementer can't act on a story unambiguously, when produced code drifts from spec, when two implementers' tools produce diverging conventions — Lesson 5 names the loop and the team applies it (PRD FR-5.4 — see §3 below).

#### Friday — review and merge (the gate beat)

- **PR opens with story link.** The PR template at `.github/pull_request_template.md` has an explicit story-link field (FR-6.3). Field-only at v1; CI does not enforce. Rationale (PRD FR-6.3): Lesson 4 teaches that the *lead* — not CI — enforces the contract; auto-enforcement makes the human-at-the-gate framing redundant. Adopting teams may add CI enforcement in their own fork as a teachable extension.
- **CODEOWNERS routes review.** GitHub auto-requests review from the right owner group (`@product-engineers`, `@engineering-leads`, `@product-leads` per FR-6.1). Branch protection requires the review before merge.
- **What the lead does at PR time.** Reads the linked story. Compares story to PR. Looks for spec-vs-code drift (this is what Lesson 4 is for — PRD §"Curriculum & Content Requirements" explicitly: *"Lesson 4 must teach what the lead reads for at the gate — concrete checklist items, not narrative platitudes. Lesson 4 produces a reusable, pinnable PR-review checklist artifact (`training/lead-review-checklist.md`)"*). Approves on first review, or invokes one of the five recovery loops.

#### What's intentionally *not* on this calendar

- **No daily standup ritual specific to BMAD.** The PRD does not mandate any synchronous ceremony. The team's existing ceremonies (standup, planning, retro) absorb BMAD; BMAD doesn't require new ones. *Open question: should the curriculum suggest a story-grooming ritual cadence? See §10.*
- **No portal-mediated team workflow.** The portal is a *training* tool, not a *day-2* tool. After the capstone, the team runs BMAD natively (see §9).

### 1.3 Three claims this section makes that the curriculum should make explicit

- **Stories propagate; conversations don't.** Files are the contract. Chat is for the trainee, not the agent (FR-3.30: *"On resume, the agent is re-spawned cold with the prior artifacts loaded as primer context. Files are the contract; chat is for the trainee, not the agent."*).
- **Role differentiation lives in CODEOWNERS, not in separate curriculum tracks.** PRD §"Audience and POC": *"Role differentiation lives in CODEOWNERS, not in separate curriculum tracks."* The team-rituals layer is shared; what differs by role is which lines of CODEOWNERS list which usernames.
- **The lead is the gate, not a bottleneck-by-design.** Risk #4 in the brief acknowledges concentration of load on the lead. The PRD's mitigation is Lesson 4 surfacing the failure mode + multi-owner CODEOWNERS patterns in v1.1 (PRD §"Risk Mitigations" → CODEOWNERS lead bottleneck row). The lead being *the* gate is a v1 simplification, not a permanent architecture.

---

## 2. The mixed-tool team problem and how the artifact chain solves it

### 2.1 The problem in concrete terms

Two engineers on the same team. Mira uses Claude Code. Jordan uses GitHub Copilot. They are working on the same epic.

- Without a contract: Mira's tool prefers convention A; Jordan's tool prefers convention B. The PRs land with diverging patterns. The lead sees a tooling argument disguised as a code review. Eventually the codebase fragments. *(Source: PRD Journey 1 framing — "Each PR review feels like a tooling argument."*)
- With a contract: The story file specifies the convention. Both Mira and Jordan feed the same story file to their respective tools. Both tools produce code matching the story spec. The PRs converge on the story, not on the tool's defaults. The lead reviews against the story, not against the tool's idiosyncrasies.

### 2.2 The contract is layered

The PRD specifies three layered contract artifacts that together make a tool-agnostic contract real:

1. **The story file itself** (FR-5.10 — canonical story-file template at the repo level). This is the unit of work. It includes acceptance criteria, dev notes, and references to upstream artifacts (PRD, architecture, ADR).
2. **`AGENTS.md` at the repo root** (FR-5.11 — *the tool-agnostic shared-agent-context template, read by Codex, OpenCode, Claude Code*). This carries repo-level conventions that *should not be re-stated in every story*: framework version constraints, build commands, testing rules, no-go zones.
3. **`.github/copilot-instructions.md`** (FR-5.12 — *the Copilot-specific companion to AGENTS.md*). Copilot does not (at time of PRD authoring) read AGENTS.md; it reads its own dotfile. The two files MUST stay synchronized — see §4 for the dual-role pattern in detail.

The curriculum's headline differentiator (PRD §"What Makes This Special") is "Story-as-tool-agnostic-contract." That phrase is *correct* but compresses three artifacts into one. The curriculum should expand it: stories carry per-feature context; AGENTS.md + copilot-instructions.md carry per-repo context; both layers must hold for the contract to bite.

### 2.3 Concrete proof in this repo: the three-tool capstone

The portal's capstone runtime supports three AI tools as runtime adapters: **claude-code, codex, github-copilot** (PRD FR-3.25). All three exercise the same artifact chain — they read the same primers, they produce artifacts in the same shape, they run against the same `bmad-method install`.

Per the session state document `_bmad-output/implementation-artifacts/session-state-2026-05-09.md`:

> *"Until this session, only `claude-code` had `autoRun=true` (positional `/bmad-product-brief` on launch). Codex and copilot were tagged `autoRun=false` with an amber 'type this once it loads' banner... Validated empirically on the dev box (codex 0.130.0 / copilot 1.0.44)... All three now render the green ✨ 'auto-run' banner on the chat-phase page."*

| Tool | Argv shape (from session-state-2026-05-09.md) |
|---|---|
| claude-code | `claude --dangerously-skip-permissions "<bmad-skill>"` |
| codex | `codex --dangerously-bypass-approvals-and-sandbox "<bmad-skill>"` |
| github-copilot | `copilot --allow-all-tools -i "<bmad-skill>"` |

The argv shapes differ per tool. The BMAD skill name (`<bmad-skill>` — e.g., `/bmad-product-brief`) is identical. The *contract* — what BMAD asks the tool to do — is the same; the *invocation* differs. **This is the tool-agnostic contract claim, validated.**

**Implication for the curriculum.** Lesson 5 should reference the capstone surface as the proof: trainees who picked Claude Code and trainees who picked Copilot land at the same artifact chain. If the curriculum punts to "trust us, it works the same," it's missing the load-bearing demonstration.

### 2.4 External corroboration: AGENTS.md as a converging cross-tool standard

This is the one section where external research adds value. The PRD specifies the dual-role pattern (FR-5.11/5.12) but doesn't ground it in the broader industry context. From web research:

- AGENTS.md is converging as a **cross-tool standard**. In December 2025, AGENTS.md was donated to the Agentic AI Foundation (AAIF), a directed fund under the Linux Foundation. ([agents.md](https://agents.md/), [Augment Code 2026 guide](https://www.augmentcode.com/guides/how-to-build-agents-md))
- Different tools implement it differently: Claude Code reads `CLAUDE.md` (often symlinked to AGENTS.md); Codex reads AGENTS.md natively ([OpenAI Codex docs](https://developers.openai.com/codex/guides/agents-md)); GitHub Copilot reads `.github/copilot-instructions.md` for repo-wide defaults.
- **The symlink pattern.** A common community pattern is making `CLAUDE.md` a symlink to `AGENTS.md` so the files cannot diverge. The PRD does not specify symlinking but the curriculum may want to teach it as an option.
- **Empirical caveat.** A 2026 ETH Zurich study (cited in [InfoQ March 2026](https://www.infoq.com/news/2026/03/agents-context-file-value-review/)) found that *LLM-generated* context files reduce task success rate by 3% on average; *human-written* files give a 4% lift. **The curriculum should teach humans to write these files, not delegate them to the agent.**

Why this matters for the curriculum: the dual-role pattern is not a BMAD invention. It is the cross-tool convention the industry is converging on. The curriculum can lean on that convergence rather than defending a proprietary scheme.

---

## 3. The five named failure-mode recovery loops

This is the most rigorous section the curriculum needs. PRD §FR-5.4 names the five loops; PRD §"Curriculum & Content Requirements" specifies that Lesson 5 must teach all five and **must explicitly distinguish loop #1 from loop #5** — leads conflate them at the gate.

The PRD specifies the loops; this section documents each one rigorously: the failure signal, the recovery procedure, the boundary against neighboring loops, and a worked example.

### 3.1 Loop #1 — Spec drift caught at the gate

**Definition (PRD FR-5.4 #1).** *"The lead identifies that produced code has drifted from story spec → recovery loop (revise code or revise story, not both quietly)."*

**Failure signal.** At PR-review time, the lead notices the produced code does something the story does not specify, or fails to do something the story does specify. Example: story says "the wizard shows a path picker with a Browse button"; PR ships only a text input, no Browse button.

**Recovery procedure.**

1. **The lead explicitly chooses the direction of correction**: revise the code to match the spec, OR revise the spec to match the code. **Not both quietly.**
2. If revising the code: the implementer updates the PR, re-runs their AI tool against the unchanged story, the new PR is re-reviewed.
3. If revising the spec: the implementer updates the story file *first* (in the same PR or a precursor), the lead approves the spec update, then the code is reviewed against the revised story.
4. The PR is not merged until story and code agree.

**Why this loop is distinct from #5.** This loop is for cases where the spec is *correct* but the *code drifted* (or, after inspection, the spec was correct but writing the code revealed a better path that the team prefers — and they make the spec-update explicit). Loop #5 is for cases where the *spec itself* was wrong from the start — independent of any code being written. The boundary is whether the lead's disagreement is with what was *written* (code) or what was *agreed* (spec).

**Worked example (hypothetical, grounded in this repo).** PRD FR-3.7 specifies the path picker has a Browse button that shells out to a native dialog. Imagine an implementer's AI tool ships a PR with only a text input. The lead reviews, sees the gap, says "spec calls for Browse — add it OR amend FR-3.7 to drop Browse." Implementer adds Browse. PR re-approved. This is loop #1 because the *spec was right*; the *code drifted*.

### 3.2 Loop #2 — Unclear stories

**Definition (PRD FR-5.4 #2).** *"A story file the implementer can't act on unambiguously → revise the story before implementing."*

**Failure signal.** The implementer (or their AI tool) reads the story and cannot decide what to build. Example: "make the path picker safer" without specifying what "safer" means. The implementer pings the lead; the AI tool produces a PR that does *one* of three plausible interpretations and the lead doesn't know which one was meant.

**Recovery procedure.**

1. **Stop implementing.** Loop #2's defining property is that recovery happens *before* code is written, not at the gate.
2. The implementer (or whoever spotted the ambiguity) opens an edit on the story file. The story is amended to remove the ambiguity — adding acceptance criteria, naming a specific approach, citing the relevant PRD section.
3. The story update is reviewed by the lead (this can be a lightweight async sign-off — see §6 on async checkpoints; or it can ride along the original story-creation review).
4. Implementation begins on the amended story.

**Why this loop matters separately.** Without loop #2 as a named ritual, ambiguous stories get implemented anyway and the resulting PR review degenerates into "is this what we meant?" — which is loop #1 territory but with a much higher cost (code already written, often discarded). **The loop's value is its preemption of the more expensive loop #1 case.**

**Worked example.** PRD §"Curriculum & Content Requirements" requires Lesson 4 to produce a "reusable, pinnable PR-review checklist artifact" but the FR doesn't enumerate the checklist items. An implementer asked to produce that checklist might write something the lead disagrees with — but the disagreement is about checklist *content*, not about whether to produce a checklist. Recovery: amend the story to enumerate the checklist's must-have items (e.g., "story link present? ✓; AC traced? ✓; test evidence? ✓"). Then implement.

### 3.3 Loop #3 — Mixed-tooling conflicts

**Definition (PRD FR-5.4 #3).** *"Two teammates using different AI tools produce diverging conventions for the same story → align on shared convention captured in the story or repo, not in tooling."*

**Failure signal.** Two implementers complete adjacent stories. Their tools produced different conventions for the same kind of thing — different naming, different file locations, different test patterns. Reviewing the second PR, the lead sees the inconsistency. The conflict is not "one is wrong" but "we don't have a shared answer."

**Recovery procedure.**

1. **Decide where the convention belongs.** If it's per-feature, capture it in the story (acceptance criteria or dev notes). If it's per-repo, capture it in `AGENTS.md` and `.github/copilot-instructions.md` (the dual-role files — see §4).
2. **Update both files.** Drift between AGENTS.md and copilot-instructions.md is itself a defect (per the PRD's repeated framing on dual-role drift; see also architecture.md §"Dual-role files" and the paired-pipeline analogy).
3. **Re-run the divergent PR's tool against the updated context.** The expectation is that with the convention now captured, the tool produces output that aligns.
4. **Land the convention update before merging the original PRs.** Otherwise the convention is decided implicitly by whichever PR merges first.

**Why this loop is distinct.** Loops #1 and #5 are about a single story / single PR. Loop #3 is about two PRs whose *individual* code is faithful to *their* story but where the team-level convention is undefined. The recovery is at the **AGENTS.md / repo-context layer**, not the story layer.

**Worked example.** Imagine in this repo, story 5.3 (Claude Code adapter) lands a `manifest.minVersion` shape `"2.1.x"` and story 5.4 (Codex adapter) lands `">=0.130.0"`. Both are faithful to their story files. The lead sees inconsistency. Recovery: pick one (`semver`-range strings, say), document the convention in AGENTS.md or in the adapter `types.ts`, update both adapters, *then* merge.

### 3.4 Loop #4 — Story too big to land in one PR

**Definition (PRD FR-5.4 #4).** *"Implementer (or lead, at the gate) recognizes the story exceeds a single reviewable change → split before implementing, not after."*

**Failure signal.** The implementer (often via their AI tool's protest, or via their own pre-flight read of the story) realizes the story has too many acceptance criteria, touches too many files, or has irreducible subgoals that should be reviewed separately. *Or* the lead, mid-review, realizes the PR is too large to evaluate confidently.

**Recovery procedure.**

1. **Stop coding (or pause the review).**
2. Split the story into N smaller stories, each of which is independently mergeable. Each new story carries a fragment of the original story's acceptance criteria; together they cover the original.
3. Land the smallest one first. Use it to establish the convention; subsequent stories inherit.
4. **Critically: split before implementing, not after.** A "split after" amounts to extracting commits from a working branch — the lead has already eaten the cost of reviewing the integrated change.

**Why this loop is distinct.** This is the only loop whose recovery is *organizational* (more story files, more PRs) rather than *content* (revising a story or a piece of code). The team learns to recognize "this is too big" as a discrete signal.

**Worked example.** In this repo, Epic 5 (Capstone runtime — adapter primitives) is broken into 7 stories (`5-1` through `5-7`): the streaming subprocess primitive, the adapter interface + registry, three per-tool adapters, the preflight route, the SSE chat route. The original "build the capstone runtime" was decomposed *before* implementing because the integrated PR would have been unreviewable. The decomposition is the recovery loop applied at the epic-stories phase rather than at PR time.

### 3.5 Loop #5 — Lead disagrees with the spec itself, not the code

**Definition (PRD FR-5.4 #5).** *"Distinct from spec drift: the code is faithful to the story, but the story was wrong → revise the spec, not the code. Lesson 5 must explicitly distinguish this from drift recovery so leads don't conflate the two at the gate."*

**Failure signal.** The lead reviews a PR. The code is faithful to the story (no drift). But the lead, on reading the produced behavior, recognizes that the *story* is wrong — it specifies the wrong behavior, the wrong API shape, the wrong UX, the wrong test surface.

**Recovery procedure.**

1. **Lead explicitly names that the disagreement is with the spec, not the code.** This is the discipline that distinguishes loop #5 from loop #1.
2. The story file is amended (likely with help from PM or whoever owns the upstream PRD context).
3. **Acknowledge the cost.** Loop #5 means the implementer's work may be partially or wholly discarded. This is genuinely expensive; the team should *not* punish the implementer for it (the contract held; the spec was wrong; the cost is the team's, not the individual's).
4. The PR is closed (or partly reverted), the story is revised, a new PR is opened against the revised story.

**Why this loop is the distillate of the implementation-faithfulness problem inverted.** Loop #1 catches *infidelity*: code didn't follow spec. Loop #5 catches *over-fidelity to a wrong spec*: code did follow spec, but spec was wrong. The team needs *both* checks at the gate. If a lead conflates them, they either:

- Treat #5 as #1 → blame the implementer for an alignment problem, demoralize the team, and obscure that the spec process upstream needs work. **Or:**
- Treat #1 as #5 → revise the spec to match drifted code, normalizing drift. (The PRD calls this out in loop #1: *"revise code OR revise story, not both quietly"* — the "both quietly" failure mode is loop-#1-laundered-as-loop-#5.)

**Worked example.** Imagine in this repo: a story specifies "Phase 2 bootstrap shows a single `npx bmad-method install` command and runs it on Confirm." The implementer ships a PR that does exactly this. The lead, reviewing, realizes the install needs to be *interactive* (the PTY pivot, see `_bmad-output/implementation-artifacts/session-state-2026-05-09.md`'s "feat/interactive-bootstrap-pty merged"). The code is faithful to the story; the story is wrong. Recovery: the architecture document and the affected stories are amended; some prior story files are marked superseded (per `c878b2d` — "docs: mark stories superseded by the PTY pivot"); a new story chain replaces the old. **This is the exact loop #5 case, observable in this repo's history.**

### 3.6 Why these five and not others

The PRD's choice of five is opinionated. It does not claim coverage of every BMAD-team failure mode. Notable absences (which the curriculum may surface if helpful but should not invent as additional named loops without PRD authority):

- **Lead unavailable / on PTO.** The brief calls this out in Risk #4 (lead-bottleneck failure mode); the PRD's mitigation is multi-owner CODEOWNERS in v1.1, not a named loop in v1. The curriculum should NOT add a sixth named loop; it should reference the §10 open question instead.
- **Tool authentication breaks.** Handled at the capstone runtime layer (FR-3.5 auth pre-check); not a team-rituals failure mode.
- **CI red.** Standard engineering practice; not BMAD-specific.

**Recommendation for the curriculum.** Teach exactly the five named loops. Resist the urge to add a sixth. The PRD's discipline — name fewer, name them rigorously — is itself a teaching point.

### 3.7 The single hardest distinction the curriculum must make

> **Loop #1 is "code drifted from spec." Loop #5 is "spec was wrong from the start." Confusing them is the single most common gate-time failure.**

The PRD makes this explicit twice (in FR-5.4 #5 and again in §"Curriculum & Content Requirements"). The curriculum author should give this distinction its own subsection, not bury it in a list. Concrete frame: ask the lead, *"would I have wanted this code if the story I wrote yesterday had been perfect?"* — if yes, it's loop #5 (spec was wrong). If no, it's loop #1 (code drifted).

---

## 4. The dual-role AGENTS.md + .github/copilot-instructions.md pattern

PRD FR-5.11 (AGENTS.md) and FR-5.12 (.github/copilot-instructions.md) specify a *dual-role* pattern that the architecture.md document carries as a load-bearing concept ("Dual-role files" — line 98 of architecture.md and onward).

### 4.1 Why both files exist

- **AGENTS.md** is the cross-tool standard. Read by Claude Code (often via a `CLAUDE.md` symlink), Codex, and OpenCode. ([agents.md](https://agents.md/); [OpenAI Codex docs](https://developers.openai.com/codex/guides/agents-md))
- **.github/copilot-instructions.md** is the GitHub Copilot–specific equivalent. Copilot reads its own dotfile, not AGENTS.md.
- **Both must exist** for a team that has any Copilot users alongside any Claude Code / Codex / OpenCode users. The PRD makes both files in-scope (FR-5.11 + FR-5.12); the architecture doc treats them as paired (architecture.md §"Cross-Cutting" "Dual-role files").

### 4.2 The "drift between them is a defect" rule

The architecture document carries an analogous rule for the paired CI pipelines (`.vela.yml` + `.github/workflows/ci.yml`):

> *"Maintenance invariant: if `.vela.yml` and `.github/workflows/ci.yml` check different things, that's a bug."* — `_bmad-output/planning-artifacts/architecture.md` line 370+

The same logic applies to AGENTS.md and copilot-instructions.md. **If the two files instruct different conventions, that's a defect, not a feature.** The two files are deliberately redundant — one canonical content surface, two tool-specific wrappers. The curriculum should make this rule explicit: *drift between AGENTS.md and copilot-instructions.md is a bug to be filed and fixed*.

The PRD doesn't say this in so many words, but the symmetry to the CI pipeline rule (architecture.md §"CI/CD") and the broader "neither YAML wrapper is canonical; the npm scripts are" framing make it the natural extension.

### 4.3 What goes in each file

The PRD does not enumerate the load-bearing content; the curriculum should. Synthesizing from FR-5.11/5.12 and from common AGENTS.md community practice (per [Augment Code 2026 guide](https://www.augmentcode.com/guides/how-to-build-agents-md)):

**Belongs in AGENTS.md / copilot-instructions.md:**

- **Build / dev commands** — `npm run dev`, `npm run reset-progress`, `npm run test:e2e`. (Per `package.json` scripts; FR-6.6.)
- **Test discipline** — what the quad gate is (lint / typecheck / test:unit / test:e2e), that PRs without all four green should not be opened.
- **Stack constraints** — Next.js v16 specifics (the current AGENTS.md stub at the repo root is exactly this — a Next.js v16 "this is not the Next.js you know" warning).
- **No-go zones** — paths the agent shouldn't write to (this complements NFR-S5/S7 path allowlist enforcement at the runtime layer).
- **Per-repo conventions** that emerged from loop #3 recoveries (see §3.3).

**Does NOT belong in AGENTS.md / copilot-instructions.md:**

- Story-specific instructions — those live in the story file.
- PRD-level intent — that lives in the PRD.
- Lesson content — that lives in `training/lessons/*.md`.

The mental model: AGENTS.md is for *what the tool needs to know that doesn't change between stories*; the story file is for *what the tool needs to know that's specific to this feature*.

### 4.4 The current state in this repo (as a teaching artifact)

At time of writing, `/var/home/devbox/repos/bmad_demo/AGENTS.md` is a 5-line stub:

```
<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->
```

It is auto-scaffolded by `create-next-app` v16 (per architecture.md line 121: *"The v16 AGENTS.md scaffold satisfies FR-5.11 directly."*). The `.github/copilot-instructions.md` companion does not yet exist in the working tree — `_bmad-output/planning-artifacts/architecture.md` line 410 lists it under the planned `.github/` layout but the directory is not yet present.

**Implication for the curriculum.** When Lesson 5 lands (currently a placeholder per `training/lessons/5-working-as-a-team.md`), the AGENTS.md and copilot-instructions.md files in the repo will be *the lesson artifact* (per FR-5.2's self-reference pedagogy). The curriculum should point trainees at the live files and ask them to reason about: (a) what content is here, (b) what content should be added by their adopting team, (c) where the redundancy lives between the two files.

### 4.5 Symlink as a pragmatic option

A common community pattern (per [agents.md](https://agents.md/) and various tool docs) is to symlink `CLAUDE.md → AGENTS.md` so Claude Code's tool-specific dotfile cannot drift from the cross-tool one. Some teams symlink `.github/copilot-instructions.md → ../AGENTS.md` similarly. **The PRD does not require this, but the curriculum may want to teach it as an option for teams uncomfortable with manual sync discipline.** Risk: some tools' file resolvers don't follow symlinks across directory boundaries — adopting teams should test on their stack.

---

## 5. CODEOWNERS as the enforcement layer for stories

This section intentionally overlaps with `github-governance.md`. Where that artifact will document the GitHub mechanics (CODEOWNERS syntax, branch protection rule shapes, required-review semantics), this artifact documents the **team-rituals view** of CODEOWNERS: it is what turns "we agreed on the story" from a social contract into an enforceable contract.

### 5.1 The honest claim

The brief states the load-bearing version of the claim explicitly:

> *"The portal does NOT claim CODEOWNERS prevents drift on its own. It claims that routing the right human to the gate, plus teaching that human what to look for, prevents drift. Lesson 4 teaches the look-for. Lesson 5 teaches the rituals."* — `_bmad-output/planning-artifacts/product-brief-bmad_demo-distillate.md` §"Governance thesis"

Two parts:

1. **CODEOWNERS routes the right human.** GitHub auto-requests review from the configured owner group. The lead can't be skipped.
2. **The lead reads for spec-vs-code drift.** This is not automatic; it has to be taught (Lesson 4 produces `training/lead-review-checklist.md` per FR-5.3).

Without either part, the gate doesn't bite. Without (1), reviews go to whoever is around. Without (2), reviews become rubber-stamps or style nitpicks.

### 5.2 What the lead reads for (Lesson 4's load-bearing content)

PRD §"Curriculum & Content Requirements" mandates that Lesson 4 produces a **reusable, pinnable PR-review checklist artifact** at `training/lead-review-checklist.md`. The PRD does not enumerate the checklist contents (this is a gap — see §10), but the curriculum author should ground them in:

- **Story-link present.** The PR template has a story-link field (FR-6.3). The lead checks it points at a real story file.
- **Acceptance criteria traced.** Each AC in the story has visible evidence in the PR (a test, a code change, a documentation update).
- **No spec drift (loop #1 check).** The lead reads the story side-by-side with the diff. Anything in the diff that's not in the story is questioned.
- **No silent spec rewrite (loop #5 check, the harder one).** If the lead disagrees with what the PR does, they ask: would I have asked for this code if the story had been perfect? If yes, it's loop #5 — open the spec for revision. If no, it's loop #1 — return to implementer.
- **Quad gate green.** lint, typecheck, test:unit, test:e2e. Per architecture.md §"CI/CD" — both pipelines (`.vela.yml` and `.github/workflows/ci.yml`) run the same npm-script contract.
- **AGENTS.md / copilot-instructions.md alignment (when relevant).** If the PR introduces a convention, has it been captured in the dual-role files? (Loop #3 recovery.)

### 5.3 The lesson-4 checklist as a pinnable, exportable artifact

A subtle but load-bearing PRD decision (FR-5.3): the checklist is a *file*, not just lesson prose. Leads can copy it into their adopting team's repo. This is the same self-reference pedagogy as the rest of the portal — the lesson outputs a real artifact, the artifact survives the lesson.

**Curriculum implication.** Lesson 4 should not stop at narrative; it should land at the checklist file. Trainees who finish Lesson 4 and don't have a copy of `lead-review-checklist.md` to take home have not actually completed the lesson. (Compare FR-5.6: the team-rituals checklist works the same way — Lesson 5's pinnable output.)

### 5.4 External corroboration on AI-generated code review

The 2026 industry framing supports the gate-as-enforcement-layer thesis. From [Netizen Blog 2026/05/07](https://blog.netizen.net/2026/05/07/what-security-teams-are-seeing-in-ai-generated-code/):

> *"The concern for security teams is governance, as many organizations lack a reliable way to identify where AI-generated code entered the repository, what prompts produced it, whether proprietary data was used, and whether the generated result received the same review expected for human-written code... The 2026 reality is that AI velocity makes accidents more likely, and protection compensates for velocity."*

And from [Aviator's CODEOWNERS guide](https://www.aviator.co/blog/code-reviews-at-scale/):

> *"By combining branch protection with CODEOWNERS, only assigned teams can approve their code areas, while automated workflows can verify additional quality checks before merging."*

The portal's claim is a specific instantiation of this industry direction: **CODEOWNERS-routes-review + lead-reads-for-drift = AI governance at the code layer.** The curriculum should reference the broader trend (without leaning on a specific source as canonical) so trainees don't perceive the pattern as bmad_demo–specific.

### 5.5 Risk #4 caveat: the lead is a single point of failure

The brief's Risk #4 is "CODEOWNERS-as-gate concentrates load on the lead engineer; under volume, leads rubber-stamp or become the bottleneck." The PRD's mitigations:

- **Lesson 4 surfaces the failure mode explicitly** (so leads aren't surprised when it bites).
- **Multi-owner CODEOWNERS patterns in v1.1.** Per PRD §"Innovation & Novel Patterns" #3 (graduated GitHub-native first):
  1. v1.1 multi-owner CODEOWNERS lesson distributes the gate.
  2. CODEOWNERS rules requiring N approvers across multiple owner groups.
  3. (Last retreat) reviewer rotations outside CODEOWNERS — weakens the GitHub-native claim but doesn't kill it.

The curriculum should teach the v1 single-lead simplification *honestly*: this is the v1 pattern; the multi-owner pattern is the documented next move; teams whose volume already exceeds single-lead capacity should jump straight to the multi-owner pattern in their fork.

---

## 6. Async checkpoints and the three lab formats

The PRD specifies three labs (PRD FR-4.1 through FR-4.4):

| Lab | Format | Time | Failure mode it addresses |
|---|---|---|---|
| Solo (`training/labs/solo.md`) | Lesson-anchored, single-trainee | ~60–90 min | Self-paced ramp; the trainee can practice without coordination overhead |
| Synchronous full-team (`training/labs/sync.md`) | Whole team in one session | ~90 min | Shared mental model — the team experiences a BMAD cycle together |
| Async cross-team story-review (`training/labs/async-story-review.md`) | Two groups; one authors a story, the other reviews and signs off without implementing | ~30 min author + ~30 min review + ~15 min debrief | The contract held even when the team never met live |

### 6.1 Why three formats

Each addresses a different team failure mode. The PRD doesn't make this case explicitly — the curriculum should — but the implication is in the brief and PRD framing.

- **Solo.** The trainee can ramp on BMAD without needing to coordinate with anyone. Important for the "anyone-on-the-team" inclusivity claim (Journey 2 — Priya, the PM); important for the bus-factor reduction (anyone can pick up the curriculum without scheduling).
- **Synchronous full-team.** The team builds shared mental model in real time. The lab is the rehearsal for how the team will run BMAD without a facilitator (per `training/labs/sync.md` placeholder: *"the rehearsal for how your team will run BMAD without a facilitator"*).
- **Async cross-team story-review.** This is the **load-bearing lab for the contract claim**. If the story file is genuinely a contract, two groups who never meet live can author / review / sign off on a story, and the contract holds. The lab is engineered to *test* the contract under stress — not just to teach it.

### 6.2 The async lab is the harder claim

The PRD treats the async-team lab as MVP-required (PRD §"MVP" — *"async cross-team story-review (a team reviews and signs off on a story file without implementing it — preserves the async-checkpoint muscle, no admin feature surface required)"*). This is the format that proves the team-rituals layer is real:

- **Sync labs** prove BMAD works when everyone is in the same room.
- **Async labs** prove BMAD works when the team is *distributed in time* — the story is the only artifact connecting author and reviewer.

If the async lab works, the contract claim holds. If it doesn't, the team-rituals layer is theatre — only viable when everyone is synchronously present. **The curriculum should make this stake explicit.**

### 6.3 Implication for facilitators

PRD FR-4.4: *"A facilitator can select one of the three lab formats per workshop session via the facilitator guide."* The facilitator guide (`training/facilitator-guide.md`) needs to enumerate when to pick which:

- Half-day team workshop with everyone present → sync.
- Solo onboarding for a new hire → solo.
- A team that's distributed across time zones, OR a team that wants to test their async muscle → async cross-team.

The curriculum author should document this selection logic clearly in the facilitator guide — not bury it in lab markdown files.

---

## 7. The transformation moment

The brief is explicit about what "the aha" looks like. From the PRD Executive Summary's *"What Makes This Special"*:

> *"The transformation moment. The marquee aha is the capstone — when a trainee finishes the chat-driven artifact chain with their own AI tool, runs the just-implemented story 1.1's tests green in their fresh team repo, and recognizes that BMAD is something they can take to their team Monday morning. Earlier 'open .github/CODEOWNERS' beats are primers that build curiosity; the system lands when they're holding a working repo of their own."*

### 7.1 What the moment is, mechanically

A trainee experiences each of the following in sequence:

1. **They wrote a story.** Through the capstone phase chain (FR-3.2 phases 6 — epics + stories — and 7 — ADR), they produced a story file using their own AI tool, against their own brief and PRD.
2. **They ran it through their AI tool.** Phase 8 (FR-3.23 — *"Phase 8 implements story 1.1 end-to-end: the agent writes code, runs the tests in the trainee's new repo, and the phase-done gate refuses Done on red tests."*) — the tool produces working code from the story.
3. **The tool produced faithful code.** The phase-done gate (FR-3.21 + FR-3.23) refuses progress on red tests, so the trainee cannot reach this point without the code being faithful to the story's tests.
4. **They have a real repo on disk.** Not in the portal, not transient — `~/code/<their-project-name>/`, a git repo with brief / PRD / architecture / epics / stories / ADR / working tested code, plus a HANDOFF.md (FR-6.7, Story 9.1 / 9.2).
5. **They recognize this is portable to Monday.** The HANDOFF.md (per `_bmad-output/implementation-artifacts/9-1-handoff-generator.md`) gives them concrete next steps for their team: fill in CODEOWNERS, apply branch protection, run BMAD natively from here, push to remote.

### 7.2 Why the curriculum can't simulate this

The earlier capstone design (per PRD edit history line 41) was a textarea-based artifact entry — trainees typed brief / PRD / story content into form fields. That design was **deliberately replaced** for exactly this reason: typing artifacts into a form does not produce the moment of "the contract held when *my* AI tool ran *my* story." The contract has to bite *outside* the portal, in a real repo, against the trainee's *own* tool, for the moment to land.

**Curriculum implication.** Lesson 6 (`training/lessons/6-from-lessons-to-capstone.md`, currently a placeholder) is the *primer* for the moment, not the moment itself. The moment happens in the capstone. Lesson 6 should explicitly tee up: "the next thing you'll do is hold a working repo your team can adopt." Per FR-5.13 verbatim: *"Lesson 6 prepares; Phase 0 of the capstone executes."*

### 7.3 Why "first-review approval without spec-vs-code corrections" is the success metric

The PRD's trainee success metric (PRD §"Success Criteria → User Success") is:

> *"Engineer/Team-Trainee succeeds when they complete the capstone — leaving with a fresh, BMAD-bootstrapped team repo at a path of their choosing, populated through chat with their own AI tool, with story 1.1 implemented and tests green — and open a real PR (in the new repo or their team's existing repo) with a linked story file that the lead approves on first review without spec-vs-code corrections."*

The PRD explains the load-bearing phrase in a footnote:

> *"'Without spec-vs-code corrections' is the implementation faithfulness check — stylistic or refinement comments don't count against the bar; what counts is whether the produced code drifts from the story spec."*

This is the **observable** version of the transformation moment. The trainee experienced "the contract held" inside the capstone (against their own tool); they then go to their team's repo and experience "the contract held" against the lead's gate. Two faithfulness checks; the second proves the first wasn't an artifact of the portal's environment.

---

## 8. Single-tool teams and the Risk #6 mitigation

The brief's Risk #6 is *"Mixed-tool premise weakens if a team is locked to one vendor (common in regulated orgs)."* The PRD's stated mitigation (PRD §"Risks & Considerations" #6 and §"Project Scoping → Risk Mitigation Strategy"):

> *"Lesson 5 teaches the story-as-contract abstraction so single-tool teams still benefit; mixed-tool is the headline but not the only path."*

This section makes that argument rigorously so the curriculum doesn't accidentally pitch BMAD-on-a-team as "only for mixed-tool teams."

### 8.1 Why single-tool teams still benefit

The contract pattern delivers value along three axes that don't require tool diversity to bite:

1. **Story-as-contract is a coordination primitive across humans, not just across tools.** A team where everyone uses Claude Code still has multiple humans. The story file is what lets engineer A pick up engineer B's work; PM C hand off to engineer A; lead D review against a written spec rather than against a memory of a conversation. The tool agreement is invariant; the human coordination is not.
2. **AGENTS.md / copilot-instructions.md is per-repo discipline.** Even a single-tool team needs a place to record per-repo conventions (build commands, test rules, no-go zones). The dual-role pattern degenerates to single-file in a single-tool team but the discipline of having *a* file does not. A team with only Claude Code still benefits from `AGENTS.md` (or `CLAUDE.md`) being a curated, human-written context file rather than ad-hoc README sections — backed by the [ETH Zurich 2026 finding](https://www.infoq.com/news/2026/03/agents-context-file-value-review/) that human-written context files give a 4% lift.
3. **CODEOWNERS-as-gate is tool-agnostic.** Routing review to the right human and teaching that human what to read for is the same regardless of how the code was produced. Single-tool teams have the same lead-bottleneck risk and benefit from the same Lesson 4 checklist artifact.

### 8.2 What single-tool teams lose (and why it's small)

The mixed-tooling lab in Lesson 5 is less concrete for a single-tool team — they don't have two engineers running different tools to compare. But:

- The lab can still be run with *the same tool* twice, with two different prompt approaches, to surface convention drift.
- The async cross-team story-review lab (which doesn't depend on tool diversity at all) is the higher-leverage exercise for a single-tool team.

### 8.3 Vendor lock-in language

The PRD's stakeholder demo script (FR-5.8) explicitly addresses procurement, SSO, and vendor-lock-in objections. Vendor lock-in is the proximate concern of single-tool / regulated orgs. The portal's answer: BMAD-on-a-team is *insurance against future vendor changes* — the story file format and the AGENTS.md pattern survive any specific tool's deprecation. The team's day-2 invocation (see §9) doesn't depend on the portal *or* on any specific tool. **The curriculum should make this future-proofing argument to single-tool teams; it's the strongest version of the Risk #6 mitigation.**

---

## 9. Day-2 invocation: how teams use BMAD without the portal

After the capstone, the team owns a working BMAD-bootstrapped repo. From here, BMAD runs natively — without the portal — using the trainee's AI tool's normal interface.

### 9.1 What the team has at handoff time

Per `_bmad-output/implementation-artifacts/9-1-handoff-generator.md` and FR-3.24 / FR-6.7, the trainee's repo at capstone end contains:

- `_bmad-output/planning-artifacts/brief.md`
- `_bmad-output/planning-artifacts/prd.md`
- `_bmad-output/planning-artifacts/architecture.md`
- `_bmad-output/planning-artifacts/epics-and-stories.md`
- `_bmad-output/planning-artifacts/adr/0001-*.md`
- `stories/1.1.md` (the implemented story)
- Working code + green tests for story 1.1
- `HANDOFF.md` (the one-pager)
- The BMAD installation under `_bmad/` (from `npx bmad-method install`, pinned to BMAD 6.6.0 per FR-3.11)

### 9.2 What the HANDOFF.md tells the team to do

Per the HANDOFF.template.md content in Story 9.1's spec:

1. **Fill in CODEOWNERS placeholders.** Open `.github/CODEOWNERS`. Replace placeholder team handles with the team's actual GitHub team handles.
2. **Apply branch-protection notes.** See `.github/branch-protection-notes.md` — apply the recommended branch-protection rules to `main` via the team's GitHub org settings.
3. **Pin the team-rituals checklist.** Save `team-rituals-checklist.md` in the team's wiki or onboarding docs.
4. **Push to remote.** Standard `git remote add origin ... && git push -u origin main`. Push is **not** part of the capstone proper — it's optional homework. The portal makes zero remote calls (NFR-S1). *(See §"Why portal does NOT execute push" in Story 9.2's dev notes.)*
5. **Run BMAD natively from here.** Story 9.1's template is explicit: *"From now on, you don't need the portal — invoke BMAD via your AI tool's normal interface. Story 1.1's tests pass; pick up Story 1.2 next, OR start fresh with bmad-create-story in your tool."*

### 9.3 Day-2 invocation concretely

Once the team is running BMAD natively:

- **New stories** are created with `bmad-create-story <story-id>` (or whatever the AI tool's invocation pattern is — claude-code uses skill names, codex routes slash commands, copilot uses `-i` flag invocation per the session-state-2026-05-09.md table).
- **Implementation** happens with `bmad-dev-story <story-file>`.
- **Reviews** happen at PR time, against CODEOWNERS, with the lead-review checklist pinned.
- **Recoveries** invoke the five named loops (§3) when the team hits the failure modes.

The portal's role *ends* at handoff. It is a *training* product, not an *operating* product. (Per the brief's vision section: *"the portal's role evolves from 'introduction' into the org's reference implementation of how we work with AI"* — the implementation is what teams *fork*, not what they *run*.)

### 9.4 The portal-to-day-2 transition is itself a teaching moment

The HANDOFF.md is the bridge. Story 9.2 (the handoff page) renders the HANDOFF.md inside the portal so the trainee sees it land *before* they leave the portal — they read it once with the portal's framing nearby, then carry it with them.

**Curriculum implication.** Lesson 6 + the capstone's Phase 9 (handoff) should be authored so the trainee leaves with the explicit mental model: *the portal got me here; from here, BMAD runs in my repo.* If the trainee leaves believing they need the portal to keep going, the inclusion claim has failed.

---

## 10. Open questions for the curriculum author

Items the PRD raises but does not fully resolve. Flag for the curriculum author to either resolve in trainee-facing prose or to surface as known unknowns in the curriculum.

### 10.1 Story-grooming cadence

The PRD prescribes the artifact chain but does not prescribe a team ceremony cadence. Should a team running BMAD groom stories weekly? Bi-weekly? Per epic? The brief and PRD are silent. **Curriculum question:** does Lesson 5 prescribe a cadence, or leave it to the team? Recommendation: leave it to the team but offer a default ("weekly, 30 minutes, before sprint planning") as a starting point teams can deviate from.

### 10.2 What's in the lead-review-checklist artifact (concrete contents)

PRD FR-5.3 mandates the checklist as a deliverable but does not enumerate items. §5.2 of this artifact proposes a starting set; the curriculum author should treat that as a draft and refine. **Open question:** should the checklist be tool-agnostic (i.e., the same checklist regardless of which AI tool produced the PR), or should it have tool-specific subsections (e.g., "if Copilot: check X")? Recommendation: tool-agnostic — the contract is tool-agnostic; the checklist should be too.

### 10.3 Lead unavailability (Risk #4 deeper-dive)

The brief's Open Questions section (distillate, line 125) says *"Lead-bottleneck failure mode (lead PTO, lead leaves, lead overloaded) — Lesson 4 mentions multi-owner rules but no full backup-gate design."* The PRD pushes the multi-owner pattern to v1.1. **Curriculum question:** what does Lesson 4 say to a team whose lead is on PTO during a sprint? Recommendation: name the v1.1 multi-owner pattern as the documented next step; teach the v1 single-lead simplification as a deliberate first iteration, not an end state.

### 10.4 Behavior-change reinforcement beyond the team-rituals checklist

Distillate §"Open questions" line 123: *"Behavior-change reinforcement beyond the team-rituals checklist — does the PRD add spaced-repetition / 30-day check-ins / lead-led retros?"* The PRD does not. **Curriculum question:** should Lesson 5 / 6 include a "30-day post-capstone check-in" prompt the team self-runs? Recommendation: yes, lightweight — a pinnable retro template alongside the team-rituals checklist.

### 10.5 Two-POC-profile support

Distillate line 122: *"POC team profile is 'zero BMAD experience' — a BMAD-savvy team adopting only the team-layer would be a different POC."* The PRD currently targets the zero-BMAD-experience team. **Curriculum question:** does Lesson 5 carry a "skip-ahead for teams already running BMAD individually" branch? Recommendation: not in v1 — the PRD's current scope discipline is to ship one path well. If Risk #6 single-tool teams or BMAD-savvy teams emerge as a real audience post-POC, v1.1 can branch.

### 10.6 The story-grooming-meets-async-checkpoint relationship

The async cross-team story-review lab is the load-bearing async-checkpoint exercise (per §6.2). But the PRD does not say what async-checkpoint cadence a real team should run *outside* the lab. **Curriculum question:** is the async cross-team review a one-time exercise, or an ongoing ritual? If ongoing, at what cadence? Recommendation: surface this as an open team-decision in Lesson 5 — *"some teams do async story-review weekly; some do it only when a story crosses team boundaries; pick what fits."*

### 10.7 What "the lead" means in flat-hierarchy teams

The PRD assumes a `@engineering-leads` group exists. Some teams (e.g., flat-hierarchy POD-style teams) do not have a designated lead. **Curriculum question:** does Lesson 4 address the no-designated-lead case? Recommendation: yes — name a "rotating gate-holder" pattern as a fallback; surface that flat-hierarchy teams can still apply CODEOWNERS by naming a small rotating group as the owners.

### 10.8 The relationship between BMAD story files and team-issue-trackers (Jira / Linear / GitHub Issues)

The PRD specifies the story-file-as-contract but does not specify how it relates to the team's existing issue tracker. **Curriculum question:** does the story file replace a Jira ticket, or augment it? Recommendation: surface as a team-decision in Lesson 5 — "the story file is the implementation contract; your tracker is the workflow tool. They link to each other; neither replaces the other."

### 10.9 Drift between AGENTS.md and copilot-instructions.md as a CI-detectable defect

§4.2 argued that drift between the two files is a defect. **Curriculum question:** should there be a CI check that flags drift? The PRD doesn't specify one (lesson-link CI is in NFR-R2; AGENTS.md / copilot-instructions.md drift CI is not). Recommendation: surface as a teachable extension for adopting teams; don't add to v1.

### 10.10 What "Monday morning" means for asynchronous teams

The transformation-moment framing leans on "show your team Monday morning" (PRD Journey 1, brief vision). For async / distributed teams, "Monday morning" is metonym, not literal. **Curriculum question:** does Lesson 6 acknowledge this? Recommendation: yes — frame the moment as "the next time you have your team's attention" rather than literal Monday.

---

## 11. Recommended structure for curriculum integration

This is advisory — the curriculum author owns the shape — but synthesizes how this artifact's content maps to the six-lesson + three-lab + capstone surface.

| Curriculum surface | Content from this artifact |
|---|---|
| Lesson 1 (What is BMAD) | §1.1 (the five pain points) — frame the problem the team layer addresses. Don't deep-dive rituals here; primer only. |
| Lesson 2 (The artifact chain) | §1.2 (week in the life) — the artifact chain as it propagates across roles, not just within one engineer's tool. |
| Lesson 3 (Stories as tool-agnostic contract) | §2 in full — the mixed-tool problem and how the artifact chain (story + AGENTS.md + copilot-instructions.md) solves it. The three-tool capstone (§2.3) is the proof point. |
| Lesson 4 (CODEOWNERS + the gate) | §5 in full — CODEOWNERS as enforcement layer, what the lead reads for, the §5.2 checklist starting point. Produces `training/lead-review-checklist.md` (FR-5.3). |
| **Lesson 5 (Working as a team)** | **§3 (five recovery loops) + §4 (dual-role files) + §6 (lab formats) + §8 (single-tool teams).** The densest lesson by content; the lesson the rest of the curriculum sets up. |
| Lesson 6 (Capstone primer) | §7 (transformation moment) — preview what the capstone is and why it lands as it does. |
| Solo lab | §6.1 — anchor it as self-paced ramp; the trainee runs the artifact chain alone. |
| Sync lab | §6.1 — full-team rehearsal for the day-2 cadence. |
| Async cross-team story-review lab | §6.2 — *the* lab that proves the contract bites without synchrony. |
| Capstone | §7 + §9 — the moment + the bridge to day-2. |
| One-page team-rituals checklist (FR-5.6) | §3.7 distinction + §4.2 drift rule + §5.2 checklist subset + §6 lab cadence — the reinforcement artifact synthesizes the load-bearing items from Lesson 5 into one page trainees pin in their team's repo. |

---

## 12. What this artifact deliberately does not do

- **Does not write trainee-facing prose.** The five recovery loops, the dual-role file pattern, the transformation moment — all are documented for the curriculum author's synthesis, not for direct paste into a lesson.
- **Does not specify the lead-review-checklist contents normatively.** §5.2 proposes a starting set; the curriculum author refines.
- **Does not duplicate `bmad-mechanics.md` (BMAD framework internals) or `github-governance.md` (CODEOWNERS / branch protection mechanics).** This artifact is the team-rituals leg only; cross-references are explicit.
- **Does not invent additional named recovery loops.** §3.6 argues the PRD's discipline of naming exactly five is itself a teaching point; the curriculum should resist scope creep.
- **Does not prescribe a synchronous team ceremony beyond what the PRD specifies.** §10.1 surfaces the cadence question as open; the curriculum can offer a default but should not present BMAD-on-a-team as requiring new ceremonies.

---

## Sources

### Primary repo artifacts

- `_bmad-output/planning-artifacts/prd.md` — load-bearing source. Sections referenced: Executive Summary; "What Makes This Special"; Project Classification; Success Criteria (User / Business / Technical / Measurable Outcomes); Product Scope (MVP / Growth / Vision); User Journeys (1, 2, 3, 4) + Journey Requirements Summary; Domain-Specific Requirements (Compliance, Technical Constraints, Integration, Curriculum & Content, Risk Mitigations); Innovation & Novel Patterns (Self-reference, Story-as-contract, GitHub-native governance, Fork-per-team) + Risk Mitigation; Web App Specific Requirements; Project Scoping; FR-1 through FR-6 (esp. FR-3.2, FR-3.11, FR-3.15-30, FR-4.1-4, FR-5.1-13, FR-6.1-7); NFR-S1-7, NFR-R1-4, NFR-M1-4, NFR-A1-3, NFR-P1-4, NFR-L1.
- `_bmad-output/planning-artifacts/product-brief-bmad_demo.md` — load-bearing source. Sections referenced: Executive Summary; The Problem (five pain points); The Solution (story-file-as-tool-agnostic-contract); What Makes This Different; Who This Serves; Success Criteria; Scope; Why Now; Vision; Risks & Considerations (Risks #1–#8).
- `_bmad-output/planning-artifacts/product-brief-bmad_demo-distillate.md` — Governance thesis section; Open Questions section; Quotable framings.
- `_bmad-output/planning-artifacts/architecture.md` — referenced for: Dual-role files framing (§"Cross-Cutting"); paired CI pipeline drift-as-defect rule (§"CI/CD"); AGENTS.md / copilot-instructions.md placement in folder layout; capstone runtime threat model (TM-1–TM-6); FR-trace table (§"Validation table"); PTY pivot edit-history note explaining the architecture.md update.
- `_bmad-output/planning-artifacts/epics.md` — referenced for: epic-level story decomposition example (Epic 5 splitting into 7 stories — loop #4 illustration); paired-pipeline contract framing.
- `_bmad-output/implementation-artifacts/session-state-2026-05-09.md` — three-tool capstone surface validation (claude-code / codex / github-copilot all running with autoRun=true after PTY-pivot landing); per-tool argv shape table; auth-probe rewrite narrative.
- `_bmad-output/implementation-artifacts/9-1-handoff-generator.md` — HANDOFF.template.md content; day-2 transition prose.
- `_bmad-output/implementation-artifacts/9-2-handoff-page.md` — handoff-page UX shape; "why portal does NOT execute push" rationale.
- `AGENTS.md` (current state at repo root) — minimal Next.js v16 stub auto-scaffolded by create-next-app v16.
- `training/lessons/1-what-is-bmad.md`, `2-the-artifact-chain.md`, `3-stories-as-tool-agnostic-contract.md`, `4-codeowners-and-the-gate.md`, `5-working-as-a-team.md`, `6-from-lessons-to-capstone.md` — all currently placeholders pending Epic 6 authoring.
- `training/labs/solo.md`, `sync.md`, `async-story-review.md` — all currently placeholders pending Epic 6 authoring.
- `training/00-start-here.md` — trainee entry point shape.

### External (web-fetched)

- [agents.md (the spec home)](https://agents.md/) — AGENTS.md as cross-tool standard; donation to AAIF / Linux Foundation December 2025.
- [Custom instructions with AGENTS.md — OpenAI Codex Developers](https://developers.openai.com/codex/guides/agents-md) — Codex's native AGENTS.md support.
- [How to Build Your AGENTS.md (2026) — Augment Code](https://www.augmentcode.com/guides/how-to-build-agents-md) — what content belongs in AGENTS.md; community conventions.
- [New Research Reassesses the Value of AGENTS.md Files for AI Coding — InfoQ March 2026](https://www.infoq.com/news/2026/03/agents-context-file-value-review/) — ETH Zurich 2026 study: human-written context files give a 4% lift; LLM-generated reduce success by 3%.
- [What Security Teams Are Seeing in AI-Generated Code — Netizen May 2026](https://blog.netizen.net/2026/05/07/what-security-teams-are-seeing-in-ai-generated-code/) — 2026 industry framing on AI code governance, the velocity-vs-protection argument.
- [Code Reviews at Scale: CODEOWNERS & GitHub Actions Guide — Aviator](https://www.aviator.co/blog/code-reviews-at-scale/) — CODEOWNERS + branch protection as the standard pattern for review at scale.

### Cross-references (other research artifacts in the same tripod)

- `_bmad-output/planning-artifacts/research/bmad-mechanics.md` — BMAD-the-framework reference (parallel artifact; not read by this author).
- `_bmad-output/planning-artifacts/research/github-governance.md` — CODEOWNERS / branch protection mechanics reference (parallel artifact; not read by this author).
