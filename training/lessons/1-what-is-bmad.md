---
title: What is BMAD
---

# Lesson 1 — What is BMAD

> **Reading time:** ~15 minutes. **Audience:** anyone on a team — engineer, PM, designer, lead. No coding required.

## What you'll learn

By the end of this lesson you'll know:

- What BMAD is, who maintains it, and what problem it set out to solve.
- How BMAD differs from "prompting an AI to write code" — and why the difference matters.
- Why a team adopting BMAD needs more than just the framework, and what this curriculum adds on top.

This lesson is the conceptual foundation for everything that follows. It's deliberately light on procedure; the next five lessons get concrete.

---

## What BMAD is

**BMAD** stands for **Build More, Architect Dreams** on its public landing page, and **Breakthrough Method for Agile AI Driven Development** on its GitHub README. The two expansions describe the same project. In this curriculum we use "BMAD" as the name and "the BMAD framework" when we mean the codebase.

It is maintained by the [bmad-code-org](https://github.com/bmad-code-org/BMAD-METHOD) GitHub organization and is open-source under the MIT license. The canonical documentation lives at [bmadcode.com](https://bmadcode.com/) and the source at [github.com/bmad-code-org/BMAD-METHOD](https://github.com/bmad-code-org/BMAD-METHOD).

This portal targets the latest released BMAD; you can see the version your install picked up at `_bmad/_config/manifest.yaml`. The capstone bootstraps your repo against `npx bmad-method@latest`, so a trainee running the capstone today gets the same BMAD their team will run tomorrow.

### The bet BMAD makes

Most "AI coding assistants" optimize for a single moment: you type a prompt, the assistant writes code, you accept or reject. Helpful in isolation, but unreliable at team scale because each prompt starts from cold context. BMAD's bet, in its own words, is that **context engineering** — not prompt engineering — is what makes AI-assisted development reliable across a team.

In practice that means: instead of a sequence of prompts, BMAD facilitates a fixed, opinionated chain of artifacts. A **product brief** becomes the input to a **PRD**. The PRD becomes the input to an **architecture document**. The architecture and PRD together become the input to **epics and stories**. Each story file is detailed enough that an AI tool can implement it without re-discovering scope — and detailed enough that a human reviewer can compare the produced code against the spec without reading minds.

BMAD calls this an **artifact chain**, and Lesson 2 walks it end-to-end.

---

## What BMAD ships

You can see BMAD's structure for yourself by looking around this repo. The framework installs into two places when you run `npx bmad-method install`:

**1. The methodology source under `_bmad/`.** This is BMAD's directory tree of conventions, scripts, and config. Notable:

- `_bmad/_config/manifest.yaml` records which modules are installed and which BMAD version your install pulled in.
- `_bmad/bmm/` is the **BMM** (BMad Method) module — the four-phase pipeline `1-analysis` → `2-planning` → `3-solutioning` → `4-implementation`. Each phase produces specific artifacts (Lesson 2 has the full chain).
- `_bmad/scripts/resolve_customization.py` merges per-skill defaults with team and personal overrides. You'll see this script invoked at the start of every BMAD skill.
- `_bmad/bmm/config.yaml` carries the project-level settings — your name, the project name, the artifact output folder.

**2. The skills under `.claude/skills/bmad-*/`.** These are the workflows your AI tool runs. The installed set covers the full artifact chain — a few you'll meet during the capstone:

- `bmad-product-brief` — produces the brief.
- `bmad-create-prd` — produces the PRD.
- `bmad-create-architecture` — produces the architecture document.
- `bmad-create-epics-and-stories` — produces the epics and stories list.
- `bmad-create-story` — produces a single, exhaustive story file the dev agent can act on.
- `bmad-dev-story` — implements a story end-to-end.
- `bmad-code-review` — runs an adversarial review against the code.

You invoke any skill by typing its name as a slash-command in your AI tool: `/bmad-product-brief`, `/bmad-create-prd`, and so on.

### Named agents

BMAD also ships **agents** — personas your AI tool can adopt to lead a workflow. Each carries a name, an identity, and a curated menu of skills. The default set covers the canonical roles a team needs across the artifact chain — analyst, product manager, UX designer, system architect, software engineer, technical writer. The exact roster (and the personas' names) evolves with BMAD releases; check `npx bmad-method install --list-tools` or your installed `.claude/skills/bmad-agent-*/` directories for the current list.

You activate an agent the same way you invoke any skill: `/bmad-agent-pm` summons the product-manager agent, `/bmad-agent-architect` summons the architect, and so on. The agent then offers a numbered menu of the skills appropriate to its role.

You don't need to memorize the roster. You'll meet the relevant agents during the capstone, and the framework's own `bmad-help` skill will point you to the right one any time you're stuck.

---

## Why a team needs more than the framework

If BMAD-the-framework is so disciplined, what's left for this curriculum to teach?

The honest answer: BMAD ships the artifacts. It does not ship the **team rituals** that make the artifacts bind on the merged code. That gap is the load-bearing problem this curriculum addresses.

Concretely, BMAD does not specify:

- **Who reviews what.** A PRD is just a markdown file until someone is required to approve it. BMAD doesn't tell you to wire `CODEOWNERS` to your PRD path; that's a team decision.
- **What "the lead reads for" at the gate.** When a PR comes in claiming to implement a story, what specifically is the reviewer comparing? BMAD doesn't ship a checklist; this curriculum does (Lesson 4 produces one).
- **What to do when the contract bites.** When code drifts from a story, when two teammates' tools produce diverging conventions, when a story turns out to be too big — BMAD doesn't name the recovery procedure. This curriculum does (Lesson 5 names five recovery loops).
- **How mixed-tool teams stay coherent.** One engineer uses Claude Code, another uses Codex, a third uses GitHub Copilot. BMAD's artifacts are tool-agnostic — but only if the team treats them as the contract. The portal's capstone has you run the same artifact chain against all three tools to make this real, not theoretical.

In short: BMAD is **necessary** for spec-driven AI work. It is not **sufficient** for a team adopting that pattern. The team needs the rituals on top — CODEOWNERS as the enforcement layer, branch protection as the gate, the dual-role [`AGENTS.md`](/source/AGENTS.md) + [`.github/copilot-instructions.md`](/source/.github/copilot-instructions.md) pattern, the named recovery loops. That's what this curriculum is.

---

## Where BMAD ends and this portal begins

BMAD is the framework. This portal is the **training ground** for the team layer on top.

A few specific extensions you'll encounter:

- **The capstone is a guided BMAD run** — but it's also a deliberate proof that the artifact chain is tool-agnostic. You'll pick your AI tool (Claude Code, Codex, or GitHub Copilot) and walk the same chain. The artifacts you produce are identical in shape; only the tool's terminal output differs. This is a load-bearing demonstration, not a stylistic flourish — Lesson 5 returns to it.
- **The lead-review checklist** ([`training/lead-review-checklist.md`](/source/training/lead-review-checklist.md), produced by Lesson 4) is *not* a BMAD artifact. It's a team-side artifact this curriculum produces — designed so your team's lead can pin it in your repo on Day 2 and use it on real PRs.
- **The team-rituals checklist** ([`training/team-rituals-checklist.md`](/source/training/team-rituals-checklist.md), produced by Lesson 5) names the five recovery loops as a one-page reference. Same pattern: a team-layer artifact pinnable in any repo.

When you finish the capstone you'll get a `HANDOFF.md` in your bootstrapped repo with explicit Day-2 instructions: how to push to your team's GitHub org, which CODEOWNERS placeholders to replace, what branch protection to apply. The curriculum is over at handoff; the team's actual work begins there.

---

## A note on attribution

The framework — agents, skills, artifact chain, slash-commands — is the work of the bmad-code-org maintainers, used here under its open-source license. This portal teaches the team-rituals layer that sits on top. We've kept attribution explicit because (a) it's owed and (b) trainees should know where to go for framework-level questions: the official documentation at [bmadcode.com](https://bmadcode.com/) and the source repository at [github.com/bmad-code-org/BMAD-METHOD](https://github.com/bmad-code-org/BMAD-METHOD).

If a question is about how a skill works internally — what `bmad-create-prd` does step by step, why `bmad-dev-story` halts on red tests — go to BMAD's docs. If a question is about how a *team* uses BMAD without their leads going crazy at PR time — that's what this curriculum is for.

---

## What's next

**Lesson 1.5** — *The BMAD ecosystem and installer* — covers what BMAD ships beyond the framework itself: the additional modules (BMad Builder, Test Architect, Game Dev Studio, Creative Intelligence Suite), the ~42 AI tools BMAD knows how to wire, and what the installer's interactive prompts actually mean. Worth reading before the capstone so you can answer the prompts deliberately when you bring BMAD home to your team.

**Lesson 2** walks the BMAD artifact chain — brief → PRD → architecture → epics → stories → PR — using *this repo's own* planning artifacts as the worked example. By the end you'll have read every artifact BMAD produces, and you'll see how each one constrains the next.

If you want a preview, open the [product brief](/source/_bmad-output/planning-artifacts/product-brief-bmad_demo.md), [PRD](/source/_bmad-output/planning-artifacts/prd.md), [architecture](/source/_bmad-output/planning-artifacts/architecture.md), and [epics](/source/_bmad-output/planning-artifacts/epics.md) for *this portal*. They're right there — produced through BMAD, the same way the capstone will have you produce them.
