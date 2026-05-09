---
title: Async cross-team story review lab
---

# Async cross-team story review lab

> **Format:** asynchronous, two teams, no live pairing. **Time:** ~30 min author + ~30 min review + 15 min debrief (live or async). **Prerequisites:** both teams have completed the lessons + capstone.

## What this lab is

The headline test of the story-as-contract claim is this: **can a story file written by Team A be reviewed and signed off by Team B, who never spoke to Team A about it?**

If yes, the contract holds across organizational boundaries — which is the strongest possible validation. If no, the team-rituals layer is incomplete and the lab tells you exactly where.

This lab deliberately **does not include implementation.** The point is to test whether the story is a sufficient contract, not whether the code follows it. Team B reviews and signs off (or rejects) on the story alone.

---

## Setup

### Teams

- **Team A** — the *author* team. Writes a story for a feature **in their own product domain**.
- **Team B** — the *reviewer* team. Reads and signs off (or rejects) without ever pairing live with Team A.

The two teams should share **no domain context** in advance. Pick teams that work on different products; the cross-domain barrier is the test.

### Handoff mechanism

Pick one async medium and stick to it for the whole lab:

- A PR comment thread on a story-file PR (preferred — most realistic)
- A doc-share with comments (Notion, Google Docs)
- A Slack/Teams channel dedicated to the lab

The medium matters less than that everyone uses *the same* medium. Resist the urge to "just hop on a call to clarify" — that defeats the lab's purpose. If something is genuinely unclear async, that's a Loop #2 signal worth capturing.

### Artifacts each team needs

- **Team A:** access to a repo (the capstone repo is fine) + their AI tool of choice + 30 min focused time.
- **Team B:** access to the same repo (or just the story file) + [`training/lead-review-checklist.md`](../lead-review-checklist.md) + 30 min focused time.
- **Both teams:** [`training/story-template.md`](../story-template.md) for reference.

---

## Steps

### Phase 1 — Team A writes the story (30 min, async)

Team A picks a feature in their domain that's small enough for one PR but real enough to need 2–3 ACs. They:

1. Frame the feature in a one-paragraph brief equivalent (per the solo lab).
2. Run `/bmad-create-story` against their AI tool with the paragraph as input.
3. Edit the produced story file: ACs concrete, scope clear, dev notes lifted from the relevant architecture context, no jargon Team B won't recognize.
4. **Critically: do not implement.** The point is to test the story, not the code.
5. Open a PR (or doc, or message) with just the story file and a single line: *"Team B — please review and sign off or reject."*

### Phase 2 — Team B reviews (30 min, async)

Team B reads the story cold. They walk the [lead-review checklist](../lead-review-checklist.md) — but instead of comparing code-vs-spec (there is no code), they ask:

1. **Could I implement this without asking a clarifying question?** If no, write down which AC or section was unclear.
2. **Is the scope clear?** Is there anything I'd be unsure whether to include or exclude?
3. **Are the ACs testable?** Could I write a test for each AC without inventing semantics?
4. **Are there team-domain assumptions I notice that aren't stated?** (Team A's domain conventions might be invisible to them — Team B is the cross-domain check.)

Team B's output: either a sign-off comment ("approved — could implement") OR a list of specific clarifying-question issues with line references. **No live discussion.** If the story can't survive an async review, it wasn't a sufficient contract.

### Phase 3 — Debrief (15 min, can be live)

Both teams meet briefly (live optional — async write-up works too). The agenda:

1. **Did Team B sign off?** If yes, what made the story sufficient? If no, what specifically failed?
2. **What did Team A *not* think to specify** that Team B needed?
3. **Did Team B's clarifying questions cluster?** (E.g., "all five questions were about error handling" → that's a per-repo convention `AGENTS.md` should capture, not a per-story problem.)
4. **What changes go into both teams' repos as a result?** Updates to `AGENTS.md`, `.github/copilot-instructions.md`, the lead-review checklist, the story template.

---

## Artifacts produced

- One story file (Team A's, possibly amended after Phase 2)
- One review write-up (Team B's, with sign-off or specific issues)
- A list of cross-domain conventions that need to live in `AGENTS.md` / equivalent

The story file may or may not get implemented later — that's outside the lab's scope.

---

## What this lab tests that no other lab does

- **The contract pattern *across organizational boundaries*.** Sync labs and solo labs validate the contract within a team that shares context. This lab is the only one that validates it across teams that don't.
- **The async-checkpoint muscle.** The temptation to "hop on a call" is real and almost always counterproductive. The story-as-contract claim only holds if a written file is a sufficient handoff. The lab forces this discipline.
- **Domain-knowledge invisibility.** Team A doesn't know what Team A "just knows." Cross-domain review surfaces it.

---

## Common patterns this lab surfaces

- **Implicit team conventions.** Every team has them; few are written down. Cross-domain review surfaces "we always do X but never said so" moments. Recovery: capture in `AGENTS.md`.
- **AC vagueness Team A didn't notice.** A familiar phrase ("the standard error pattern") is meaningful within Team A's domain and opaque outside. Cross-domain review catches this where same-team review wouldn't.
- **Stories that need PRD context.** Sometimes the story is fine but assumes the reader has read the upstream PRD section. The fix is usually a Dev Notes addition pointing at the relevant PRD anchor — not a story rewrite.

---

## See also

- [Solo lab](solo.md)
- [Sync lab](sync.md)
- [Lesson 4 — CODEOWNERS and the gate](../lessons/4-codeowners-and-the-gate.md) — particularly the lead-review-checklist artifact this lab uses extensively.
- [Lesson 5 — Working as a team](../lessons/5-working-as-a-team.md) — Loops #2 and #3 are the relevant ones for issues this lab surfaces.
- [`training/lead-review-checklist.md`](../lead-review-checklist.md)
- [`training/story-template.md`](../story-template.md)
