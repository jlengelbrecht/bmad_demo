---
title: Stakeholder — 15-minute Demo
---

# Stakeholder — 15-minute Demo

> **Audience.** A stakeholder, leader, or executive who wants to understand BMAD-on-a-team well enough to decide whether their org should pilot it. **Time:** 15 minutes. **Format:** scripted walk-through, three real artifacts, three objections answered.

This is a script, not a deck. It works whether you're the one walking a stakeholder through it, or the stakeholder reading it on their own.

The three artifacts are real — they live in this repo. The three objections are the ones every leader raises in the first minute. The script's pacing target: **~3 minutes per artifact + 6 minutes on objections = 15 minutes total.**

---

## Setup (30 seconds before you start)

Open these three tabs:

1. A real story file: [`_bmad-output/implementation-artifacts/3-3-mark-complete-ui.md`](../_bmad-output/implementation-artifacts/3-3-mark-complete-ui.md)
2. A live `CODEOWNERS` example (the one in this repo at `.github/CODEOWNERS` is the realistic shape; you can show any production team's CODEOWNERS file you have access to)
3. A merged PR with a story-link in the description (any production PR works — the demo point is the *pattern*, not the specific PR)

The three artifacts together land the **contract → enforcement → propagation** triangle that the rest of the script makes explicit.

---

## Artifact #1 — The story file (3 minutes)

**Open:** [`_bmad-output/implementation-artifacts/3-3-mark-complete-ui.md`](../_bmad-output/implementation-artifacts/3-3-mark-complete-ui.md).

**Say:** "This is the unit of work in BMAD. It's a markdown file in the repo. It has a user story, six numbered acceptance criteria in Given/When/Then form, dev notes lifted from the architecture, and a tasks/subtasks checklist. The implementer used an AI tool to produce the code that ships against this file. The reviewer compared the produced code against this file at the gate. **The file is the contract.**"

**Land the point:** "Without this file, code review of AI-generated work degenerates into 'does this look right?' With this file, review is 'does the diff implement these six acceptance criteria, nothing more?' That changes review from a vibe check to a repeatable practice."

**The why this matters for stakeholders:** spec-driven development is not new. What's new is the AI tooling that makes the spec actually load-bearing — because an AI tool can't 'feel' the team's conventions, but it can read this file. Stories become more important, not less, in AI-assisted teams.

---

## Artifact #2 — The CODEOWNERS file (3 minutes)

**Open:** the CODEOWNERS file you set up.

**Say:** "This is GitHub's native enforcement layer. It maps file paths to teams. When a PR touches a file pattern, GitHub auto-requests review from the named team. Combined with branch protection, the named team's approval becomes *required* before merge. There is no separate tool, no SaaS subscription, no new platform — this is GitHub's built-in feature, available on every plan."

**Land the point:** "The story file is the contract. CODEOWNERS is what makes the contract enforceable. Without CODEOWNERS + branch protection, the story is a social agreement; with them, it's the gate."

**The why this matters for stakeholders:** governance via existing infrastructure. Adopting BMAD does not require new procurement, new vendor relationships, or new auth surfaces. It requires CODEOWNERS files and branch protection settings — both of which most teams already use partially. The curriculum's job is to teach the team how to wire them together correctly.

---

## Artifact #3 — A merged PR with a story link (3 minutes)

**Open:** the merged PR you set up.

**Say:** "This is what the artifacts produce in practice. The PR description links the story file. The reviewer's job at the gate is concrete: read the story, read the diff, confirm they match. The lead-review checklist in this curriculum [`training/lead-review-checklist.md`](lead-review-checklist.md) makes the review a six-item walk: spec faithfulness, scope-fit, tests cover the change, story-file unchanged, CODEOWNERS routing sane, governance changes flagged."

**Land the point:** "AI-assisted contributions don't ship unreviewed. They ship through the same gate they always did — the story link makes the gate enforceable instead of ceremonial."

**The why this matters for stakeholders:** **demonstrable governance.** A regulator, an auditor, or an internal review can walk the chain — story → code → PR → review → merge — with all four artifacts on disk. There's no opaque "the AI did it" hand-wave; there's a paper trail.

---

## The three objections (6 minutes)

These are the objections every stakeholder raises in the first minute. Answer them up front; their absence costs the conversation.

### Objection 1 — "What's the procurement story?" (~2 min)

**The concern:** new SaaS purchases, new vendor security reviews, new contract negotiations.

**The answer:** *No new procurement.* BMAD is open-source under the MIT license; this curriculum runs locally. The portal you're looking at is a Next.js app you clone and run on your dev box — no SaaS, no remote service, no vendor onboarding. Your AI tool of choice (Claude Code, Codex, GitHub Copilot) is whatever you've already procured; BMAD doesn't replace it. It uses it.

**The follow-up:** "Then what's the cost?" — the curriculum's authoring time + your team's training time. The portal install is `npx bmad-method install`; the curriculum is `npm run dev`. There's no recurring license fee.

### Objection 2 — "What about SSO / RBAC / data residency?" (~2 min)

**The concern:** corporate identity boundaries, audit logs, data leaving the org.

**The answer:** *No auth surface, no egress.* The portal has zero login screens. The local user is trusted (this is by design — the portal runs on your dev box, you authenticated to your dev box, that's the trust boundary). The portal makes zero outbound network calls; every model call goes through your AI tool's process under your tool's auth, on your machine. Your code, your stories, your PRs — they all stay within your existing GitHub/SSO perimeter. The portal's contribution is curriculum, not an additional data flow.

**The follow-up:** "What about the AI tool itself?" — the AI tool's data flow is whatever your existing procurement of that tool already governs. BMAD doesn't add a new vendor here; it uses the one you've already evaluated.

### Objection 3 — "Vendor lock-in?" (~2 min)

**The concern:** committing your team to one AI tool and being unable to switch.

**The answer:** *BMAD is tool-agnostic by design.* The artifact chain is plain markdown. The story files don't reference any specific AI tool's syntax. The capstone in this curriculum has trainees pick one of three tools (Claude Code, Codex, GitHub Copilot) and produce identical artifacts. Your team can switch tools — or use multiple tools simultaneously — without changing the chain. The contract holds across the change.

**The follow-up:** "What if BMAD itself gets abandoned?" — the curriculum is just markdown files in a Git repo. The CODEOWNERS pattern is GitHub-native and predates BMAD by years. The story-as-contract pattern is older still. Worst case, you keep the artifacts and discard the BMAD framework code; you've lost nothing.

---

## The take-away

If the stakeholder takes only one thing away, it should be the **contract → enforcement → propagation** triangle:

1. **Contract** — the story file, in the repo, plain markdown.
2. **Enforcement** — CODEOWNERS + branch protection, GitHub-native, no new tooling.
3. **Propagation** — same artifacts, any AI tool, any teammate.

Everything else in this curriculum is teaching the team to internalize that triangle.

---

## Where to go after this

- If you're sold on a pilot: route someone to [`/start-here`](/start-here) and have them complete the curriculum + capstone (~3 hours). Then the team runs one of the labs to share the muscle memory.
- If you want a deeper architecture/governance dive before piloting: [`_bmad-output/planning-artifacts/architecture.md`](../_bmad-output/planning-artifacts/architecture.md) is the design doc behind this portal — including the no-egress threat model, the dual-role context-file pattern, and the paired-CI invariant.
- If you want to read the original framing: [`_bmad-output/planning-artifacts/product-brief-bmad_demo.md`](../_bmad-output/planning-artifacts/product-brief-bmad_demo.md) is the brief that motivated this work.
