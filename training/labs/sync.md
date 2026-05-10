---
title: Full-team sync lab
---

# Full-team sync lab

> **Format:** synchronous, full team in one room or one call. **Time:** 90 minutes. **Prerequisites:** all team members have completed the lessons + capstone individually.

## What this lab is

A 90-minute rehearsal where the team runs a BMAD planning cycle together on a real feature. The goal is not to ship the feature — the goal is to **build shared muscle memory** for how your team will run BMAD when there's no facilitator in the room.

This lab is what makes BMAD an actual team practice rather than a parallel set of individual practices. The contract pattern only holds when the team has done it together at least once.

---

## Setup

### Before the session

- **Team size:** 3–8 people. Smaller is fine; larger gets unwieldy and the lab loses focus.
- **One bootstrapped repo** the team can chat through together. Pick one teammate's capstone repo, or run `npx bmad-method install` on a fresh sandbox repo.
- **One real feature** the team needs to ship in the next sprint. Same constraints as the solo lab: small enough to fit, big enough to need 2–3 ACs.
- **Roles assigned in advance** (see Roles below).
- **One screen everyone can see** — projector, screen-share, or virtual equivalent.

### Roles

For this lab, role-play helps even if the assignment isn't your usual day-job. The roles are:

- **Implementer** (1 person) — drives the AI tool. Their tool of choice; their hands on the keyboard.
- **Lead** (1 person) — plays the gate-keeper at the end. Walks the lead-review checklist on the produced PR.
- **PM / Product owner** (1 person) — owns the upstream context (what the feature is for). Plays the user-need voice during brief and PRD shaping.
- **Observer / scribe** (1 person) — captures friction in writing. Doesn't participate in the chat; their job is to notice.
- **Everyone else** — peers. Ask clarifying questions, surface convention concerns, watch for recovery-loop signals.

Rotate roles if your team runs this lab multiple times. The observer role is especially useful to rotate — different people notice different friction.

---

## Steps

### 1. Frame the feature (15 min)

Open with the **PM** describing the feature in their own words for 5 minutes. The team asks clarifying questions for the next 10. **The implementer takes notes** — those notes will become the input to the brief-equivalent paragraph in step 2.

The observer is already at work: are the questions converging or diverging? Confusion at this stage is a future-Loop-#2 signal.

### 2. Brief + story (20 min)

The implementer launches their AI tool and invokes:

```
/bmad-create-story
```

with a one-paragraph brief based on step 1's notes. The team watches the story file get produced.

Then **read it together for 10 minutes.** The PM checks user intent. The lead checks ACs for testability. Peers surface convention concerns. The implementer edits the story file based on the discussion — *everyone agrees the file is the contract before moving on.*

This step is where Loop #2 (unclear stories) gets prevented. Don't skip the read-together.

### 3. Implement (30 min)

The implementer runs:

```
/bmad-dev-story <path-to-story-file>
```

The team watches the dev agent work. **No one types except the implementer**, but the team can call out questions ("Why is it doing X?", "Is that consistent with how we did Y last sprint?"). The implementer triages those: if they're significant, they pause and discuss; if they're minor, they note them for debrief.

When the dev agent finishes, the implementer runs the team's quad gate (lint + tests + whatever else). The team reviews the diff together on the shared screen.

### 4. Lead's gate review (15 min)

The **lead** walks the [lead-review checklist](../lead-review-checklist.md) on the diff in front of the team. They do this **out loud** — narrating which checks pass, which surface concerns, which would block a merge.

This is the highest-value moment of the lab. Most teams have never watched a lead review out loud against a checklist. The narration is the practice; the team learns the cadence by hearing it.

### 5. Debrief (10 min)

The **observer** reads back their friction notes. The team picks **two or three** items to act on:

- A convention that should be captured in `AGENTS.md` and `.github/copilot-instructions.md`.
- A check that should be added to the team's lead-review checklist.
- A recovery loop the team almost-hit (or did hit) and how to recognize it earlier next time.

---

## Artifact produced

- One story file (committed to the practice repo or stashed)
- A list of 2–3 convention/checklist updates for your team's repo
- Shared muscle memory for the chain

The actual code may or may not be merged — that's secondary. The shared experience is the point.

---

## Common patterns this lab surfaces

In our experience facilitating this lab:

- **The brief-equivalent paragraph in step 1 is too small.** Teams have 15 minutes of clarifying questions before the implementer types anything; that's information the brief should carry. Lesson surfaced: invest more in the framing paragraph; it's the foundation.
- **Loop #2 prevented at step 2.** The "read it together" stage catches AC ambiguity that would have produced spec drift later. Teams that skip step 2 hit Loop #1 in step 4.
- **Convention drift discovered.** Watching the dev agent work surfaces "we never agreed how to do X" moments. The debrief is where those become PRs to `AGENTS.md`.
- **The lead's narrated review is the highest-impact moment.** Most team members have never watched a lead's reasoning out loud. The narration teaches more than the checklist file does.

---

## See also

- [Solo lab](/labs/solo) — same shape, one person.
- [Async cross-team story-review lab](/labs/async-story-review) — cross-team review without live participation.
- [Lesson 5 — Working as a team](/lessons/5-working-as-a-team)
- [`training/lead-review-checklist.md`](../lead-review-checklist.md)
- [`training/team-rituals-checklist.md`](../team-rituals-checklist.md)
