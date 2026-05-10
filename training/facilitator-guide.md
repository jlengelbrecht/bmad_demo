---
title: Facilitator — Workshop Guide
---

# Facilitator — Workshop Guide

> **Audience.** Someone running a half-day or full-day BMAD workshop with their team. **Prep target:** under 2 hours of facilitator prep before the workshop.

This guide gives you everything you need to run the workshop without re-deriving the lessons. It assumes you've personally completed the curriculum + capstone before you facilitate; that's the only non-negotiable prerequisite.

---

## Prep checklist (1.5–2 hours total)

Tick these off before the workshop. Each is sized to the time it takes.

- [ ] **Read all six lessons end-to-end** in `training/lessons/`. (~90 minutes; you've already done this if you completed the curriculum)
- [ ] **Run the capstone yourself once.** Not optional — you cannot facilitate a capstone-walk you haven't experienced. (~90 minutes; one-time)
- [ ] **Pre-clone and bootstrap a sandbox repo** the team can use. Save 15 minutes of session time. (~5 min)
- [ ] **Verify each attendee has the right AI tool installed and authenticated.** Send the [`tools-reference.md`](tools-reference.md) link a few days in advance with the install commands and an "if this doesn't work, message the facilitator before the session" note. (~10 min for outreach + verification)
- [ ] **Pick the lab format** for the workshop session (sync if half-day; sync + a planned async-cross-team handoff with another team if full-day). (~5 min, see "Picking a lab format" below)
- [ ] **Pin the curriculum's two reference checklists in your team's repo** (or have a draft PR ready) so the workshop can show real-team-context examples. (~10 min)
- [ ] **Print or open** [`training/lead-review-checklist.md`](lead-review-checklist.md) and [`training/team-rituals-checklist.md`](team-rituals-checklist.md) in tabs you can switch to during the workshop. (~2 min)

**Total: ~1h45m the first time. ~30 minutes for subsequent workshops.**

---

## Picking a lab format

The three lab formats serve different purposes; choose based on what your team needs most:

| Format | Best for | Time | Trade-off |
|---|---|---|---|
| [Solo](/labs/solo) | Teams new to BMAD; want individual hands-on time | 60–90 min/person | Doesn't build shared muscle memory |
| [Sync (full team)](/labs/sync) | Teams that have completed the capstone individually and need shared cadence | 90 min one-time | Single-team only; no cross-team validation |
| [Async cross-team](/labs/async-story-review) | Two teams piloting BMAD together; want strongest validation | ~30+30+15 min spread async | Only works if a partner team is also piloting |

**Recommendation for first-time workshops:** sync lab. The shared muscle memory it builds is the highest-leverage outcome of a one-day workshop. Solo and async work better as *follow-up* to a sync workshop, not as the workshop itself.

---

## Workshop schedule — half-day (4 hours)

This schedule assumes attendees have completed the lessons but NOT the capstone in advance. Adjust if your prep included individual capstone runs.

| Time | Activity | Notes |
|---|---|---|
| 0:00 – 0:30 | Welcome + lessons recap (lessons 1–3) | Conceptual; no AI tool needed yet |
| 0:30 – 1:00 | Lessons 4–5 recap + checklist walkthrough | Show the lead-review + team-rituals checklists |
| 1:00 – 1:15 | Break | |
| 1:15 – 2:45 | **Capstone (everyone runs in parallel)** | Each person on their own laptop, their own AI tool |
| 2:45 – 3:00 | Break | |
| 3:00 – 3:50 | **[Sync lab](/labs/sync)** | Whole team, role-played, ~50 min compressed version |
| 3:50 – 4:00 | Closing + Day-2 commitments | What goes into the team's repo as a result |

The two breaks matter. Capstone is intense; recovery time keeps the back-half attention.

---

## Workshop schedule — full day (7 hours)

| Time | Activity | Notes |
|---|---|---|
| 0:00 – 0:45 | Welcome + lessons 1–3 recap | More time for questions |
| 0:45 – 1:30 | Lessons 4–5 deep dive + checklist walkthrough | Spend the time on the Loop #1 vs #5 distinction |
| 1:30 – 1:45 | Break | |
| 1:45 – 3:30 | **Capstone (in parallel)** | Full 90+ min |
| 3:30 – 4:30 | Lunch | Don't skimp; capstone is mentally heavy |
| 4:30 – 5:30 | **[Sync lab](/labs/sync)** | Full 90 min version |
| 5:30 – 5:45 | Break | |
| 5:45 – 6:30 | Lesson 5 — five-recovery-loops drill | Live: pick three real PRs from your team's history; identify which loop each one was, in retrospect |
| 6:30 – 7:00 | Day-2 commitments + workshop debrief | What changes go into the repo this week |

The "five-loops drill" in the afternoon is the highest-leverage extension over the half-day format. It anchors the curriculum to your team's real history.

---

## Per-lesson facilitation notes

For each lesson, the most useful facilitator move:

### Lesson 1 — What is BMAD

**Common questions:**

- *"How is this different from Spec Kit / Cursor Rules / [other-thing]?"* — They're complementary. BMAD is the team-rituals layer; the others are tools. The point is the contract pattern, not the framework.
- *"Why six named agents?"* — They're not load-bearing for trainees. Don't dwell.

**Facilitator move:** open the [bmadcode.com](https://bmadcode.com/) tab live. Stakeholders sometimes need to see attribution preserved.

### Lesson 2 — The artifact chain

**Common questions:**

- *"Do we need to produce all of these artifacts for every feature?"* — No. Feature-sized work uses a brief-equivalent paragraph + a story file. Project-sized work uses the full chain. Match artifacts to scope.

**Facilitator move:** open [`_bmad-output/planning-artifacts/`](/source/_bmad-output/planning-artifacts/architecture.md) tabs to a real artifact each. Click around live; the self-reference is the lesson.

### Lesson 3 — Stories as tool-agnostic contract

**Common questions:**

- *"What if my team only uses one AI tool?"* — Lesson 5 has the single-tool answer. The contract pattern still holds.

**Facilitator move:** if the team has multiple AI tools, ask each person to read the same story file and describe how their tool would interpret it. Differences are real and instructive.

### Lesson 4 — CODEOWNERS and the gate

**Common questions:**

- *"We have CODEOWNERS but it's never enforced — why?"* — Almost certainly missing "Require review from Code Owners" branch protection. Show the setting live.
- *"What about Renovate / Dependabot PRs?"* — They go through the same gate. Most teams add a CODEOWNERS rule for `package.json` + `lockfiles` to route those PRs deliberately.

**Facilitator move:** show your team's actual CODEOWNERS (or one you set up for the workshop). Walk the lead-review checklist on a real recent PR. Half the lesson is in the live walk.

### Lesson 5 — Working as a team

**Common questions:**

- *"How do we know which loop we're in in real time?"* — Practice. The frame question ("would I have wanted this code if the story had been perfect?") helps; experience matters more.
- *"Can we add a sixth loop?"* — Resist this. The curriculum's discipline is naming few things rigorously.

**Facilitator move:** the five-loops drill described in the full-day schedule. Even in a half-day, allocate 10 minutes to "name a recent PR review you struggled with — which loop was it?" The activity unlocks the lesson.

### Lesson 6 — Capstone framing

Don't recap this — go straight into the capstone. Lesson 6 is itself short; running through it is the recap.

---

## During the capstone

While the team runs the capstone in parallel:

- **Be available, not directive.** If someone asks "what should I write for the brief?", redirect them to the AI tool's prompt. The point is to feel what the chain produces, not your version of it.
- **Spot stuck attendees.** If someone is silent for 15 minutes, check in. Common cause: the AI tool's auth has timed out or the install is broken; refer to [`tools-reference.md`](tools-reference.md).
- **Take notes.** As people surface friction, write down the patterns. They become the workshop debrief.

---

## Common workshop concerns

### "I don't have an AI tool installed"

If you discover this on the day of the workshop, the day is much harder. Your prep checklist's "verify each attendee has the right AI tool installed" item is the highest-leverage prep step.

If it happens anyway:

- Pair the unequipped attendee with someone who has a tool. They participate as observer.
- Assign them the observer role in the sync lab.

### "The AI tool gave me a different answer than the prompt expected"

Normal. The lesson is the chain holding up despite the variance, not the AI being deterministic. Encourage the trainee to commit what they got and continue.

### "I don't think this would work in my team"

The objection is honest; treat it that way. Common variants:

- "Our lead is too busy to gate every PR" — Lesson 4 is silent on multi-owner CODEOWNERS for v1; the curriculum acknowledges this is a real concern. Recommend the team start with critical-paths-only CODEOWNERS and expand.
- "Our PMs / designers won't write stories" — they don't have to author the story; they have to read it before they sign off on the artifact chain. Lesson 1's coding-skill-neutral framing is the answer.

---

## Closing the workshop

Allocate 10–15 minutes for **Day-2 commitments.** The team should leave with three things:

1. **Two checklist files committed to your team's repo.** Pin [`training/lead-review-checklist.md`](lead-review-checklist.md) and [`training/team-rituals-checklist.md`](team-rituals-checklist.md) under your `docs/` directory or equivalent. Customize them to your team's domain.
2. **A `CODEOWNERS` file plus branch protection** at least for `main` (if not already in place). This is the load-bearing infrastructure; deferring it defers the curriculum's impact.
3. **A scheduled retrospective** in 4–6 weeks to revisit what worked. The curriculum's effects compound; revisit it once the team has real PRs through the gate.

Without these three commitments, the workshop is a nice memory.

---

## See also

- [`/start-here`](/start-here) — what attendees see before the workshop
- [`/stakeholder`](/stakeholder) — for the leadership conversation that authorized the workshop
- [`training/tools-reference.md`](tools-reference.md) — what to send attendees a few days before
- [`_bmad-output/planning-artifacts/research/bmad-team-rituals.md`](/source/_bmad-output/planning-artifacts/research/bmad-team-rituals.md) — the underlying research the curriculum draws on; useful for "why does the lesson say X?" questions you can't answer in the moment
