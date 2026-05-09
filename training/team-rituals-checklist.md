---
title: Team Rituals Checklist
---

# Team Rituals Checklist

> **What this is.** A one-page post-capstone reinforcement reference for teams running BMAD. Pin a copy in your team's repo (under `docs/`, `training/`, or wherever your team keeps reference docs) and revisit it whenever a PR review or story-shaping conversation runs into trouble.

> **When to use it.** When something feels off. The contract pattern catches most issues silently; the recovery loops below catch the rest. Don't try to memorize the loops — bookmark this page and refer back.

> **Companion artifact.** [`training/lead-review-checklist.md`](lead-review-checklist.md) — the lead-side gate checklist. This file is the team-side ritual reference; the two work together.

---

## Before you start a story

- [ ] **There is a story file** under `_bmad-output/implementation-artifacts/<epic>-<n>-<slug>.md` (or your team's equivalent location) — not a Slack thread, not a verbal agreement.
- [ ] **The story has acceptance criteria in Given/When/Then form**, numbered (`AC1`, `AC2`, …).
- [ ] **You can act on the story unambiguously.** If you can't, you're already in Loop #2 — stop and revise the story before implementing.
- [ ] **You know who owns the paths you'll touch** (CODEOWNERS will route review there). If unsure, run `git blame` or check `.github/CODEOWNERS`.

## When you open a PR

- [ ] **The PR description links the story file** (relative path under `_bmad-output/implementation-artifacts/`).
- [ ] **The story file's Dev Agent Record is filled in.** Tasks ticked off, file list present, completion notes written.
- [ ] **The user story and acceptance criteria are unchanged from when you started.** If they've moved, you're in Loop #1 — name it before merging.
- [ ] **CI is green.** Required status checks pass before requesting human review.
- [ ] **The right CODEOWNERS team is auto-requested.** If not, the rule didn't match — check pattern precedence.

## At PR review time (companion to the lead-review checklist)

- [ ] **Spec-vs-code faithfulness:** does the diff implement what the story specified? See [`lead-review-checklist.md`](lead-review-checklist.md) §1.
- [ ] **Scope-fit:** does the diff do only what the story asked? See [`lead-review-checklist.md`](lead-review-checklist.md) §2.
- [ ] **Tests cover the change.** Not just CI green — the new tests actually exercise the new behavior.
- [ ] **Story file unchanged from contributor side** (user story + ACs). If changed, name the loop (#1 or #5) explicitly before merging.

## When the contract bites — the five recovery loops

When something breaks, name the loop, then run its procedure. Do not improvise; the named-procedure approach is what makes recovery cheap.

### Loop #1 — Spec drift caught at the gate

**Signal:** the code does something the story doesn't specify, or fails to do something it does.

- [ ] Lead explicitly chooses: revise the **code** to match the spec, OR revise the **spec** to match the code. **Not both quietly.**
- [ ] If revising code: implementer updates PR; re-run AI tool against unchanged story; re-review.
- [ ] If revising spec: implementer updates story file *first*; lead approves spec update; then code is reviewed against the revised story.
- [ ] PR does not merge until story and code agree.

### Loop #2 — Unclear stories

**Signal:** the implementer can't decide what to build from the story alone.

- [ ] **Stop implementing.** Recovery happens before code is written.
- [ ] Open an edit on the story file. Add ACs, name the approach, cite the relevant PRD section.
- [ ] Lead reviews the story update (lightweight async sign-off is fine).
- [ ] Implementation begins on the amended story.

### Loop #3 — Mixed-tooling conflicts

**Signal:** two PRs use diverging conventions for the same kind of thing. Each is faithful to its own story; neither is wrong.

- [ ] Decide where the convention belongs:
  - Per-feature → in the story (acceptance criteria or dev notes).
  - Per-repo → in `AGENTS.md` AND `.github/copilot-instructions.md` (must update both).
- [ ] Re-run divergent PR's tool against the updated context.
- [ ] Land the convention update **before** merging the original PRs (otherwise the convention is set implicitly by whichever PR merges first).

### Loop #4 — Story too big to land in one PR

**Signal:** the story has too many ACs, touches too many files, or has subgoals that should be reviewed separately. *Or* the lead realizes the diff is too large to evaluate.

- [ ] **Stop coding (or pause review).**
- [ ] Split the story into N smaller stories. Each carries a fragment of the original ACs; together they cover the original.
- [ ] Land the smallest one first. Establish the convention; subsequent stories inherit.
- [ ] **Split before implementing, not after.** "Split after" amounts to extracting commits from a working branch — costly and error-prone.

### Loop #5 — Lead disagrees with the spec itself, not the code

**Signal:** code is faithful to the story (no drift). But the *story* is wrong — wrong behavior, wrong API, wrong UX.

- [ ] Lead explicitly names: *"the disagreement is with the spec, not the code."* This framing is the procedure.
- [ ] Story file is amended (PM or upstream PRD context owner helps).
- [ ] **Acknowledge the cost.** Implementer's work may be partly or wholly discarded. **Don't punish the implementer** — the contract held; the spec was wrong; the cost is the team's, not the individual's.
- [ ] PR is closed (or partly reverted), story is revised, new PR is opened against the revised story.

---

## The single hardest distinction

**Loop #1 = "code drifted from spec." Loop #5 = "spec was wrong from the start."**

When you can't tell which loop you're in, ask:

> *"Would I have wanted this code if the story I wrote yesterday had been perfect?"*

- **Yes** → spec was wrong. Loop #5.
- **No** → code drifted. Loop #1.
- **Can't tell** → spec was ambiguous and you've been in Loop #2 the whole time. Catch it at #2 next time.

---

## Per-repo context discipline (Loop #3 prerequisite)

`AGENTS.md` and `.github/copilot-instructions.md` carry repo-wide conventions. Loop #3's recovery procedure depends on these files being maintained:

- [ ] Both files exist at the repo root.
- [ ] Their load-bearing constraints (build commands, version pins, testing rules, no-go zones) match.
- [ ] When you change one, change the other in the same PR.
- [ ] Periodically (quarterly is the cadence in this curriculum) re-walk both files. Convention drift accumulates silently otherwise.

A common shortcut: symlink one to the other so they cannot diverge. Verify with each AI tool that it follows the symlink before relying on it.

---

## Maintenance

Treat this checklist as your own:

- Edit it for your team. Add items specific to your domain (security, regulatory).
- Remove items that don't apply (a single-tool team may not need Loop #3 prep).
- Re-walk it quarterly. Items that have stopped earning their place can come out.
- Route changes through the same review gate the items describe.

---

## See also

- [Lesson 5 — Working as a team](lessons/5-working-as-a-team.md) — the rationale and worked examples behind each loop.
- [Lesson 4 — CODEOWNERS and the gate](lessons/4-codeowners-and-the-gate.md) — what makes the gate enforceable.
- [`training/lead-review-checklist.md`](lead-review-checklist.md) — the lead-side gate checklist; pair this checklist with that one.
- [`training/story-template.md`](story-template.md) — the canonical story format the AC checks above expect.
