---
title: CODEOWNERS and the gate
---

# Lesson 4 — CODEOWNERS and the gate

> **Reading time:** ~20 minutes. **Prerequisites:** Lessons 1, 2, and 3.

## What you'll learn

- Why **CODEOWNERS** is the enforcement layer for the story-as-contract pattern — and why it's only enforceable when paired with branch protection.
- How CODEOWNERS, branch protection, and required status checks fit together (and the order in which to wire them).
- The four CODEOWNERS rules that catch teams in production — last-match-wins, silent-skip on missing teams, draft-PR behavior, and the markdown-trap pattern-precedence example.
- What the **lead reads for at the gate** — concrete, repeatable items rather than narrative platitudes.

This lesson is the densest in the curriculum and produces the curriculum's most pinnable artifact: [`training/lead-review-checklist.md`](../lead-review-checklist.md), a one-page checklist your team's lead can drop into your repo on Day 2 and use on real PRs.

---

## CODEOWNERS, briefly

A `CODEOWNERS` file is a text file that maps file patterns to GitHub usernames or team handles. When someone opens a PR that touches a path matched by a rule, GitHub auto-requests review from the matched owner(s).

That's all CODEOWNERS does on its own. It does **not** approve, it does **not** gate, it does **not** block merges. It is **a routing mechanism**.

The gate exists only when a separate setting — branch protection (or its newer cousin, repository rulesets) — explicitly requires "Review from Code Owners" before merging. Most teams that adopt CODEOWNERS without branch protection learn this the hard way: they spend a week tagging the file with thoughtful owner assignments, then watch a PR merge with zero owner approvals because nothing required them.

GitHub looks for `CODEOWNERS` in three places, **in order**:

1. `.github/CODEOWNERS`
2. `CODEOWNERS` (repo root)
3. `docs/CODEOWNERS`

The first one found wins; the others are silently ignored. If you find yourself wondering why your CODEOWNERS rules aren't matching, check whether you have two files in different locations.

---

## CODEOWNERS syntax in 90 seconds

Each line is a pattern followed by one or more owners:

```text
*               @org/everyone
*.go            @org/go-team
/web/app/       @org/frontend @org/portal-leads
/.github/       @org/portal-leads
```

The patterns follow most of the rules from `.gitignore`, with three documented deletions you need to memorize because they don't error — they just silently fail to do what your `.gitignore` instinct expects:

- **No escape character.** You cannot write a pattern starting with `#` (it's always a comment).
- **No negation with `!`.** You cannot say "everything except `/build/`."
- **No character ranges with `[ ]`.**

Standard glob behavior that does work:

- `*` matches anything except a path separator.
- `**` matches anything, including slashes.
- A leading `/` anchors to the repo root.
- A trailing `/` matches a directory and everything beneath it.

Owners can be `@username`, `@org/team-name`, or `email@example.com` (except for managed user accounts in enterprise EMU configurations). Teams must have **write access or higher** on the repo for the rule to take effect — if they don't, the rule is silently skipped and no owner is assigned. Teams that have been renamed, deleted, or had their access revoked cause the same silent-skip failure mode (we'll come back to this).

---

## Last matching pattern wins

This is the single rule that bites teams more than any other:

> **The last matching pattern in CODEOWNERS takes precedence — not the first.**

Given:

```text
*       @global
*.md    @docs-team
/_bmad-output/         @curriculum-team
/_bmad-output/research/ @curriculum-leads
```

Walk through five paths a PR might touch:

| Path | Matched by | Final owner |
|---|---|---|
| `web/page.tsx` | `*` | `@global` |
| `README.md` | `*`, `*.md` | `@docs-team` (last match) |
| `_bmad-output/notes.txt` | `*`, `/_bmad-output/` | `@curriculum-team` |
| `_bmad-output/notes.md` | `*`, `*.md`, `/_bmad-output/` | **`@curriculum-team`** (path-rule beats `*.md` because it's later) |
| `_bmad-output/research/github.md` | all four | `@curriculum-leads` |

Row four is the trap. A markdown file inside the `_bmad-output/` directory routes to `@curriculum-team`, not `@docs-team` — because `/_bmad-output/` appears below `*.md` in the file. If your intent was "all markdown to docs-team, no exceptions," you'd need to put `*.md` after the path-scoped rules. But then markdown inside `/_bmad-output/research/` would also route to `@docs-team`, defeating the curriculum-leads gate.

The honest answer: **CODEOWNERS doesn't compose like predicates.** You pick a primary axis — path *or* filetype — and the other axis loses. Teach this to your team before they write their first non-trivial CODEOWNERS file. The scars are unnecessary.

---

## Branch protection — what makes the gate enforceable

CODEOWNERS without branch protection is decorative. Here's what to turn on, with the exact setting names from the GitHub UI:

In **Settings → Branches → Add rule** (or the newer **Rulesets**), targeting `main`:

- **Require a pull request before merging** — no merging directly to `main`.
- **Require review from Code Owners** — the bridge between CODEOWNERS and the actual gate. Without this checkbox, code owners get auto-requested but their approval isn't required.
- **Dismiss stale pull request approvals when new commits are pushed** — if you approve at commit A, a follow-up push to commit B re-opens the approval window. Without this, an owner could approve, then unrelated changes ship under the same approval.
- **Do not allow bypassing the above settings** — the modern equivalent of the older "Include administrators" toggle. Without it, repo admins can bypass the gate and undo every other rule with one merge.

A status check (CI run) can be required *in addition* to the human gate:

- **Require status checks to pass before merging** — name your CI workflow exactly. If you misspell it, every merge will be blocked indefinitely with no clear signal.
- The check name must match exactly. The lint:links script in this repo, for example, runs as part of `npm run lint:links` and would be wired as a required check in a real production setup.

A useful order of operations when you're wiring this on a fresh repo, because some of these steps fail silently when reversed:

1. Create the teams in the org. (CODEOWNERS pointing at non-existent teams is silently skipped.)
2. Add `.github/CODEOWNERS` with rules. Open the file in the GitHub UI; errors are highlighted inline.
3. Open a test PR. Verify the right team is auto-requested. If not, the rule didn't match or the team lacks write access.
4. Configure branch protection. Turn on the four required-review settings above.
5. Try to merge without owner approval. It should block.
6. Get the approval; merge. Confirm it succeeds.
7. **Now** wire required status checks (not before — pending checks block all merges).
8. Optionally enable auto-merge.

---

## Repository rulesets — branch protection's modern cousin

GitHub introduced **rulesets** in 2023 as a more flexible governance layer. They overlap with branch protection but add useful features:

- **Multiple rulesets can apply to one branch** without you having to consolidate everything into one branch-protection rule.
- **"Evaluate" mode** lets a ruleset run as a no-op for a while — you can see what it *would* have blocked without actually blocking anything. Useful for landing new policies without surprise outages.
- **Org-level rulesets** apply across all repos in the org. A platform team can require "code-owner approval on `main`" everywhere without per-repo configuration.
- **Bypass actors** can be configured (a specific user, team, or "repo admins") to skip the rules under audit logging.

For a small repo, branch protection rules are simpler. For a multi-repo org, rulesets are the right tool. The two coexist; if both apply to a branch, GitHub doesn't document an unambiguous tie-breaker between them. The teaching takeaway: **don't run both on the same branch.** Pick one mechanism per branch and stick to it.

---

## The minimum viable enforceable gate

Three components must be wired together:

1. **`.github/CODEOWNERS`** — at least one rule that maps every directory the team cares about to a team or named user with write access.
2. **Branch protection on `main`** — with "Require a pull request," "Require review from Code Owners," "Dismiss stale approvals," and "Do not allow bypassing" all on.
3. **A required status check** (e.g., the canonical npm scripts in this repo) — so machine-checkable invariants pass before the human gate.

Without #1, "Require review from Code Owners" matches no rules and produces no requirement.
Without #2, CODEOWNERS auto-requests reviewers but their approval isn't required.
Without #3, the lead at the gate is reading code that hasn't been mechanically validated.

When all three are wired, the chain becomes load-bearing: a PR cannot reach `main` without (a) CI passing, (b) the named code owner approving, (c) approvals not being stale relative to the latest commit, and (d) no admin shortcut around the rules.

---

## Worked example: a CODEOWNERS for a portal like this one

For a repo shaped like the one you'll bootstrap during the capstone (a Next.js app, an Express API, training content under `_bmad-output/`, CI under `.github/`), a defensible starting CODEOWNERS:

```text
# Catch-all so unmatched paths still need a sign-off.
*                       @org/portal-leads

# Web (Next.js)
/web/                   @org/portal-frontend
/web/app/api/           @org/portal-frontend @org/portal-backend

# API (Express)
/api/                   @org/portal-backend

# Training content
/_bmad-output/          @org/portal-curriculum

# CI / governance — locked tighter
/.github/               @org/portal-leads
/.github/CODEOWNERS     @org/portal-leads
/.github/workflows/     @org/portal-leads @org/security
/scripts/               @org/portal-leads
```

A few patterns worth naming:

- **The catch-all on line 1**, overridden by every more-specific rule below it. No path slips through unowned.
- **Two owners on `/web/app/api/`.** When this shared boundary changes, both teams must approve.
- **CODEOWNERS itself is owned.** Changes to who owns what require a leads approval. Without this, a contributor could open a PR that quietly removes the gate they're about to skip.
- **`.github/workflows/` is co-owned by leads and security.** CI changes are an attack surface; review accordingly.
- **No `!` negation needed.** Last-match-wins lets you express scope without exclusion.

This is the kind of CODEOWNERS the capstone's HANDOFF.md will tell your team's lead to drop into the bootstrapped repo on Day 2 (with `<your-org>` and `<your-team-name>` placeholders replaced for your actual org).

---

## What the lead reads for at the gate

CODEOWNERS routes the PR to the right human. Branch protection makes that human's approval load-bearing. But what is the human actually *doing*?

This is the lesson moment that gets handwaved more often than any other in industry "how to review AI-generated code" guides. Vague injunctions ("look for quality, look for safety") don't translate into a repeatable practice. So this curriculum produces a concrete artifact instead: the **lead-review checklist**.

The full checklist lives at [`training/lead-review-checklist.md`](../lead-review-checklist.md). The headline items:

1. **Spec-vs-code faithfulness.** The PR claims to implement Story X. Read Story X's user-story and acceptance criteria. Compare against the diff. Does the diff implement what the story specified — nothing more, nothing less?
2. **Scope-fit.** Is the diff doing only what the story asked? Refactoring code outside the story's scope is a separate concern; bundling it makes review harder. (Story 5 in this curriculum will revisit this as one of the named recovery loops.)
3. **Tests still passing AND covering the change.** Required CI matters for "is this safe to merge"; reading the new tests matters for "does this PR actually exercise the new behavior?"
4. **Story update.** The Dev Agent Record section should be filled in. The status field should be advanced. The user-story and acceptance criteria should be **unchanged**. If they've changed, that's the most common AI-assisted failure mode (Lesson 5's "spec drift caught at the gate" recovery loop) — the spec has silently moved to match the code.
5. **CODEOWNERS routing sanity.** Is the right group on this review? If a security-relevant directory is changing and security isn't on the PR, that's a CODEOWNERS gap the lead should fix in a follow-up — not necessarily block this PR over, but flag. (If the diff touches a path whose authority level the lead is unsure about, [Lesson 5's decision-authority section](/lessons/5-working-as-a-team) names which artifacts need lead-approval, multi-owner, or team-consensus.)
6. **Day-2 governance.** Are there changes to `.github/CODEOWNERS`, `.github/workflows/`, or branch protection scripts? Those changes need extra scrutiny because they change the rules of the game. (Per Lesson 5, these are leads-only changes — the gate's most upstream level of authority.)

The full checklist on the linked page expands each item with concrete what-to-look-for prompts. Pin a copy in your team's repo, customize the language for your team's context, and use it on real PRs.

---

## Common failure modes

A short list of patterns that look like governance but aren't:

- **CODEOWNERS without "Require review from Code Owners" branch protection.** The most common production failure. Looks gated; isn't.
- **Allowing administrators to bypass.** Governance theater.
- **Wildcard CODEOWNERS that route everything to one team.** Routing-without-review — owner is "everyone," approval comes from anyone, no real gate.
- **Required status check that's misnamed.** Blocks all merges with no clear error.
- **Approvals not dismissed on new commits.** A reviewer approves at commit A; commit B silently ships under the same approval.
- **CODEOWNERS rule pointing at a deleted or renamed team.** Silently produces no required reviewer; PR sails through.

The theme: each failure mode is *invisible* — the UI doesn't surface a warning. Adopt the wiring order above and the verification step where you try to merge without approval. If the merge succeeds, your gate isn't enforceable.

---

## What's next

You now know what makes the gate enforceable, what the lead reads for, and have a pinnable checklist artifact. **Lesson 5** turns to the moments when the contract bites — what to do when code drifts from the spec, when a story turns out to be too big, when two teammates' tools produce diverging conventions. Lesson 5 names **five recovery loops** and produces the team-rituals checklist as its concrete output.

Before Lesson 5, take five minutes with the [lead-review checklist](../lead-review-checklist.md). Skim it now; you'll come back to it on real PRs after the capstone.
