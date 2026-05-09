---
title: Solo lab — Run BMAD on a feature you brought
---

# Solo lab — Run BMAD on a feature you brought

> **Format:** solo, asynchronous. **Time:** 60–90 minutes. **Prerequisites:** capstone complete; you've pushed the bootstrapped repo to your team's GitHub org or a sandbox repo of your own.

## What this lab is

The capstone walked you through BMAD on a synthetic project. This lab has you run the same chain on a **real feature you actually need to build** — in your team's real codebase, opening a real PR, going through your team's actual review gate.

You'll come out with a feature shipped (or in flight), and a felt sense for how the artifact chain holds up against real-world friction. Surfacing the friction is the point — the lab is most valuable when something doesn't work cleanly the first time.

---

## Setup

Pick a feature **before** you start the timer. Constraints:

- **Real, but small.** Something on your actual backlog. Pick the smallest feature that's still big enough to need a brief and at least 2–3 ACs. A typo fix is too small; a major refactor is too big.
- **You own the repo.** You can push to a feature branch and open a PR; CODEOWNERS will route review to your team. (If your team hasn't wired CODEOWNERS yet, this lab is a good forcing function — see Lesson 4.)
- **You can spend ~90 minutes** without interruption.

You also need:

- The bootstrapped capstone repo, OR a real repo with `_bmad/` and `.claude/skills/bmad-*` installed via `npx bmad-method install`. The capstone version is fine.
- Your AI tool of choice — Claude Code, Codex, or GitHub Copilot. Same one you used for the capstone is fine.

---

## Steps

### 1. Frame the work as a story (10 min)

Before reaching for any tool, write **one paragraph** describing the feature in your own words. Include:

- The user-facing outcome (what changes for the user, the team, or the system).
- The constraint (one or two non-obvious things this change must hold).
- The boundary (what this change is NOT doing).

This paragraph is your "brief equivalent" for a feature-sized scope. It's smaller than a full BMAD product brief — feature-sized briefs don't need the full 1–2 page treatment — but it carries the same role: a high-leverage spec the AI tool reads before producing the story file.

### 2. Run `bmad-create-story` (15 min)

Launch your AI tool from the bootstrapped repo. Invoke the story-creation skill:

```
/bmad-create-story
```

Paste your paragraph from step 1 as the input context. Let the skill produce a story file in `_bmad-output/implementation-artifacts/`.

When the story file is written, **read it.** Specifically:

- Are the ACs concrete enough to test against?
- Is anything ambiguous that would have you in Loop #2 if an implementer picked this up cold?
- Are there ACs that don't belong (scope creep)?

If yes to any of those, edit the story file directly. The story you commit should be one you'd hand to a teammate without explanation.

### 3. Implement via `bmad-dev-story` (30–45 min)

```
/bmad-dev-story <path-to-story-file>
```

Let the dev agent run. It will produce code and update the Dev Agent Record section as it works. Resist the urge to interrupt — the skill is single-shot by design.

When it finishes, run your team's actual quad gate (or whatever your CI runs locally):

```bash
npm run lint
npm run test
# whatever else applies
```

If anything fails, the dev agent should re-run on the failure. Do not silently fix things — that loses the loop the curriculum just spent five lessons teaching.

### 4. Open a real PR (10 min)

```bash
git checkout -b feat/<short-slug>
git add -A && git commit -m "<message>"
git push -u origin feat/<short-slug>
gh pr create --title "<title>" --body "<description with link to story file>"
```

The PR description must link the story file (see [Lesson 4](../lessons/4-codeowners-and-the-gate.md) lead-review-checklist item: "story-link reference").

### 5. Walk the lead-review checklist on yourself (10 min)

Before you ask for review, walk [`training/lead-review-checklist.md`](../lead-review-checklist.md) on your own diff. The most useful check: **is the story file unchanged from before the dev agent started?** If the user-story or acceptance criteria moved, you have spec drift you didn't catch — pause, name the loop, fix.

If the checklist surfaces something you missed, fix it before requesting review.

### 6. Get review and merge (variable)

Hand the PR off to a teammate (or, if you're solo, sit on it for an hour and re-review with fresh eyes). Apply any feedback. Merge.

---

## Artifact produced

- One story file at `_bmad-output/implementation-artifacts/<slug>.md`
- One PR (merged or in-flight) implementing the story
- A felt sense for friction points in your team's adoption

---

## Self-debrief prompts

After the merge (or after you stop the timer), answer these three questions in writing — even if just in your own notes:

1. **Where did the chain feel awkward?** Was the brief-equivalent paragraph too small? Did the story ACs surprise you? Did the dev agent need clarification you hadn't anticipated? The friction points are signal — they're where your team's adoption will need investment.
2. **Did you hit any of the recovery loops?** Loop #1 (drift), Loop #2 (unclear), Loop #4 (too big), Loop #5 (spec wrong)? If yes, did you name it explicitly when it happened, or were you in it for a while before noticing?
3. **What would you change about your team's `AGENTS.md` / `.github/copilot-instructions.md` based on what surfaced today?** Most teams discover that a few per-repo conventions belong in those files but were unstated. The lab is a great surface for noticing them.

Keep your notes. They're the input for your team's next BMAD-adoption conversation.

---

## See also

- [Lesson 5 — Working as a team](../lessons/5-working-as-a-team.md) — recovery loops by name.
- [`training/lead-review-checklist.md`](../lead-review-checklist.md) — what to walk on yourself before requesting review.
- [`training/team-rituals-checklist.md`](../team-rituals-checklist.md) — pin this in your team's repo if you haven't already.
- [Sync lab](sync.md) — same shape as this one, but with your team in the room.
