---
title: Working as a team
---

# Lesson 5 — Working as a team

> **Reading time:** ~25 minutes. **Prerequisites:** Lessons 1–4.

## What you'll learn

- **Decision authority** — for each artifact in the BMAD chain, who has the right to make the change: an individual, a lead, the whole team, or leadership? This is the upstream question Lessons 1–4 left silent.
- The **principle** behind the gradient — *blast radius and reversibility* — so your team can extend it to artifacts and decisions this curriculum doesn't anticipate.
- The **five recovery loops** every team running BMAD will hit when the contract bites. Each one has a name, a failure signal, a recovery procedure, a clear boundary with its neighbors, and a decision-authority dimension.
- The single hardest distinction in this lesson: **Loop #1 vs Loop #5** — and why conflating them is the most common gate-time failure.
- The **dual-role `AGENTS.md` + `.github/copilot-instructions.md`** pattern that makes per-repo conventions hold across multiple AI tools.

This lesson produces the curriculum's second pinnable artifact: [`training/team-rituals-checklist.md`](../team-rituals-checklist.md) — a one-page reference your team can pin in your repo and refer back to when things go sideways.

---

## Decision authority — who decides what

Lessons 2 and 3 walked the artifact chain. Lesson 4 made the gate enforceable. But neither lesson answered a question that comes up the moment a team starts running BMAD for real:

> *Can I change the PRD myself, or do we need to discuss it as a team?*
>
> *Who's allowed to add a story to an existing epic — me, or my lead?*
>
> *If I notice the architecture is wrong, do I just fix it, or does that need a meeting?*

These are governance questions. The recovery loops below are useless without an answer to them — *who* recovers and *with what authority* depends entirely on what level of artifact is moving.

### The gradient

The further upstream in the artifact chain a change lives, the more the team must be aligned on it. The further downstream, the more an individual can act alone. The principle is **blast radius + reversibility**: how much downstream work must move if this change is wrong, and how easy is it to undo?

| Decision | Authority | Why |
|---|---|---|
| Picking your AI tool for a session | **Individual** | Your tool, your terminal. The story-as-contract pattern (Lesson 3) holds across tools; the team doesn't need to know which one you used. |
| Implementing a story (the code itself) | **Individual + AI tool** | The story file already specifies the contract. The implementer's job is to satisfy it. |
| Filling in the Dev Agent Record / ticking tasks | **Individual** | The agent's own audit trail. The dev-story skill is explicitly allowed to update these (Lesson 3). |
| Drive-by typo fix in adjacent code | **Individual** + lead at PR | Below the noise floor; absorbed in the normal review. |
| **Splitting a story into smaller stories (Loop #4)** | **Lead-approval (one human)** | An organizational change, but contained — no upstream artifacts move. The lead reviews the split for AC coverage and merges the new story files. |
| **Clarifying an AC before implementation (Loop #2)** | **Lead-approval** | The story changes, but bounded. Lead reads the amended AC, signs off async, work proceeds. |
| **Adding a story to an existing epic** | **Lead-approval** | Stays within previously-agreed scope. PM may want a heads-up; lead is the decision-maker. |
| **PR merge** | **Lead-approval (CODEOWNERS-routed)** | The gate Lesson 4 teaches. CODEOWNERS picked the right human; their approval is the decision. |
| **Architecture change (component, route, data shape)** | **Multi-owner / team consensus** | Other artifacts depend on architecture. One engineer cannot quietly redirect the whole team's downstream work. Architecture changes route to multiple CODEOWNERS or surface as an RFC. |
| **PRD change (FR/NFR addition, modification, removal)** | **Team consensus** + PM | The PRD is the contract for *every* downstream artifact. A new FR creates work; a removed FR strands work. The team needs to absorb the cost together. |
| **New epic creation** | **Team consensus** + PM | Defines a body of work the team will pick up from. Stories within an existing epic are lead-approved; *creating* the epic itself is upstream of that. |
| **Brief change** | **Team consensus** + leadership | The whole chain rebases on the brief. Brief changes are rare in a healthy team; when they happen, they're a rebase event, not a quiet edit. |
| **`AGENTS.md` / `.github/copilot-instructions.md`** | **Team consensus** | Affects every teammate's AI tool behavior. Drift between the two files is itself a defect (see end of this lesson). One engineer's "convention update" can break another engineer's tool subtly. |
| **CODEOWNERS / branch protection** | **Leads-only** + audit trail | Changes the *rules of the game.* Lesson 4 names this as a Day-2 governance change; PRs touching these paths route to leads + security. |

### What "team consensus" actually means

Consensus is not always a meeting. The team has three mechanisms, scaled to the cost of the change:

- **Async PR with multi-CODEOWNERS sign-off.** Two or more named owners must approve before merge. Works for architecture changes that affect a known set of teammates. Cheapest mechanism that's still load-bearing.
- **RFC / proposal doc with comment-based discussion.** A short markdown doc proposing the change, opened as a PR, comments allowed for some bounded period (24–72 hours typical). Good for PRD changes where the right reviewers aren't all on CODEOWNERS for the affected paths.
- **Synchronous meeting.** A 30-minute call with the right humans in the room. Reserve for changes where async would lose context faster than the change is worth — usually brief changes or epic restructuring.

Pick the lightest mechanism the change can survive. A PRD typo fix doesn't need an RFC; a major NFR change doesn't survive a single async PR.

### Team size scales the formality

The gradient above is for a small-to-medium team (5–15 people). Two adjustments:

- **Smaller teams (≤4)** can compress: a "team consensus" for a small-PRD change might be a 5-minute Slack thread with the lead and PM. The principle holds; the formality drops.
- **Larger teams or multiple teams** need to expand: a "team consensus" for an architecture change might be a written RFC routed to multiple CODEOWNERS groups. The principle holds; the formality increases.

The wrong move is to reverse the gradient — letting individuals change PRDs because the team is small, or requiring sync meetings for code-level decisions because the team is large. **The gradient is about blast radius, not about team size.** Team size shifts the *mechanism*, not the level of authority.

### Role differentiation lives in CODEOWNERS, not in this gradient

This lesson's table doesn't say "the PM owns the PRD" or "the architect owns the architecture." Those role-to-artifact mappings live in your `CODEOWNERS` file — that's the whole point of CODEOWNERS as the enforcement layer (Lesson 4). The gradient names *level of authority required*; CODEOWNERS names *which humans hold that authority*.

Two consequences worth naming:

- **A PRD change requires team consensus** — but if your team's PM is the only CODEOWNERS reviewer for `_bmad-output/planning-artifacts/prd.md`, then "team consensus" in practice means "the PM signs off." The gradient still holds; CODEOWNERS resolves to the smallest viable group.
- **Multi-owner CODEOWNERS rules are how you scale up authority.** When an architecture decision needs more than one perspective, the corresponding `CODEOWNERS` line lists more than one team. Lesson 4's worked example shows this for `/web/app/api/` (frontend + backend co-owned).

### The decision-authority dimension of each recovery loop

Each recovery loop below has a decision-authority answer baked in. As you read the loops, notice:

- **Loop #1 (drift)** — the *direction* of correction (revise code or revise spec) is a lead-approval call when the spec is a story; a team-consensus call when the spec is the architecture or PRD. The rule of thumb is: *"recover at the level of the artifact that's moving."*
- **Loop #2 (unclear stories)** — story clarification is lead-approval. Almost always.
- **Loop #3 (mixed-tooling conflicts)** — the convention update lives in `AGENTS.md` / `.github/copilot-instructions.md`, which is **team consensus.** Loop #3 is the only loop whose recovery routinely escalates to team-level authority.
- **Loop #4 (story too big)** — splitting is lead-approval; the new story files just need their normal AC review.
- **Loop #5 (spec wrong)** — *exactly* the level of artifact that was wrong is the level of authority to fix it. If the story was wrong, lead-approval. If the architecture was wrong, team consensus. If the PRD was wrong, team-consensus + PM.

The principle: **recover at the level of the artifact that's moving.** Not above (over-formalizing minor changes); not below (under-authorizing major changes).

---

## Why "named loops"

With the decision-authority gradient set, the loops below become concrete procedures for *each level of authority.* A team running BMAD will hit a small number of recurring failure modes. The point of giving them names is **so the team can talk about them in real time without re-deriving what to do**. "We're in Loop #1, story-level" is a complete recovery instruction; "I think we have a kind of issue where the code doesn't match the spec, but maybe the spec was the wrong one, or maybe..." is the absence of one.

The five loops below are opinionated. They don't cover every possible failure (a CI outage, a tool's auth breaking, a teammate on PTO). They cover the failure modes that come from running the artifact chain itself — and they cover them rigorously enough that a team can recognize each loop in the moment and act on it.

The names matter. Memorize them.

---

## Loop #1 — Spec drift caught at the gate

**Failure signal.** At PR review time, the lead notices the code does something the story doesn't specify — or fails to do something the story does specify. The story said "the path picker has a Browse button"; the PR shipped only a text input.

**Recovery procedure.**

1. **The lead explicitly chooses the direction of correction.** Either revise the code to match the spec, *or* revise the spec to match the code. **Not both quietly.** The "both quietly" pattern is what destroys the contract over time — Lesson 4 calls this out specifically.
2. If revising the code: the implementer updates the PR, re-runs their AI tool against the unchanged story, the new PR is re-reviewed.
3. If revising the spec: the implementer updates the story file *first*, the lead approves the spec update, then the code is reviewed against the revised story.
4. **The PR does not merge until the story and the code agree.**

**Why this loop is named.** Without a name, "the code looks weird" becomes a code-style argument. With a name, the team has a shared frame: *we have spec-vs-code drift; here's the procedure.*

**Boundary.** This loop is for cases where the spec was *correct* and the *code drifted* (or where, on reflection, the spec was correct but writing the code revealed a better path the team chooses to make explicit). For cases where the *spec itself was wrong from the start*, see Loop #5.

---

## Loop #2 — Unclear stories

**Failure signal.** The implementer (or their AI tool) reads the story and cannot decide what to build. The story says "make the path picker safer" without specifying what *safer* means. The implementer either pings the lead, or — worse — ships a PR that does *one* of three plausible interpretations and the lead doesn't know which one was meant.

**Recovery procedure.**

1. **Stop implementing.** This is loop #2's defining property: recovery happens *before* code is written, not at the gate.
2. The implementer (or whoever spotted the ambiguity) opens an edit on the story file. The story is amended to remove the ambiguity — adding ACs, naming a specific approach, citing the relevant PRD section.
3. The story update is reviewed by the lead. This can be a lightweight async sign-off or it can ride along the original story-creation review.
4. Implementation begins on the amended story.

**Why this loop matters separately.** Without Loop #2 as a named ritual, ambiguous stories get implemented anyway and the resulting PR review degenerates into "is this what we meant?" — which is Loop #1 territory but with a much higher cost (code already written, often discarded). **Loop #2's value is its preemption of the more expensive Loop #1 case.**

If you find your team running Loop #1 a lot, look upstream: you may be missing Loop #2.

---

## Loop #3 — Mixed-tooling conflicts

**Failure signal.** Two implementers complete adjacent stories. Their tools produced different conventions for the same kind of thing — different naming, different file locations, different test patterns. Reviewing the second PR, the lead sees the inconsistency. The conflict is not "one is wrong" but "we don't have a shared answer."

**Recovery procedure.**

1. **Decide where the convention belongs.**
   - If it's per-feature, capture it in the story (acceptance criteria or dev notes).
   - If it's per-repo, capture it in [`AGENTS.md`](../../AGENTS.md) and [`.github/copilot-instructions.md`](../../.github/copilot-instructions.md) — the dual-role files described later in this lesson.
2. **Update both files.** Drift between `AGENTS.md` and `.github/copilot-instructions.md` is itself a defect.
3. **Re-run the divergent PR's tool against the updated context.** With the convention now captured, the tool should produce output that aligns.
4. **Land the convention update before merging the original PRs.** Otherwise the convention is decided implicitly by whichever PR merges first.

**Why this loop is distinct.** Loops #1 and #5 are about a single story / single PR. Loop #3 is about two PRs whose individual code is faithful to *their* story but where the team-level convention is undefined. The recovery is at the per-repo context layer, not the story layer.

---

## Loop #4 — Story too big to land in one PR

**Failure signal.** The implementer (often via their AI tool's protest, or via their own pre-flight read) realizes the story has too many ACs, touches too many files, or has irreducible subgoals that should be reviewed separately. *Or* the lead, mid-review, realizes the PR is too large to evaluate confidently.

**Recovery procedure.**

1. **Stop coding (or pause the review).**
2. Split the story into N smaller stories, each independently mergeable. Each new story carries a fragment of the original story's ACs; together they cover the original.
3. Land the smallest one first. Use it to establish the convention; subsequent stories inherit.
4. **Critically: split before implementing, not after.** A "split after" amounts to extracting commits from a working branch — the lead has already eaten the cost of reviewing the integrated change.

**Why this loop is distinct.** It's the only loop whose recovery is *organizational* (more story files, more PRs) rather than *content* (revising a story or a piece of code). The team learns to recognize "this is too big" as a discrete signal.

This repo provides a real example: Epic 5 (Capstone runtime) was decomposed into seven stories — `5-1` through `5-7` — *before* implementing, because the integrated PR would have been unreviewable. The decomposition was the recovery loop applied early at the planning phase rather than at PR time.

---

## Loop #5 — Lead disagrees with the spec itself, not the code

**Failure signal.** The lead reviews a PR. The code is faithful to the story (no drift). But the lead, on reading the produced behavior, recognizes that the *story* is wrong — it specifies the wrong behavior, the wrong API shape, the wrong UX, the wrong test surface.

**Recovery procedure.**

1. **The lead explicitly names that the disagreement is with the spec, not the code.** This is the discipline that distinguishes Loop #5 from Loop #1. The framing is the procedure.
2. The story file is amended (likely with help from the PM or whoever owns the upstream PRD context).
3. **Acknowledge the cost.** Loop #5 means the implementer's work may be partially or wholly discarded. This is genuinely expensive; the team should *not* punish the implementer for it. *The contract held; the spec was wrong; the cost is the team's, not the individual's.*
4. The PR is closed (or partly reverted), the story is revised, a new PR is opened against the revised story.

**Why this loop matters.** Loop #1 catches *infidelity* — code didn't follow spec. Loop #5 catches *over-fidelity to a wrong spec* — code did follow spec, but spec was wrong. **The team needs both checks at the gate.** If a lead conflates them, they either:

- Treat #5 as #1 → they blame the implementer for an alignment problem, demoralize the team, and obscure that the upstream spec process needs work, or
- Treat #1 as #5 → they revise the spec to match drifted code, normalizing drift. (This is exactly the "both quietly" failure mode Loop #1 calls out.)

You can see Loop #5 in this repo's own history. The `feat/interactive-bootstrap-pty` branch (merged 2026-05-09) was a Loop #5 outcome: stories specifying a non-interactive bootstrap shipped faithful code, the lead realized the spec was wrong (interactive PTY was needed), the architecture and stories were amended, and the prior stories were marked superseded. The cost was real — discarded code — but the team named the loop and absorbed the cost cleanly.

---

## The single hardest distinction this lesson makes

**Loop #1 is "code drifted from spec." Loop #5 is "spec was wrong from the start." Confusing them is the most common gate-time failure.**

A frame that helps: at PR review time, ask:

> *"Would I have wanted this code if the story I wrote yesterday had been perfect?"*

- **Yes** → the code matches what should have been spec'd. The spec was wrong. **Loop #5.**
- **No** → the code matches the spec, but the spec was right. The code drifted. **Loop #1.**

If you can't tell, the answer is usually that the spec was ambiguous and the team is actually in **Loop #2**, retroactively. (This is the ladder of failure: ambiguous spec, implemented anyway, Loop #1 at the gate, lead wonders if it's Loop #5, eventually realizes Loop #2 was missed three steps back.) Catching it at Loop #2 is much cheaper than catching it at #1 or #5.

---

## The dual-role `AGENTS.md` + `.github/copilot-instructions.md` pattern

Loop #3's recovery procedure references two files at the repo root. This section explains them.

[`AGENTS.md`](../../AGENTS.md) is read by Claude Code, Codex, and OpenCode (sometimes via a `CLAUDE.md` symlink). [`.github/copilot-instructions.md`](../../.github/copilot-instructions.md) is read by GitHub Copilot. Both files carry the same purpose: **per-repo conventions that should not be re-stated in every story** — build commands, framework version pins, testing rules, no-go zones.

Two files exist because Copilot, at the time of this curriculum's authoring, doesn't read `AGENTS.md` — it reads its own dotfile. (`AGENTS.md` is converging as a cross-tool standard. In late 2025 it was donated to the Agentic AI Foundation. Copilot may eventually read it natively; the dual-file pattern is the v1 reality.)

The dual-role pattern has one critical maintenance invariant: **drift between the two files is a defect.** If `AGENTS.md` says "use vitest, not jest" and `.github/copilot-instructions.md` says nothing, then a Copilot user will produce jest tests faithfully — and the team will have Loop #3 the next time they review.

Two ways teams maintain sync:

- **Symlink `AGENTS.md` to `.github/copilot-instructions.md`** (or vice versa). The strongest guarantee — the files cannot diverge. Caveat: some tools follow symlinks differently; verify with each tool you use.
- **Comment in both files** stating they must stay in sync, with a CI check (or pre-commit hook) that fails when load-bearing constraints diverge. Less mechanical but works without symlinks.

This portal uses [`AGENTS.md`](../../AGENTS.md) and [`.github/copilot-instructions.md`](../../.github/copilot-instructions.md) at the repo root. After the capstone, your bootstrapped repo will have them too — and the HANDOFF.md will tell your team's lead to fill in the project-specific load-bearing constraints.

---

## A note on single-tool teams

If your team uses only one AI tool, are these recovery loops still useful?

Yes. Three of the five loops have nothing to do with mixed-tool concerns:

- **Loop #1** (drift) happens whenever AI generates code, regardless of tool.
- **Loop #2** (unclear stories) is a pure spec-quality issue.
- **Loop #5** (spec wrong) is a pure spec-quality issue.
- **Loop #3** is the one that's specifically about mixed tools — but a single-tool team can still hit it across *time* (the same tool produces different conventions on different days, especially across model versions).
- **Loop #4** (too big) is purely an organizational concern.

The lesson here: **the contract pattern is what makes the recovery loops work, not the multi-tool aspect of it.** Single-tool teams benefit from the same discipline.

---

## What's next

You now have the recovery loops named. The pinnable artifact at [`training/team-rituals-checklist.md`](../team-rituals-checklist.md) carries them as a one-page reference — print it, pin it in your repo, refer back to it when things go sideways.

**Lesson 6** is short. It frames the **capstone** — the 90–120 minute synthesis exercise where you'll experience everything in this curriculum on a real artifact chain through your own AI tool. The lessons end at Lesson 6; the actual practice begins at the capstone.
