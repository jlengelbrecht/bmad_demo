---
title: "Product Brief Distillate: bmad_demo"
type: llm-distillate
source: "product-brief-bmad_demo.md"
created: "2026-05-07"
purpose: "Token-efficient context for downstream PRD creation"
---

# Distillate — bmad_demo (BMAD Training Portal)

## Product identity (one-line)
- Self-referential, runnable BMAD Training Portal (Next.js + Express + SQLite, distributed via `git clone`) that teaches engineering teams how to adopt BMAD *as a team* and govern AI-assisted contributions using GitHub-native controls (CODEOWNERS, branch protection, lead-approval merge gate).
- Defining mechanic: lessons point trainees at *this* repo's own BMAD artifacts. The repo IS the curriculum.
- Wedge: team adoption + governance. NOT another BMAD reference manual; NOT an SDD tool; NOT a tool-specific tutorial.

## Audiences (3 — share the same repo)
- **Engineer/Team-Trainee** — anyone on a team working in a BMAD-enabled repo: engineers, PMs, designers, leads. Mixed coding skill, mixed AI-tool preferences. Time budget: ~3h self-paced or one half-day workshop. Entry: `training/00-start-here.md`.
- **Stakeholder** — eng/product leadership evaluating BMAD adoption. Time budget: 15 min. Entry: `training/stakeholder-demo-script.md`.
- **Facilitator** — eng leads running internal half-day workshops. Time budget: <2h prep. Entry: `training/facilitator-guide.md`.
- **Named POC**: one product team (currently zero BMAD experience) authorized to adopt the portal end-to-end as v1 validation.

## Curriculum scope (v1 ships everything together — no MVP cut)
- **6 lessons (~15 min each, self-paced markdown with embedded artifact tours):**
  1. What is BMAD
  2. The artifact chain
  3. Stories as tool-agnostic contract
  4. CODEOWNERS + lead-approval gate (incl. *what* the lead reads for at the gate)
  5. Working as a team — rituals, async checkpoints, mixed AI tooling
  6. Capstone — running the full cycle
- **3 labs:** solo / full-team (synchronous) / async-team. Each is the practice surface for Lesson 5's rituals.
- **Capstone (60–90 min):** trainee produces 1 product brief + 1 epic + 2 stories + 1 ADR — full BMAD planning cycle end-to-end.
- **Reinforcement artifact:** one-page team-rituals checklist trainees pin in their own repo post-capstone (defends against decay-after-training).

## Supported AI tools (in scope, mixed-tooling is first-class)
- Claude Code, GitHub Copilot, OpenAI Codex (CLI + ChatGPT agent), OpenCode.
- Per-tool friction notes sequestered in `training/tools-reference.md` so the main curriculum stays tool-agnostic.
- Tool notes carry a "verified against versions X" header, dated; quarterly review owner named at v1.

## Rejected ideas (do not re-propose)
- **Cursor, Aider, Continue, and other agents beyond the four** — explicitly out of scope; coverage is bounded to keep Lesson 5 (mixed-tool teams) tractable.
- **BMAD reference manual** — official BMAD docs cover this; portal is complementary, not competing.
- **Tool-specific tutorial** — BMAD is positioned as tool-agnostic via story-as-contract.
- **Hosted / SaaS / SSO / RBAC / audit-log SaaS** — local-only forever; the local-clone choice is *deliberate* (no procurement, no migration, no data leaves the org). Treat as a feature, not a deficiency.
- **Central training server / centralized facilitator team** — spread mechanism is fork-per-team, not centralized.
- **Smaller MVP cut (v1/v1.1 split)** — explicitly considered and rejected; splitting weakens the mixed-tooling demo for the POC.

## Technical context (already scaffolded)
- Stack: Next.js (`apps/web`) + Express (`services/api`) + SQLite for auth/lessons/progress.
- Repo layout: `apps/web`, `services/api`, `content/lessons` (lesson markdown), `_bmad`, `_bmad-output/planning-artifacts`, `infra/` (docker-compose), `training/`, `tests/e2e`, `.github/`.
- Distribution: `git clone && npm install && npm run dev` → `localhost:3000`. Node 20+, npm.
- Resilience choice: lesson markdown is plain-file accessible — readable directly when the portal app is broken.
- E2E tests live in `tests/e2e` — portal is treated as a real product with QA, not throwaway demo code.
- Trainee prerequisites: Node 20+, npm, GitHub account (for CODEOWNERS lab), one of the four supported AI tools installed.
- `.github/` is in scope: CODEOWNERS, PR template, branch protection notes are committed lesson artifacts.
- Planning artifacts at `_bmad-output/planning-artifacts/` serve double duty: curriculum reference *and* contracts the implementation follows.

## Governance thesis (load-bearing)
- GitHub-native machinery substitutes for uniformly distributed code expertise: CODEOWNERS routes review automatically; branch protection enforces required reviews; lead engineer is the final-say merge gate.
- **Honest claim**: the portal does NOT claim CODEOWNERS prevents drift on its own. It claims that *routing the right human to the gate, plus teaching that human what to look for*, prevents drift. Lesson 4 teaches the look-for. Lesson 5 teaches the rituals.
- This pattern is the answer to the recognized open SDD problem: **implementation faithfulness** (planning artifacts that look great but produced code drifts from spec intent).
- Story file = tool-agnostic contract. Heterogeneous teams stay coherent because all teammates produce/consume the same story shape regardless of which agent they use.

## Success metrics (per audience)
- **Trainee:** completes capstone AND opens a real PR with attached story file AND lead approves on first review without spec-vs-code corrections (faithfulness check, not just artifact check).
- **Stakeholder:** can articulate team-rituals + governance thesis back in own words after 15-min demo (portal-attributable). Stretch: greenlights pilot on a team within 30 days.
- **Facilitator:** runs half-day workshop with <2h prep using `training/facilitator-guide.md` as-is. Validation gate: at least one dry-run by a facilitator other than the builder before v1 ships.
- **POC validation plan (30/60/90 days):** (a) % merged PRs with linked story file, (b) lead reports CODEOWNERS catching ≥1 drift in 30 days, (c) ≥1 merged PR from a non-engineer, (d) actual capstone time vs. 60–90 min target. These are go/no-go inputs for v1.1.
- **Macro outcome:** more teams adopt BMAD org-wide; spec-driven AI development becomes team norm; AI contributions stop landing in `main` without team alignment.

## Spread mechanism — fork-per-team flywheel (committed)
- Each adopting team forks the portal, customizes CODEOWNERS and rituals, the fork becomes the next team's reference.
- No central training function gates throughput.
- Capstone PRs from POC team = visible momentum that triggers fork #2.
- Implication for PRD: the portal's customization surface (CODEOWNERS rules, ritual cadences, tool-reference notes) must be *easy to fork and edit* — markdown-first, no hard-coded org-specifics.

## Why now (timing evidence — preserve for PRD justification & Vision)
- Vibe-coding market: $4.7B in 2026; 41% of all code AI-generated; 63% of vibe coders are non-developers (State of Vibe Coding 2026).
- Adoption: 78% of global dev teams use AI assistants; 90% of Fortune 100 use Copilot; Claude Code in 60–70% of teams (mostly bottom-up, no formal rollout).
- Governance gap: only 9% of enterprises at "Ready" AI governance maturity (Deloitte 2025).
- Top-cover: April 2026 ACM TechBrief warns vibe coding skips core engineering practices for security/reliability/maintainability — gives eng leaders explicit budget justification for governance training.
- Tool-agnostic credibility: BMAD v6's cross-platform agent team release (April 2026) makes the mixed-tooling premise practical, not aspirational.
- Internal moment: POC team already authorized; org wants to get ahead of AI code challenges before practice ossifies.

## Competitive landscape (deep dive — keep for PRD differentiator section)
- **BMAD Method (official)** — open-source SDD framework, 46k+ stars, 5.4k forks; v6.6 cross-platform agent teams (Claude/Cursor/Codex). Has Udemy courses. **Gap:** targets individual practitioners; no opinionated team-governance layer; no runnable self-referential teaching artifact. Positioning rule: read as complementary, never competing.
- **GitHub Spec Kit** — GitHub-blessed SDD toolkit (v0.1.4, Feb 2026); spec/plan/task primitives; 30+ agents (Copilot, Claude Code, Gemini, Cursor, Windsurf). **Gap:** code drifts from spec in practice; no team-rituals or governance pattern; no training scaffolding. Don't compete on raw SDD tooling — losing fight.
- **AWS Kiro / Tessl / OpenSpec** — Kiro is a dedicated SDD IDE (multimodal, AWS-backed); Tessl pushes spec-as-source; OpenSpec is lightweight change-management for brownfield. **Gap:** tool-centric not team-centric; vendor lock-in breaks mixed-tooling premise; no governance-via-GitHub story.
- **Vibe-coding enterprise guides** (trick77, linesNcircles, Superblocks, Opsima) — markdown playbooks/SaaS marketing on the governance gap. **Gap:** read-only prose; no runnable repo, no exercises, no teach-by-cloning artifact; treat governance as policy memo not executable team ritual.
- **Vibe Coding Academy / Udemy BMAD courses / VibeKode conf** — paid videos, conferences. **Gap:** individual-skill framing; no GitHub-native governance content; passive video not hands-on repo-as-tutorial.

## User sentiment signals (from research — useful for PRD problem framing)
- "Implementation faithfulness" is the recognized open problem in SDD: planning artifacts look great, code drifts from intent.
- BMAD praised for predictability/rigor on greenfield + large features; criticized as overhead for teams <5 people or rapid small-feature work.
- "Comprehension debt" and "haunted codebases" from unreviewed AI contributions are spreading concerns.
- Enterprise buyers increasingly demand audit-survivable systems over working demos — "defensible system of record" is the new finish line.
- Engineers report AI tools entered teams via individual advocacy faster than governance could catch up; managers want a roll-out playbook, not just tool comparisons.

## Adjacent value (PRD-worthy expansions for Vision/Strategy)
- **Onboarding accelerator:** the same self-referential repo that teaches BMAD doubles as the canonical "how we ship" onboarding for new hires/transfers — turns one-time training into permanent ramp-up asset.
- **Audit / compliance trail:** CODEOWNERS + branch protection + story-as-contract incidentally produces a reviewable paper trail of who approved which AI-assisted change against which spec — solves an upcoming audit problem without naming it.
- **Reusable governance template for the *next* AI tool:** story-as-contract means new agents integrate via config, not curriculum rewrite — present-day insurance against tool churn.

## Strategic partnerships (internal — flag for PRD GTM/rollout section)
- **Internal security & compliance** — get auditable AI-contribution governance using GitHub-native controls; their sign-off unblocks regulated teams.
- **DevEx / platform engineering** — own the CODEOWNERS + branch-protection template as a paved-road / "BMAD-ready repo" self-service; multiplies reach without the portal team scaling.
- **Learning & Development** — slot the curriculum into existing eng onboarding/half-day workshops; the portal gets calendar real estate it can't staff itself.
- **Responsible-AI council / internal AI governance** — portal becomes the citable internal exemplar that answers "what does AI governance look like at the code layer?"

## Risks & mitigations (rated)
- **High** — Single-builder bus factor. Mitigation: recruit co-owner before v1 ships; markdown-first lessons so any teammate can edit.
- **High** — Scope ambition (~3–6 months for one builder). Mitigation: hold v1 scope (deliberate); offset with co-owner + acknowledged timeline up front.
- **Medium** — Self-reference versioning trap (lesson prose silently rots as artifacts evolve). Mitigation: lesson-to-artifact links as tested references in E2E; quarterly lesson sweep.
- **Medium** — CODEOWNERS gate concentrates load on lead engineer; under volume, leads rubber-stamp or bottleneck. Mitigation: Lesson 4 teaches gate-load distribution via multi-owner CODEOWNERS rules; surface failure mode explicitly.
- **Medium** — POC-to-team-#2 handoff. Mitigation: fork-per-team flywheel (committed).
- **Low** — Mixed-tool premise weakens for vendor-locked teams. Mitigation: Lesson 5 teaches story-as-contract abstraction so single-tool teams still benefit.
- **Low** — Positioning vs. official BMAD. Mitigation: explicit attribution and links throughout; never reposition BMAD itself.
- **Low** — Tool-vendor breaking changes. Mitigation: dated tool notes with "verified against versions X" header; quarterly review owner.

## Open questions (surfaced but unresolved — flag for PRD)
- Co-owner / second maintainer not yet identified — Risk #1 mitigation depends on this.
- Executive sponsor not named — "the org wants to get ahead" is currently abstract; if a specific leader/initiative anchors this, name it in the PRD.
- POC team profile is "zero BMAD experience" — a BMAD-savvy team adopting only the team-layer would be a different POC. Currently no plan for that variant; PRD should decide whether to support both profiles or commit to greenfield-first.
- Behavior-change reinforcement beyond the team-rituals checklist — does the PRD add spaced-repetition / 30-day check-ins / lead-led retros?
- Pre-rollout baseline measurement on the POC team (current % unreviewed AI merges, current artifact-drift incidents) is not yet captured — needed to *prove* the portal worked.
- Lead-bottleneck failure mode (lead PTO, lead leaves, lead overloaded) — Lesson 4 mentions multi-owner rules but no full backup-gate design.

## Scope signals — quick reference
- **In v1 (everything together):** 3 entry-point docs, 6 lessons, 3 labs, capstone, team-rituals checklist, tools-reference notes (4 tools, dated), CODEOWNERS + branch protection + PR template at `.github/`, working Next.js+Express+SQLite app, E2E tests.
- **Out:** non-named tools (Cursor/Aider/Continue/etc.), reference manual content, tool-specific tutorials, hosted/SaaS, SSO/RBAC, audit-log SaaS, central training server.
- **Deferred (post-v1, post-POC validation):** spread to team #2 mechanics beyond the fork pattern, advanced reinforcement loops, two-POC-profile support, lead-backup-gate design, baseline-measurement instrumentation if not added in v1.

## Quotable framings (preserve voice for PRD/PR copy)
- "Exercism for a methodology, not a syntax."
- "The repo IS the curriculum AND demonstrates the governance."
- "The lesson is teaching you the artifact, not just the lesson page."
- "No procurement, no migration, no data leaves the org."
- "The org's reference implementation of how we work with AI."
- "The org's effective contributor base expands without expanding risk."
- "CODEOWNERS routes the right human to the gate; the lesson teaches the human what to look for."
