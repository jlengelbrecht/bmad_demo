---
title: Trainee — Start Here
---

# Trainee — Start Here

> **Reading time:** 5 minutes (this page). **Total curriculum:** ~3 hours self-paced, or one half-day workshop.

Welcome. By the end of this curriculum you'll be able to lead your team in adopting **BMAD** — a framework for spec-driven AI-assisted development — and you'll have the team-rituals and governance controls in hand to keep AI-generated work from shipping unreviewed.

This page is your map. The work itself is in the lessons, labs, and capstone linked below.

---

## Who this is for

Anyone on a team that's adopting (or thinking about adopting) AI coding assistants. Specifically:

- **Engineers** of any seniority, using any AI tool — Claude Code, Codex, GitHub Copilot, OpenCode, or whichever comes next.
- **Product managers, designers, and tech leads** who'll set context for the team's adoption — even if they don't write code themselves.
- **Mixed-experience teams** where some teammates are deep in AI tooling and others are new to it.

The curriculum is **coding-skill-neutral.** The conceptual material does not assume you write code; the labs and capstone do but only at the level of running an AI tool through a guided workflow.

---

## What you'll learn

By the end:

1. **What BMAD is** — and what it doesn't ship that a team needs to add (Lesson 1).
2. **The artifact chain BMAD produces** — brief → PRD → architecture → epics → stories → PR — walked through this repo's own planning artifacts (Lesson 2).
3. **The story-as-contract pattern** that lets mixed-tool teams ship coherently — and the canonical story template you'll use (Lesson 3).
4. **CODEOWNERS and branch protection** as the *enforcement* layer for the contract — and a pinnable lead-review checklist for your team's repo (Lesson 4).
5. **Five named recovery loops** for the moments when the contract bites — and a pinnable team-rituals checklist (Lesson 5).
6. **The capstone** — a 90–120 min run where you experience BMAD on a real artifact chain through your own AI tool (Lesson 7 frames it; the capstone is the practice).

After the capstone, your team has a working BMAD repo, a HANDOFF.md with Day-2 instructions, and the muscle memory to run the chain natively.

---

## Shape of the training

| Component | Time | Format |
|---|---|---|
| 7 in-app lessons | ~15 min each | Self-paced reading with links to this repo's own artifacts |
| 3 labs (post-capstone) | 60–90 min each | [Solo](/labs/solo) / [Sync (full team)](/labs/sync) / [Async cross-team](/labs/async-story-review) |
| 1 capstone | 90–120 min | The synthesis exercise — run the artifact chain on a fresh repo |

Total: ~3 hours self-paced, or one half-day workshop. The labs are optional but high-leverage; pick the format that fits your team's situation.

---

## How to navigate

Lessons are sequential — each builds on the prior. Don't skip Lesson 4 thinking it's a governance side-note; it's where the contract becomes enforceable.

The capstone is a single sustained run. Do it after the lessons, in one sitting. The portal saves your state if you have to step away.

The labs are post-capstone. Pick them based on your team's situation:

- **Solo lab** — you, a real feature, your team's actual review gate. The strongest test of "does this work outside training?"
- **Sync lab** — full team in one room, 90 minutes, role-played roles. The shared-muscle-memory builder.
- **Async cross-team lab** — two teams, no live pairing, story-only handoff. The strongest validation of the contract.

---

## A note on infrastructure

The portal makes **zero cloud calls of its own.** Everything renders locally; every model call goes through your AI tool's process under your tool's auth. There's no signup, no account, no telemetry, no remote service. The local user is trusted; the gate that protects shared work is `CODEOWNERS`, taught in Lesson 4.

---

## Audience-specific entry points

If you're not primarily here as a trainee:

- **Stakeholder** (you want a 15-minute walk through what BMAD does and what it costs your org) — see the [Stakeholder demo script](/stakeholder).
- **Facilitator** (you'll run a workshop with your team) — see the [Facilitator workshop guide](/facilitator).

Otherwise, when you're ready:

**[Begin Lesson 1 — What is BMAD →](/lessons/1-what-is-bmad)**
