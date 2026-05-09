---
title: Lead Review Checklist
---

# Lead Review Checklist

> **What this is.** A concrete, repeatable checklist for the human at the lead-approval gate. Pin a copy of this file in your team's repo (under `docs/`, `training/`, or wherever your team keeps reference docs) so the items below are at hand when a PR opens.

> **Why this is a lead artifact, not a contributor artifact.** The checklist is what *the reviewer* reads for, not what the contributor self-checks. The PRD framing is explicit on this point: the human at the gate enforces the contract; CI does not. CI catches mechanical regressions; the human catches semantic drift between spec and implementation. This file lives on the human side of that line.

> **How to use it.** When you open a PR for review, walk the checklist top-to-bottom against the diff. Most items take 30 seconds; #1 and #2 take longer because they're the load-bearing ones. If an item fails, the right move is usually one of the [five recovery loops](lessons/5-working-as-a-team.md) — not to silently fix it.

---

## Before you start

A 30-second pre-check before you read the diff:

- [ ] **The PR has a story-link reference.** Either the PR description or the linked branch name names the story file under `_bmad-output/implementation-artifacts/<epic>-<n>-<slug>.md`. If there's no link, ask for it before reviewing — the rest of this checklist needs the story open in another tab.
- [ ] **CI is green.** Lint, typecheck, link-integrity scan, unit tests, e2e tests. If any of these are red, you're reading code the toolchain hasn't validated. Ask the contributor to fix CI before review.
- [ ] **You are the right reviewer.** CODEOWNERS auto-routed you because the PR touches paths you own. If the diff also touches paths owned by another team and they're not on the review, request them before approving.

---

## The six load-bearing checks

### 1. Spec-vs-code faithfulness

This is the lead's primary job. Open the linked story file. Read the **user story** and the numbered **acceptance criteria**. Now read the diff.

For each AC:

- [ ] Is there code in the diff that implements this AC?
- [ ] Does the implementation match the AC's preconditions and outcomes (Given / When / Then)?
- [ ] Are the AC's outcomes covered by the new tests in this PR?

The AC is the contract. If the diff doesn't implement it, the PR isn't done. If the diff implements something *different* from the AC, you have **spec drift caught at the gate** — Recovery Loop #1 in Lesson 5. The fix is to revise either the code or the story (not both quietly), depending on which one was wrong.

If the AC is so vague you can't tell whether the code matches, that's **Recovery Loop #2**: revise the story before merging.

### 2. Scope-fit

- [ ] Does the diff do only what the story asked for?
- [ ] If the diff includes drive-by refactors or adjacent improvements, are they small enough to absorb in this review?
- [ ] If a refactor is significant, has it been moved to a separate PR or named explicitly in the PR description?

The principle: a story is a unit of agreed scope. Bundling unrelated changes into the same PR makes review harder, makes rollback harder, and obscures what the story actually shipped. Drive-by *fixes* (typo in a nearby comment, a one-line correction the contributor noticed) are fine. Drive-by *refactors* should usually be a separate PR.

If the contributor argues that a refactor is necessary for the story to land cleanly, that's defensible — but it should be named in the story or the PR description, not silent.

### 3. Tests pass *and* cover the change

- [ ] CI is green (you already checked this above; re-confirm).
- [ ] At least one new or modified test exercises the new behavior introduced by this PR.
- [ ] If the story's AC describes a failure-mode behavior (`On non-2xx, the local state reverts`), there's a test covering that failure mode.

Coverage isn't about percentages; it's about whether the new tests actually exercise the new code. A common AI-coding failure mode: tests are added that pass against the existing implementation without exercising the new behavior. Skim the diff in the test file — does the assertion name an expected outcome the implementation could plausibly violate?

### 4. Story file updates

- [ ] **The user story and the acceptance criteria in the story file are unchanged.** This is the most important check on the list. If they've moved, the spec has silently drifted to match the code — Recovery Loop #1. Block the PR; revisit the story before merging.
- [ ] The Dev Agent Record section is populated: tasks ticked off, file list present, completion notes filled in.
- [ ] The story's status field has advanced (`in-progress` → `done` or similar).
- [ ] Any deviations from the original AC are explicitly captured in a "Review Findings → Deferred" or "Review Findings → Dismissed" section in the story file, with rationale.

### 5. CODEOWNERS routing sanity

- [ ] The right groups are on this review (CODEOWNERS auto-routed correctly).
- [ ] If the diff touches a security-relevant directory and security isn't on the PR, flag it.
- [ ] If the diff touches a path that *should* have an owner but doesn't, file a follow-up to add the rule.

CODEOWNERS rot is real. Rules that referenced teams that have since been renamed, or paths that have moved, silently stop matching. Periodically (quarterly is the cadence used in this curriculum) walk your CODEOWNERS file and verify each rule still routes the way it should. The lead's gate review is a good time to notice rot.

### 6. Day-2 governance changes

- [ ] If the PR touches `.github/CODEOWNERS`, `.github/workflows/`, branch protection settings, or any infra script — read it twice. These changes change the rules of the game.
- [ ] CODEOWNERS changes should preserve coverage (no path that was owned becomes unowned without a deliberate decision).
- [ ] CI workflow changes that *remove* status checks should have an explicit rationale and a follow-up to restore equivalent coverage.

These changes are how teams accidentally erode the gate. A small CODEOWNERS edit "to clean up rules" silently removes coverage; a CI workflow change "to fix flakes" silently removes a required check. Treat governance changes as non-routine even when they look small.

---

## A note on the five recovery loops

The checklist above will catch most issues. When it does, the right response usually maps to one of [Lesson 5's named recovery loops](lessons/5-working-as-a-team.md):

| Checklist item that failed | Recovery loop |
|---|---|
| #1 — code doesn't match the spec | Loop 1: spec drift caught at the gate |
| #1 — AC is too vague to test against | Loop 2: unclear stories |
| Two engineers' PRs use diverging conventions | Loop 3: mixed-tooling conflicts |
| #2 — diff is too big to review confidently | Loop 4: story too big to land in one PR |
| #1 + the spec was wrong, not the code | Loop 5: lead disagrees with the spec itself |

The recovery procedures are in Lesson 5. Don't try to remember them from this page — bookmark Lesson 5 instead.

---

## Maintenance

This checklist is a starting point. Edit it for your team:

- Add items specific to your domain (security, regulatory, accessibility).
- Remove items that don't apply (a project without CODEOWNERS doesn't need #5).
- Re-walk it quarterly with the team to catch items that have stopped earning their place.

Treat the checklist itself as an artifact: keep it under version control, route changes through the same review gate it describes, and let it evolve with the team.

---

## See also

- [Lesson 4 — CODEOWNERS and the gate](lessons/4-codeowners-and-the-gate.md) — the rationale behind each checklist item.
- [Lesson 5 — Working as a team](lessons/5-working-as-a-team.md) — recovery loops to invoke when an item fails.
- [`training/team-rituals-checklist.md`](team-rituals-checklist.md) — the post-capstone reinforcement checklist; complementary to this one.
- [`training/story-template.md`](story-template.md) — the canonical story file format the AC checks above expect.
