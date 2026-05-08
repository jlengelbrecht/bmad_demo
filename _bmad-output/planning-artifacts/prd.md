---
stepsCompleted:
  - step-01-init
  - step-02-discovery
  - step-02b-vision
  - step-02c-executive-summary
  - step-03-success
  - step-04-journeys
  - step-05-domain
  - step-06-innovation
  - step-07-project-type
  - step-08-scoping
  - step-09-functional
  - step-10-nonfunctional
  - step-11-polish
  - step-12-complete
releaseMode: phased
inputDocuments:
  - _bmad-output/planning-artifacts/product-brief-bmad_demo.md
documentCounts:
  briefs: 1
  research: 0
  brainstorming: 0
  projectDocs: 0
classification:
  projectType: web_app
  projectTypeSecondary: developer_tool
  domain: edtech
  domainNotes: technical/professional learners, adult audience, no COPPA/FERPA
  complexity: medium
  projectContext: greenfield
workflowType: 'prd'
---

# Product Requirements Document - bmad_demo

**Author:** Devbox
**Date:** 2026-05-07

## Executive Summary

`bmad_demo` is a runnable, self-referential **BMAD Training Portal** — a Next.js + SQLite application (Next.js handles routing, lesson rendering, and the progress-state API in one process) distributed as a clonable Git repository — that teaches engineering teams how to adopt BMAD *as a team* and govern AI-assisted contributions using GitHub-native controls (CODEOWNERS, branch protection, required reviews, lead-approval merge gates). No new platform to procure, no migration, no data leaves the org.

**The problem.** 78% of dev teams use AI assistants; only 9% of enterprises rate "Ready" on AI governance maturity (Deloitte 2025). AI-generated code lands in `main` without team alignment; specs and stories drift; mixed-tool teams have no shared protocol; non-engineering contributors are excluded from AI-assisted work because no governance pattern lets them participate safely. Official BMAD curriculum and SDD tooling teach the framework and the artifacts — neither prescribes how a real team adopts the rituals or gates the merge. The cost is **implementation faithfulness**: beautiful planning artifacts whose produced code drifts from spec intent because no human gate catches it.

**The product.** A complete BMAD repository that teaches itself. A trainee runs `git clone && npm run dev`, lands at `localhost:3000`, and walks through six lessons (~15 min each), three hands-on labs (solo / full-team / async cross-team story-review), and a 60–90 minute capstone where they run a full BMAD planning cycle end-to-end and ship a real PR through the lead-approval gate. Three audience paths share one repo: **Engineer/Team-Trainee** (~3h or one half-day workshop), **Stakeholder** (15-min demo), **Facilitator** (workshop guide).

**Audience and POC.** v1 is validated by a committed internal POC — one product team authorized to adopt the portal as their first BMAD rollout. Trainees are mixed-skill, mixed-AI-tool: engineers, PMs, designers, leads, under one curriculum. Role differentiation lives in CODEOWNERS, not in separate curriculum tracks.

### What Makes This Special

**Headline — Story-as-tool-agnostic-contract.** A BMAD story is a self-contained brief any teammate (or any AI agent) can implement without losing context. This is what lets a mixed Claude Code / Copilot / Codex / OpenCode team ship AI-assisted code coherently. **CODEOWNERS and the lead-approval merge gate are the enforcement layer** that makes the contract bite — routing the right human to the gate and teaching them what to look for is what prevents drift.

**Propagation — Self-reference as pedagogy.** The lessons inside the portal point trainees at *this* repo's own BMAD artifacts as the lesson material. Trainees experience a complete BMAD repository from inside a guided tour of itself. *Exercism for a methodology, not a syntax.* This is also how the training scales: every adopting team **forks the portal**, tailors CODEOWNERS and rituals to their context, and that fork becomes the next team's reference — internal organic spread without a central training function gating throughput.

**Why this wins:**

- **Team adoption + governance is the unowned wedge.** Official BMAD covers the framework; GitHub Spec Kit covers spec/plan/task primitives. Nobody owns the team-layer playbook — exactly where AI contributions go off the rails.
- **GitHub-native, zero new tooling.** No procurement, no SSO/RBAC, no migration, no data egress. Every objection that kills training initiatives is pre-answered.
- **Mixed-tooling is a first-class lesson, not a footnote.** Story-as-contract makes a heterogeneous team coherent.
- **Anyone-on-the-team is in scope.** The same governance that protects the codebase also lets PMs, designers, and less-code-savvy contributors participate safely.

**The transformation moment.** The marquee aha is the capstone — when a trainee ships a real PR through the lead-approval gate and the whole system clicks. Earlier "open `.github/CODEOWNERS`" beats are primers that build curiosity; the system lands when they're shipping under the gate themselves.

## Project Classification

| Field | Value |
|---|---|
| Project Type | `web_app` (primary) with `developer_tool` overlay (clonable reference repo, fork-per-team spread) |
| Domain | `edtech` — technical/professional learners; adult audience; no COPPA/FERPA stack required |
| Complexity | Medium — low domain/regulatory burden; medium delivery complexity (v1 ships full curriculum + app + E2E + tool notes together; flagged as a known scope risk) |
| Project Context | Greenfield — application code does not yet exist; only the BMAD scaffolding (`_bmad/`, `_bmad-output/`) and `training/` discovery notes are in the repo today |

## Success Criteria

### User Success

Per audience, one concrete signal:

- **Engineer/Team-Trainee succeeds when** they complete the capstone *and* open a real PR — in this repo or their team's — with a linked story file, and the lead approves it on first review without spec-vs-code corrections.[^faithfulness]
- **Stakeholder succeeds when** they can articulate the team-rituals + governance thesis back in their own words after the 15-minute demo. **Stretch:** they greenlight a BMAD pilot on at least one team within 30 days of the demo.
- **Facilitator succeeds when** they run a half-day team workshop with under two hours of prep, using `training/facilitator-guide.md` as-is — validated by **at least one dry-run with a facilitator other than the builder** before v1 ships.

[^faithfulness]: "Without spec-vs-code corrections" is the *implementation faithfulness* check — stylistic or refinement comments don't count against the bar; what counts is whether the produced code drifts from the story spec.

### Business Success

The portal is a wedge for org-wide BMAD adoption, so business success is measured by adoption velocity, not portal-internal metrics:

- **POC validation (30/60/90 days after POC team starts):** these are the **go/no-go inputs for v1.1**.
  - **% of behavior-changing merged PRs with a linked story file** — target: **≥80% by day 60**. The denominator is behavior-changing PRs only — dependency bumps, typo fixes, and formatting-only PRs are excluded so the signal is not diluted by mechanical changes that wouldn't carry a story regardless of practice. *Connects directly to story-as-contract; this is the single most diagnostic metric.*
  - **CODEOWNERS catches ≥1 drift in the first 30 days**, reported by the lead. *The enforcement layer earning its keep.*
  - **≥1 merged PR from a non-engineer** by day 60. *The "anyone-on-the-team is in scope" claim, validated.*
  - **Capstone completion time** — ≥80% of POC trainees finish within the 60–90 min target band.
- **Org-wide spread (6–12 months post-v1):** **at least 3 additional teams** beyond the POC have forked the portal and started adoption. Sized to the current org; "wedge is working organically" without being a stretch target.

### Technical Success

The portal is treated as a real product, not throwaway demo code:

- **Cold-clone-to-running-app under 5 minutes** on a clean dev machine: `git clone && npm install && npm run dev` → trainee at `localhost:3000` viewing Lesson 1 with no manual config.
- **E2E tests cover the trainee golden path** (boot → land at start-here → navigate all six lessons → run a lab → start capstone) **and the lesson-to-artifact references**, so silently-rotting links break CI (lifts Risk #3 mitigation into success criteria).
- **Cross-platform install verified** on **macOS, Linux, and Windows via WSL2**. Native Windows shell on a Node monorepo is a maintenance trap and is explicitly out.
- **Zero data egress** confirmed: no telemetry, no remote fetches at runtime beyond what trainees explicitly invoke.

### Measurable Outcomes

| Outcome | Measure | Target |
|---|---|---|
| Trainee faithfulness | Capstone PR approved on first review without spec-vs-code corrections | ≥1 in POC |
| Stakeholder thesis recall | Articulates team-rituals + governance thesis after demo | Pass/fail per stakeholder |
| Facilitator self-sufficiency | Half-day workshop, <2h prep, by non-builder facilitator | ≥1 dry-run before v1 ships |
| Story-as-contract uptake | % of behavior-changing merged PRs with linked story file | ≥80% by day 60 |
| Enforcement layer working | CODEOWNERS catches drift | ≥1 caught drift in 30 days |
| Inclusive contribution | Merged PR from a non-engineer | ≥1 by day 60 |
| Capstone fits the band | Capstone completion time | ≥80% finish in 60–90 min |
| Spread mechanism working | Additional teams forking + starting adoption | ≥3 teams in 6–12 months post-v1 |
| Install friction | Cold clone to running portal | <5 min on clean machine |

## Product Scope

The brief is explicit: **v1 ships everything together** (deliberate — splitting weakens the mixed-tooling demo for the POC). MVP is therefore the v1 ship; scope tiers below describe *what's MVP within v1*, *what's growth (v1.1+)*, and *what's vision*.

### MVP — Minimum Viable Product (v1, all together)

- **Three audience entry points:** `training/00-start-here.md`, `training/stakeholder-demo-script.md`, `training/facilitator-guide.md`
- **Six lessons:** (1) What is BMAD, (2) The artifact chain, (3) Stories as tool-agnostic contract, (4) CODEOWNERS + lead-approval gate (including *what* the lead reads for at the gate), (5) Working as a team — rituals, async checkpoints, mixed AI tooling, (6) Capstone — running the full cycle
- **Three labs:** solo, full-team (synchronous), and **async cross-team story-review** (a team reviews and signs off on a story file *without* implementing it — preserves the async-checkpoint muscle, no admin feature surface required)
- **All curriculum content is plain markdown committed to the repo** — no admin UI, no curriculum-management surface. The portal renders content; it does not let trainees or facilitators edit curriculum through the app.
- **Capstone (60–90 min):** trainee produces 1 product brief + 1 epic + 2 stories + 1 architecture decision record, end-to-end through BMAD
- **One-page team-rituals checklist** for trainees to pin in their own repo as post-capstone reinforcement
- **Per-tool friction notes** for Claude Code, GitHub Copilot, OpenAI Codex (CLI + ChatGPT agent), OpenCode — sequestered in `training/tools-reference.md`, dated and version-headered ("verified against versions X")
- **Named curriculum maintainer** (default: repo creator) called out in `README.md`. Owns the quarterly tool-notes and lesson-sweep cadence for v1. Succession formalization is v1.1 growth scope.
- **Reusable PR-review checklist artifact** produced from Lesson 4 — `training/lead-review-checklist.md`, pinnable by leads in their team's repo. Lesson 4 narrative references this artifact as the concrete output, not just inline prose.
- **Working `.github/`:** CODEOWNERS, branch protection notes, PR template (with explicit story-link field)
- **Local-only distribution:** `git clone && npm install && npm run dev`
- **`npm run reset-progress`** script — clears trainee SQLite progress state; echoes the path it deleted so the "everything is a file" lesson stays visible. Preferred over `git clean` so trainees don't need to learn destructive Git as the reset path.
- **E2E tests** covering trainee golden path + lesson-to-artifact reference checks
- **Install verified on macOS, Linux, and Windows via WSL2** before v1 ships

### Growth Features (Post-MVP — v1.1+)

Scope here is gated by POC 30/60/90 results. Likely v1.1 candidates:

- **Multi-owner CODEOWNERS patterns** as a Lesson 4 expansion (Risk #4 mitigation: gate-load distribution)
- **Maintainer succession plan** — formalizes how the curriculum-maintainer role transfers off the repo creator. (v1 names the maintainer; v1.1 documents handoff.)
- **WCAG AAA accommodations where feasible** — incremental upgrades on top of v1's AA bar
- **Lesson-to-artifact lint** as a stronger CI step beyond E2E
- **Capstone variants** for narrower contexts (e.g., a 30-min capstone for stakeholders who want to *try* BMAD, not just see it demoed)
- **Co-owner onboarding doc** (Risk #1 mitigation: bus-factor reduction)

### Vision (Future)

- The portal evolves from "introduction" into the **org's canonical reference implementation of how we work with AI** — the artifact a new team forks when starting a new repo
- **Fork-per-team flywheel at scale** — each adopting team's fork becomes the next team's reference; new tools plug in by satisfying the story-as-contract (a config change, not a curriculum rewrite)
- The portal is what the **Responsible-AI council points at** when asked what governance looks like at the code layer
- A PM or designer can ship a small change under AI assistance with the same confidence as a senior engineer; the **effective contributor base expands without expanding risk**

## User Journeys

### Journey 1 — Engineer-Trainee, happy path through the capstone

**Persona — Mira, senior backend engineer.** Her team just got authorized as the BMAD POC. She uses Claude Code; her teammate Jordan uses Copilot. They've been bumping heads on conflicting AI-suggested patterns — different conventions, different abstraction styles. Each PR review feels like a tooling argument.

**Opening:** Friday afternoon. Mira clones the portal: `git clone && npm run dev`. She lands at `localhost:3000` and opens `training/00-start-here.md`.

**Rising action:** Lessons 1–2 are framework refresher. Lesson 3 — *Stories as tool-agnostic contract* — lands hard. She sees that if she and Jordan had agreed on a story file as the *contract*, the tooling differences wouldn't matter. Lesson 4 makes CODEOWNERS legible as the *enforcement layer*, not just a routing convention; it explicitly teaches *what the lead reads for at the gate*. Lesson 5's mixed-tooling lab is the moment she stops thinking about Claude vs. Copilot as the problem.

**Climax:** Saturday morning, capstone. She drafts a real story for a feature she's been wanting to add to her team's repo: 1 brief + 1 epic + 2 stories + 1 ADR. She uses Claude Code to implement story #1, Jordan picks up story #2 in Copilot. The PR goes up Sunday. **Lead approves on first review without spec-vs-code corrections.**

**Resolution:** Mira pins the one-page team-rituals checklist in her team's repo. Monday standup: the team has a shared vocabulary. *Story* means something specific now.

**Capabilities revealed:** trainee entry point with progressive disclosure; in-portal lesson navigation with progress state; lesson prose that links to specific artifacts elsewhere in the repo and back; live `.github/CODEOWNERS` referenced as a lesson artifact; PR template with explicit story-link field; capstone harness that produces real BMAD artifacts; the one-page checklist as an exportable, pinnable file.

### Journey 2 — Non-Engineer Trainee: the inclusivity claim under stress

**Persona — Priya, PM on Mira's team.** She's adjacent to AI-coding but has never landed a code change. She wants to ship a small UI copy fix without bothering an engineer for it.

**Opening:** Priya enters via the same `00-start-here.md`. The framing makes clear *"this curriculum is for anyone on the team."* She doesn't have to ask permission to be here.

**Rising action:** Lessons 1–3 are abstract but legible. **Lesson 4 — CODEOWNERS — is her unlock.** She realizes the gate is *what makes it safe for her to participate*: she can't accidentally ship something off-spec because the lead reviews against the story she wrote, not against her code skill. Lesson 5's async cross-team story-review lab models the exact ritual she'd use — review-and-sign-off without having to implement.

**Climax:** Capstone. She writes a story for the copy fix. She uses Claude Code to draft the change. **Lead approves on first review** — because the story is unambiguous, the lead doesn't need to verify Priya's code separately; they verify against the spec.

**Resolution:** Priya's PR merges. The "≥1 merged PR from a non-engineer" success metric earns its first data point. She knows she can do this again.

**Capabilities revealed:** the curriculum reads neutrally about coding skill (no "as an engineer..." framing); lessons 4 and 5 explicitly address the gate-as-safety-net for less-code-savvy contributors; capstone supports stories of varying technical depth; PR template includes a story-link field.

### Journey 3 — Stakeholder: 15-minute demo to greenlight a pilot

**Persona — Marcus, VP Engineering, peer org.** His Responsible-AI council asked him last week *"what does AI governance look like at the code layer?"* He has slide decks. He has nothing concrete to point at.

**Opening:** Mira's team lead emails Marcus the repo. Marcus opens `training/stakeholder-demo-script.md`. It's a 15-minute scripted walk.

**Rising action:** The script takes him through three artifacts in sequence — a story file, the live `.github/CODEOWNERS`, and a recent merged PR with a story attached via the PR template's story-link field. He sees the **contract → enforcement → propagation** triangle without having to read six lessons. The script anticipates his three likely objections (procurement, SSO, vendor lock-in) and points him at the local-only, GitHub-native answers.

**Climax:** He closes the laptop and can articulate it back: *"Stories are the contract, CODEOWNERS routes review, the lead is the gate."* That's the success metric, validated.

**Resolution:** Within 30 days, he greenlights a pilot on Team B. He forwards the repo to two peer VPs.

**Capabilities revealed:** dedicated 15-minute stakeholder entry point that does not require lesson sequencing; demo script with explicit objection-handling sections; demo can be self-served (no live facilitator required); demo references the same live `.github/` artifacts and PR template the trainee curriculum points at.

### Journey 4 — Facilitator: half-day workshop with under two hours of prep

**Persona — Lena, engineering lead.** Her director told her Wednesday that she's running a half-day BMAD workshop for her team *next Tuesday*. She's got Friday afternoon to prep.

**Opening:** Lena opens `training/facilitator-guide.md`. It's structured around the same six lessons + three labs + capstone, with **facilitator-specific prompts, timing guidance, common-questions sections, and links to the exact artifacts she'll be pointing the team at.**

**Rising action:** She walks through the guide once Friday afternoon, makes a few notes, picks one of the three labs (full-team synchronous) for her workshop format. She doesn't have to invent. Total prep: ~90 minutes. She uses the in-portal lesson navigation to dry-run the trainee path so she knows what her team will see.

**Climax:** Tuesday morning. The workshop runs. Her team makes it through to the capstone. One engineer who came in skeptical says *"OK, this is how we should be working."* That comment outweighs any slide deck she could have built.

**Resolution:** The facilitator guide stays in her team's fork. The workshop is now a thing her team refers back to. **Validation point: this dry-run gets logged as the "non-builder facilitator" success criterion.**

**Capabilities revealed:** dedicated facilitator entry point with prompts and timing; lab-format selection (the three labs are alternative facilitation formats — solo / sync / async-story-review); facilitator guide is plain markdown so the facilitator can fork-and-modify per session.

### Journey Requirements Summary

The four journeys above produce the following capability set the portal must deliver in v1:

| Capability | Journeys |
|---|---|
| Three differentiated audience entry points | 1, 2, 3, 4 |
| In-portal lesson navigation with sequential progression | 1, 2, 4 |
| Lesson prose that links out to specific repo artifacts (and back) | 1, 2, 4 |
| Live, real `.github/CODEOWNERS` referenced *as* a lesson artifact | 1, 2, 3 |
| Capstone harness producing 1 brief + 1 epic + 2 stories + 1 ADR | 1, 2 |
| Tool-agnostic story file format (referenced by Lessons 3, 5; produced in capstone) | 1, 2 |
| Three labs as alternative facilitation formats (solo / sync / async-story-review) | 1, 4 |
| Stakeholder demo: self-serve, scripted, with built-in objection handling | 3 |
| Facilitator guide: prompts, timing, common-questions sections, lab selection | 4 |
| One-page team-rituals checklist as exportable pinnable artifact | 1, 2 |
| Per-tool friction notes (Claude Code / Copilot / Codex / OpenCode), version-headered | 1, 2 |
| PR template with explicit story-link field | 1, 2, 3 |
| Curriculum framing is coding-skill-neutral throughout | 2 |

## Domain-Specific Requirements

The portal sits in the **edtech** domain with one critical narrowing: trainees are **adult professionals**, not minors, and the product is **local-only**. The COPPA/FERPA/age-verification/student-privacy stack that defines most edtech compliance work is **out of scope by design**. What remains domain-specific are accessibility, pedagogical correctness, and content-freshness requirements.

### Compliance & Regulatory

- **WCAG 2.x accessibility — Level AA target.** The portal is a teaching surface; trainees include people with disabilities. AA is the working bar: lessons render in a screen-reader-friendly DOM; keyboard navigation works through lesson sequencing and the capstone; sufficient color contrast on syntax highlighting and call-out blocks; no information conveyed by color alone.
- **Out of scope (explicitly documented so they're not future blind spots):** COPPA, FERPA, age verification, content moderation for minors, LMS integration, accreditation tracking, full Section 508 conformance audit. WCAG AAA accommodations *where feasible* are a v1.1 stretch — not v1.

### Technical Constraints

- **Local-only execution.** No telemetry. No remote data fetches at runtime beyond what trainees explicitly invoke (e.g., a trainee clicking an out-link to BMAD docs is fine; the app itself does not phone home).
- **No authentication, no SSO, no RBAC.** The portal trusts the local user. Multi-trainee state isolation is **not** a requirement — each trainee runs their own clone. **No users table** in SQLite.
- **SQLite stores trainee progress state only**, not curriculum content. Lesson content is markdown rendered at request time. `npm run reset-progress` is the supported reset path; it deletes the SQLite file and echoes the path it removed (the "everything is a file" lesson stays visible without trainees needing to learn destructive Git).
- **Stateless lesson rendering** — Next.js renders markdown lesson files at request time. No build step gates curriculum updates.

### Integration Requirements

- **GitHub-native and only GitHub-native.** CODEOWNERS, branch protection, required reviews, PR templates, issue templates. No GitLab/Bitbucket abstraction layer. The lesson *is* "how this works on GitHub" — that specificity is a feature.
- **Tool integrations are documentation, not code.** The four named tools (Claude Code, Copilot, Codex, OpenCode) are referenced through dated friction notes in `training/tools-reference.md`. The portal does **not** embed, invoke, or auto-detect any AI tool.

### Curriculum & Content Requirements

These are the *pedagogical* requirements the domain demands but generic software-product PRDs don't surface:

- **Lesson 5 must teach five failure-mode recovery loops:**
  1. **Spec drift caught at the gate** — the lead identifies that produced code has drifted from story spec → recovery loop (revise code or revise story, not both quietly).
  2. **Unclear stories** — a story file the implementer can't act on unambiguously → revise the story *before* implementing.
  3. **Mixed-tooling conflicts** — two teammates using different AI tools produce diverging conventions for the same story → align on shared convention captured in the story or repo, not in tooling.
  4. **Story too big to land in one PR** — implementer (or lead, at the gate) recognizes the story exceeds a single reviewable change → **split before implementing**, not after.
  5. **Lead disagrees with the spec itself, not the code** — distinct from spec drift: the code is faithful to the story, but the story was wrong → **revise the spec, not the code.** Lesson 5 must explicitly distinguish this from drift recovery so leads don't conflate the two at the gate.
- **Lesson 4 must teach** *what the lead reads for at the gate* — concrete checklist items, not narrative platitudes. Lesson 4 produces a **reusable, pinnable PR-review checklist artifact** (`training/lead-review-checklist.md`) that leads can copy into their own team's repo. Without the artifact, "what the lead reads for" stays trapped in the lesson and never makes it to the gate.
- **Curriculum framing is coding-skill-neutral.** No "as an engineer..." framing. Lesson examples include both engineer-facing and non-engineer-facing scenarios. (Captured as a capability in Journey 2.)
- **Content freshness on tool notes:** `training/tools-reference.md` carries a "verified against versions X, last reviewed YYYY-MM-DD" header on every tool entry. **A named maintainer (default: repo creator, called out in `README.md`) owns the quarterly review cadence in v1.** v1.1 formalizes succession.
- **Self-reference resilience:** every lesson-to-artifact link is a tested reference, broken in CI by the E2E lesson-link check (already in MVP technical success). This is the structural mitigation for Risk #3 — lesson prose silently rotting as artifacts evolve.

### Risk Mitigations

| Risk (from brief) | Domain-specific mitigation in v1 |
|---|---|
| Lesson prose rots as PRDs/stories evolve (#3) | E2E lesson-to-artifact link tests; quarterly lesson sweep owned by named maintainer |
| CODEOWNERS lead bottleneck (#4) | Lesson 4 surfaces the failure mode explicitly + produces a reusable PR-review checklist; multi-owner CODEOWNERS patterns in v1.1 growth |
| Tool-vendor breaking changes (#8) | Tool notes versioned + dated; quarterly review owned by named maintainer in v1 (succession formalization in v1.1) |
| Builder bus-factor (#1) | All curriculum is plain markdown — any teammate can edit; named maintainer reduces single-person dependency; co-owner onboarding doc in v1.1 |

## Innovation & Novel Patterns

The portal's innovation is **not net-new technology, but new patterns of using existing tooling.** Innovation #2 carries technical content (the cross-tool story-file contract); the others are pedagogy, positioning, and strategy. The four claims below are pressure-tested with explicit validation paths and fallbacks so the PRD makes them measurable rather than aspirational.

*Market context (BMAD framework, GitHub Spec Kit, ACM April 2026 TechBrief) is established in the Executive Summary's "What Makes This Special" — not duplicated here.*

### Detected Innovation Areas

#### 1. Self-reference as pedagogy

**What's novel.** Most edtech teaches concepts via curriculum *about* the thing. This portal teaches by *being* the thing — lessons point trainees at *this* repo's own BMAD artifacts as the lesson material. Precedents exist for code-syntax pedagogy (Exercism, koans, learn-by-modifying patterns), but applying it to a *team methodology* (not a programming language) is the novel move.

**Validation.** Capstone completion rate ≥80% in the 60–90 min target band; trainee faithfulness check (PR approved on first review without spec-vs-code corrections). These are already in success criteria — they validate self-reference *as a teaching method*, not just as a marketing line.

**Fallback.** If self-reference doesn't land for a given trainee population (signal: capstone completion drops below 50%, or trainees consistently report needing curriculum *about* BMAD before they can use the repo *as* BMAD), the recovery is to add a thin "concept-first" lesson 0 *before* lesson 1 — preserves the wedge without abandoning it.

#### 2. Story-file as tool-agnostic contract

**What's novel.** GitHub Spec Kit gestures at spec/plan/task primitives across many agents; official BMAD covers the framework. Treating the **story file specifically** as the *enforced cross-tool contract* — and making that the explicit team protocol — is the unowned wedge. This is the headline differentiator.

**Validation.** ≥80% of behavior-changing merged PRs carry a linked story file by POC day 60. This is the single most diagnostic metric for the innovation: if teams aren't producing stories as contracts, the rest of the system is theatre.

**Fallback.** If uptake stalls below 50% by day 60, the diagnostic is whether stories are too heavy (mitigation: lighter story template + Lesson 5 "minimum viable story" guidance) or whether the gate isn't biting (mitigation: tighten Lesson 4's PR-review checklist artifact). Both are in-product fixes, not retreats from the contract claim.

#### 3. GitHub-native machinery as the AI-governance answer

**What's novel.** CODEOWNERS, branch protection, and required reviews aren't new. The novelty is **framing them as the AI-governance answer at the code layer**, at a moment when most teams are evaluating SaaS guardrail products and dedicated AI-review tools. The portal's claim: *the controls every GitHub-using team already has, plus knowing what the human at the gate is reading for, is sufficient.*

**Validation.** Lead reports ≥1 drift caught at the gate within 30 days of POC start. Plus: the PR-review checklist artifact (`training/lead-review-checklist.md`) is pinned by the lead in the team repo as a working document, not a one-time read.

**Fallback (graduated, GitHub-native first).** If CODEOWNERS-as-gate concentrates load on the lead and they rubber-stamp under volume (Risk #4):

1. **First retreat:** v1.1 multi-owner CODEOWNERS pattern lesson distributes the gate across a small group.
2. **Intermediate retreat:** CODEOWNERS rules requiring **N approvers across multiple owner groups** — still GitHub-native, distributes load further without abandoning the gate primitive.
3. **Last retreat:** dedicated reviewer rotations *outside* CODEOWNERS — weakens the GitHub-native claim but doesn't kill it.

Order matters: each step preserves more of the original claim than the next.

#### 4. Fork-per-team as the spread mechanism

**What's novel.** Most training tools centralize: a central training function gates throughput, owns the curriculum, and runs the rollout. This portal **decentralizes by design** — every adopting team forks, tailors CODEOWNERS and rituals to their context, and that fork becomes the next team's reference. No central function gates throughput.

**Validation.** ≥3 additional teams beyond the POC have forked the portal and started adoption within 6–12 months of v1.

**Fallback (graduated, social before structural).** If fork-per-team stalls (signal: <2 forks in 12 months):

1. **First lever:** **active facilitation** — the POC team and volunteer accelerators run lunch-and-learns walking other teams through the portal. *Social, not gating; preserves the wedge.*
2. **Second lever:** **fork-visibility instrumentation** (a v1.1 candidate: a registry or org-internal "which teams have forked" page) so social proof has somewhere to land.
3. **Last lever:** acknowledge org climate isn't ready for organic spread; BMAD adoption proceeds team-by-team as a slower org-change process, not as a portal-led spread.

The recovery explicitly **avoids spinning up a central training function** — that contradicts the wedge.

### Risk Mitigation

Innovation-specific risks are pulled from the brief's risk register:

| Innovation | Primary risk | Mitigation in v1 |
|---|---|---|
| Self-reference as pedagogy | Lesson prose silently rots as artifacts evolve (Risk #3) | E2E lesson-to-artifact link tests; quarterly lesson sweep owned by named maintainer |
| Story-as-contract | Stories too heavy or too light to be load-bearing | Lesson 3 + Lesson 5 explicitly teach "minimum viable story"; capstone produces real, usable stories |
| GitHub-native governance | CODEOWNERS lead bottleneck (Risk #4) | Lesson 4 surfaces the failure mode + produces a reusable PR-review checklist; multi-owner patterns in v1.1 growth |
| Fork-per-team spread | POC-to-team-#2 handoff has no engine (Risk #5) | Capstone PRs from POC become visible momentum that triggers fork #2; active-facilitation + fork-visibility levers held in reserve |

## Web Application Specific Requirements

### Project-Type Overview

The portal is a **server-rendered, multi-page application**: each lesson is a route, each lab is a route, the capstone is a route. Server-rendered lesson-per-route gives trainees deep-linkable lesson URLs they can share with teammates, predictable browser-back navigation, and a screen-reader-friendly DOM out of the box. SPA was considered and rejected — adds complexity without benefit for a teaching surface.

Local-only. No SaaS deployment, no CDN, no production build step gating curriculum updates — lesson markdown is rendered at request time (per Domain Requirements).

### Technical Architecture Considerations

**Stack:**

- **Next.js (App Router)** — single-process; handles lesson page rendering, file-based routes per lesson/lab/capstone step, **and the progress-state API via Next.js API routes**. The brief's earlier "Next.js + Express" framing is consolidated to a single Next.js process.
- **SQLite** for trainee progress state only; no curriculum content, no users table.
- **Markdown-rendering pipeline** (e.g., `remark` + `rehype` ecosystem); lesson files live in `training/lessons/*.md` and equivalent paths.

**Why a single Next.js process (Express dropped):**

The pedagogical case for visible service boundaries doesn't apply to this codebase. The CODEOWNERS model is `@product-engineers` + `@engineering-leads` + `@product-leads` — *all engineers own code together; leads gate it.* There is no frontend-team / backend-team split that a separate Express process would model for trainees. A small training tool also has no operational business running two processes — simpler boot directly serves the <5-min cold-clone success target. v1.1 can layer a multi-service split as a later lesson if there's pull for it.

### Browser Support Matrix

| Browser | Versions |
|---|---|
| Chrome / Edge (Chromium) | Latest two stable versions |
| Firefox | Latest two stable versions |
| Safari | Latest two stable versions |
| Mobile browsers | Best-effort only |

Audience is engineers, PMs, designers — modern evergreen browsers are a safe assumption. No IE11, no legacy Edge, no compatibility shims.

### Responsive Design

Target: **laptop and desktop, ≥1024px viewport.** The portal renders cleanly down to typical laptop screens. Below 1024px is **best-effort, not a release gate** — stakeholders demoing on a tablet during the 15-minute walk get a usable experience, not a polished one. Phones are explicitly out of scope (the trainee experience requires editor + browser side-by-side).

### Performance Targets

See *Non-Functional Requirements → Performance* (NFR-P1 through NFR-P4) for the testable bars. Local-only — no scale concerns; performance bars are honesty bars, not infrastructure bars.

### SEO Strategy

**Not applicable.** The portal runs on `localhost:3000` and is never publicly indexable. The omission is deliberate, documented so it's not a future blind spot.

### Accessibility Level

Cross-reference *Domain-Specific Requirements → Compliance & Regulatory.* Target: **WCAG 2.x Level AA** in v1; AAA accommodations where feasible are v1.1 growth.

### Implementation Considerations

**Node version floor:** **Node 20.x LTS or later.** Phrased as a floor, not a pin — Node 22 LTS works without re-pinning when adopted. Matches Next.js App Router minimum and modern ESM support.

**Package manager:** **npm only for v1.** Trainees see `npm install && npm run dev` in lessons — supporting pnpm/yarn alongside dilutes the lesson surface and adds ongoing maintenance. v1.1 broadens if adopter pressure surfaces.

**Developer-tool overlay (clonable reference repo concerns):**

- Clear `README.md` with the named maintainer, the install path, and the three audience entry points
- `package.json` script set: `npm run dev`, `npm run reset-progress`, `npm run test:e2e`
- No IDE integration as a *product feature* — lesson prose tells trainees to open files in their editor; that's the only "IDE integration" needed
- The portal *itself* is the example/migration story — no prior version to migrate from (greenfield)

## Project Scoping

### Strategy & Philosophy

**Delivery mode:** **Phased** — v1 ships as a single integrated release, v1.1 is validation-gated, Vision is the longer-horizon arc. Phasing is **descriptive in this PRD prose only**; no new phase tags or labels are created elsewhere in the repo without separate approval.

**MVP philosophy: experience MVP.** The bet is that the *integrated whole* — six lessons + three labs + capstone + working `.github/` artifacts + per-tool friction notes — is what validates the wedge. **No single component in isolation validates the wedge; the experience-MVP claim rests on integrated delivery.** This is why the brief insists v1 ships everything together: cut any link in the chain and the method isn't being taught, only described. The trade-off is accepted: longer time to first ship, against the assertion that a half-portal teaches less than half as well.

**Scope tier definitions, by reference (not restated):**

- *MVP — v1, all together:* see *Product Scope → MVP* (above)
- *Growth — v1.1+, validation-gated:* see *Product Scope → Growth Features* (above)
- *Vision — long-horizon:* see *Product Scope → Vision* (above)

### Resource Requirements

**Build mode for v1:** **Solo build** by the named maintainer (default: repo creator, per Domain Requirements). The POC team is looped in for **dogfooding at ~70% completion** — operationally, when lessons 1–4 + at least one lab are runnable and the capstone harness exists in skeleton form. The point at this threshold is to feed Lessons 5/6 and capstone authoring with real trainee signal: what's built informs what remains, and what's pending consumes that feedback. POC dogfooding shapes the per-tool friction notes before v1 ships.

**Ship target:** **Open / TBD.** No committed date. Captured here as a scoping risk: stakeholder plan visibility is incomplete until a target window is set. The brief's working estimate is **3–6 months from dev kickoff** (when skeleton implementation begins; planning time precedes that clock); that bracket is the working assumption, not a commitment.

**Co-owner:** **Open / TBD.** Recruitment is the brief's #1 mitigation (Risk #1: single-builder bus factor, High severity). **Commitment:** *if no co-owner emerges by v1 ship readiness, ship v1 anyway* — with bus-factor documented as a known limitation in the `README.md` — and **commit to formal maintainer succession in v1.1.** Rationale: gating v1 ship on something outside the builder's control (whether a willing co-owner appears) compounds schedule risk on top of resource risk. Better to ship and document than to delay indefinitely. Consistent with the named-maintainer call in Domain Requirements (default = repo creator).

### Risk Mitigation Strategy

Strategic-level synthesis of the brief's risk register through a scoping lens. Tactical mitigations live in Domain Requirements and Innovation sections; this view makes scope-level trade-offs visible.

**Technical risks (low).** The stack is conventional Next.js + SQLite, single process, modern Node. No novel technology bet. Implementation risk is in *integration completeness* (E2E coverage, lesson-link fidelity), not in any individual component. Mitigation: lesson-to-artifact link tests gate CI from day one — the structural mitigation for self-reference rot (Risk #3).

**Market / adoption risks (medium).** Three named risks from the brief:

- *Mixed-tool premise weakens in single-vendor orgs (Risk #6).* Lesson 5 teaches story-as-contract abstraction so single-tool teams still benefit. The mixed-tool framing is the headline; the contract abstraction is what makes single-tool adoption viable too.
- *POC-to-team-#2 handoff has no engine (Risk #5).* Innovation #4 fallback ladder (active facilitation → fork-visibility instrumentation) is the tactical answer. Strategic answer: capstone PRs from the POC become the visible momentum that triggers fork #2.
- *Positioning vs official BMAD (Risk #7).* Attribution and links throughout the curriculum; the brief and PRD never reposition BMAD itself. Low risk, low-cost mitigation.

**Resource risks (high).** This is the most concentrated risk surface:

- *Single-builder bus factor (Risk #1).* See *Resource Requirements* above. Ship-anyway plan with v1.1 succession commitment.
- *Scope ambition (Risk #2).* Categorized here as resource-high **conditional on the solo-build state** — if a co-owner joins, this drops back to a scope-only risk. The experience-MVP philosophy is non-negotiable per the brief, so mitigation is on *delivery support*, not on *scope reduction*: markdown-first lessons mean any teammate can edit; POC dogfooding at ~70% catches the worst miscalibrations early; explicit timeline acknowledged up front rather than discovered late.
- *No committed ship date.* Captured here, not silently absorbed. Reviewers see the schedule risk explicitly.

**Innovation risks.** See *Innovation & Novel Patterns → Risk Mitigation* (above) — fully covered there; not duplicated.

**Compliance risks.** None material — local-only, no auth, no PII, adult professional audience. WCAG AA accessibility is the only compliance bar (see Domain Requirements).

## Functional Requirements

The Functional Requirements below are **the capability contract** for all downstream work: UX, architecture, epic breakdown, and stories trace to these. Anything not listed here will not exist in v1 unless explicitly added.

### FR-1: Curriculum Navigation & Audience Entry

- **FR-1.1:** A trainee can land at the portal home page (`localhost:3000`) and see three differentiated audience entry points: trainee start-here, stakeholder demo, facilitator guide.
- **FR-1.2:** A trainee can navigate through the six lessons in sequential order and see which lessons they have completed.
- **FR-1.3:** A trainee can deep-link directly to any lesson, lab, or capstone step by URL, so links can be shared across teammates.
- **FR-1.4:** A trainee can move forward and backward through lessons via browser navigation; back/forward preserves expected state.
- **FR-1.5:** A lesson page can link to specific repo artifacts (e.g., `.github/CODEOWNERS`, a real story file) by relative path; the link is displayed for the trainee to open in their editor — the portal does not execute or modify the artifact.
- **FR-1.6:** A stakeholder can enter via the stakeholder-demo path and complete the 15-minute scripted demo without reading any lessons in sequence.
- **FR-1.7:** A facilitator can enter via the facilitator-guide path and access workshop prompts, per-lesson timing, common-questions, and lab-format selection.

### FR-2: Trainee Progress State

- **FR-2.1:** A trainee can mark a lesson as complete and see that completion state on subsequent visits.
- **FR-2.2:** A trainee can mark a lab as run and see that state on subsequent visits.
- **FR-2.3:** A trainee can mark capstone steps as complete and see cumulative capstone status.
- **FR-2.4:** Progress state persists in a local SQLite file across browser restarts within a single clone of the repo.
- **FR-2.5:** A trainee can reset all progress state via `npm run reset-progress`, which deletes the SQLite file and echoes the path that was deleted.
- **FR-2.6 *(intentional non-capability):*** The portal does **not** support user signup, signin, accounts, sessions, or multi-user state isolation. The portal trusts the local user; each trainee runs their own clone. Enforced by the absence of any users table in SQLite. *Stated explicitly in the FR list — not in a separate Out-of-Scope section — so implementers wiring up FR-2 see the no-auth decision where they look.*

### FR-3: Capstone Harness

- **FR-3.1:** A trainee can start the capstone from the lesson 6 entry and see a guided sequence of artifact-production steps.
- **FR-3.2:** A trainee can produce 1 product brief through the capstone harness.
- **FR-3.3:** A trainee can produce 1 epic through the capstone harness.
- **FR-3.4:** A trainee can produce 2 stories through the capstone harness.
- **FR-3.5:** A trainee can produce 1 architecture decision record (ADR) through the capstone harness.
- **FR-3.6:** Capstone-produced artifacts are saved as files in the trainee's working tree (not stored in the SQLite file), so the trainee can commit them to their own team's repo.
- **FR-3.7:** A trainee can resume the capstone from the last completed step on a subsequent visit.

### FR-4: Lab Facilitation

- **FR-4.1:** A trainee can run the **solo lab** (lesson-anchored) without any other participant.
- **FR-4.2:** A team can run the **synchronous full-team lab** with all participants in one session, working from the same lab markdown.
- **FR-4.3:** A team can run the **async cross-team story-review lab**, where one group authors a story file and another group reviews and signs off without implementing it.
- **FR-4.4:** A facilitator can select one of the three lab formats per workshop session via the facilitator guide.

### FR-5: Curriculum Content

- **FR-5.1:** All lesson, lab, capstone, and reference content is committed as plain markdown in `training/` and rendered at request time. *(No admin UI; no curriculum-management surface.)*
- **FR-5.2:** Each lesson includes prose that links to specific repo artifacts as **concrete instances** of the concept being taught (the self-reference pedagogy).
- **FR-5.3:** Lesson 4 produces a reusable, pinnable PR-review checklist artifact at `training/lead-review-checklist.md` that leads can copy into their own team's repo.
- **FR-5.4:** Lesson 5 teaches **five named failure-mode recovery loops**: spec drift caught at the gate, unclear stories, mixed-tooling conflicts, story too big to land in one PR, and lead disagrees with the spec itself (distinct from drift).
- **FR-5.5:** A trainee can access per-tool friction notes for Claude Code, GitHub Copilot, OpenAI Codex (CLI + ChatGPT agent), and OpenCode via `training/tools-reference.md`. Each entry carries a "verified against versions X, last reviewed YYYY-MM-DD" header.
- **FR-5.6:** The portal includes a one-page team-rituals checklist that a trainee can pin in their own team's repo as post-capstone reinforcement.
- **FR-5.7:** Curriculum content reads neutrally about coding skill (no "as an engineer..." framing); examples include both engineer-facing and non-engineer-facing scenarios.
- **FR-5.8:** The stakeholder demo script includes explicit sections that anticipate and address procurement, SSO, and vendor-lock-in objections.
- **FR-5.9:** The facilitator guide includes per-lesson timing guidance, facilitator-specific prompts, common-questions sections, and lab-format selection guidance.
- **FR-5.10:** The repo provides a canonical BMAD story-file template that capstone trainees use and that lessons 3 and 5 point at as the contract format.
- **FR-5.11:** The repo includes a sample `AGENTS.md` at the root as the **tool-agnostic shared-agent-context template** (read by Codex, OpenCode, Claude Code). Trainees copy this into their own team's repo as the cross-tool layer of the story-as-contract pattern.
- **FR-5.12:** The repo includes a sample `.github/copilot-instructions.md` as the **Copilot-specific companion to `AGENTS.md`**, demonstrating the tool-specific configuration layer that sits alongside the shared one.

### FR-6: Repo Surface — Governance & Distribution

- **FR-6.1:** The repo includes a working `.github/CODEOWNERS` file referencing the real role groups (`@product-engineers`, `@engineering-leads`, `@product-leads`) — the file lessons treat as the live artifact, not a placeholder.
- **FR-6.2:** The repo includes branch-protection setup notes in `.github/` so an adopting team can apply the same posture to their fork.
- **FR-6.3:** The repo includes a PR template at `.github/pull_request_template.md` with an explicit story-link field so PRs can carry their story contract. *(Field-only at v1; CI enforcement of the field is deferred to v1.1. Rationale: Lesson 4 teaches that the lead — not CI — enforces the contract; auto-enforcement makes the human-at-the-gate framing redundant. The success metric is sampled, not gated. Adopting teams can add CI enforcement in their own fork as a teachable extension.)*
- **FR-6.4:** The repo includes a top-level `README.md` that names the curriculum maintainer (default: repo creator), the install path, the three audience entry points, and — when applicable — the documented bus-factor limitation.
- **FR-6.5:** A developer can install dependencies via `npm install` and run the portal via `npm run dev` after cloning the repo, with no further setup required on macOS, Linux, or Windows-via-WSL2.
- **FR-6.6:** The portal exposes `npm run dev`, `npm run reset-progress`, and `npm run test:e2e` as discoverable scripts in `package.json`.

## Non-Functional Requirements

NFRs are selective — only categories that genuinely apply to this product are documented. Scalability and Integration are explicitly skipped (rationale at the end).

### Performance

- **NFR-P1:** Cold clone to running portal completes in **under 5 minutes** on a clean dev machine (Node 20+, modern hardware, normal network access to the npm registry). Tied to *Success Criteria → Install friction*.
- **NFR-P2:** Lesson page render time is **<200ms server time** on a typical developer laptop.
- **NFR-P3:** Capstone artifact-save operations complete in **<500ms** per save action.
- **NFR-P4:** Facilitator prep time is **under 2 hours** to prepare a half-day workshop using `training/facilitator-guide.md` as-is. Tied to *Success Criteria → Facilitator self-sufficiency*.

### Accessibility

Cross-reference: *Domain-Specific Requirements → Compliance & Regulatory.*

- **NFR-A1:** The portal meets **WCAG 2.x Level AA** for: keyboard navigation through lesson sequence and capstone, screen-reader-friendly DOM, color contrast meeting AA on syntax highlighting and call-out blocks, no information conveyed by color alone.
- **NFR-A2:** Accessibility is verified by automated testing in the E2E suite (e.g., `axe-core` or equivalent) on the trainee golden path before v1 ships.
- **NFR-A3:** WCAG AAA accommodations are a v1.1 stretch where feasible; not a v1 release gate.

### Security

- **NFR-S1:** The portal performs **zero data egress at runtime** — no telemetry, no analytics, no remote API calls beyond what the trainee explicitly invokes (out-links the trainee clicks). Verified at runtime by network-request inspection in the E2E suite.
- **NFR-S2:** No authentication, authorization, session, or user-account surface exists (per FR-2.6). The portal trusts the local user; classes of attacks that depend on multi-user isolation are **out of scope by design**, not a known weakness.
- **NFR-S3:** Dependencies pass `npm audit` at the **high or higher** severity level on every CI run; new vulnerabilities at high or critical block merge until remediated. Moderate-severity findings are tracked, not gating. Industry-standard bar — moderate findings on npm transitive deps grind merges without commensurate security signal.

### Reliability

- **NFR-R1:** The trainee golden path (boot → start-here → six lessons → one lab → capstone start) is covered by the E2E test suite and breaks CI on regression.
- **NFR-R2:** Every lesson-to-artifact link (per FR-1.5 and FR-5.2) is a tested reference; broken links break CI. *Direct mitigation for Risk #3 (lesson prose silently rotting as artifacts evolve).*
- **NFR-R3:** A trainee who hits an error state (e.g., corrupted SQLite progress file) can recover via `npm run reset-progress` within one minute. Capstone artifacts live in the working tree (per FR-3.6), so reset-progress does not destroy capstone work.
- **NFR-R4:** The portal has no uptime requirement — local-only by design. Availability NFRs do not apply.

### Maintainability

- **NFR-M1:** Curriculum content is **plain markdown** committed in `training/`; any teammate (engineer or non-engineer) can author or edit a lesson without touching application code (per FR-5.1). *Risk #1 mitigation: reduces single-builder bus factor on content.*
- **NFR-M2:** A **named curriculum maintainer** (default: repo creator) is identified in `README.md` and owns the **quarterly tool-notes review cadence** and the **quarterly lesson sweep**. Cadence ownership is committed in v1 (per FR-6.4 + Domain Requirements).
- **NFR-M3:** The portal is a **single Next.js process**; operational complexity stays minimal so a non-builder facilitator can adopt it without infrastructure expertise.
- **NFR-M4:** Tool-friction notes (`training/tools-reference.md`) carry a "verified against versions X, last reviewed YYYY-MM-DD" header per entry (per FR-5.5); content with a stale review date (**>120 days**) is **visibly flagged on the page** so trainees see when knowledge has aged. The 120-day threshold corresponds to one missed quarterly review cycle plus a 30-day grace window — early enough to prevent trainees from consuming materially stale tool notes, lenient enough not to trip immediately after a missed cycle.

### Licensing

- **NFR-L1:** The portal is distributed under the **MIT License** (`LICENSE` at repo root, in place since the initial commit). Rationale: aligns with official BMAD's license, makes the **fork-per-team spread mechanism** legitimate (proprietary licensing would defeat the wedge), and matches the brief's "shareable as a reference" framing. Adopting teams may keep their forks internal or open-source them; both are sanctioned by the license.

### Categories Skipped (Documented for Completeness)

- **Scalability:** Not applicable. Each trainee runs their own clone; no multi-tenancy, no concurrent-user model, no shared deployment.
- **Integration:** Not applicable at runtime. The portal produces governance artifacts (CODEOWNERS, PR template, story templates) for adopting teams to use; it does not integrate with external systems at runtime.

