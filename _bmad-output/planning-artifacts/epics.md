---
stepsCompleted:
  - step-01-validate-prerequisites
  - step-02-design-epics
  - step-03-create-stories
  - step-04-final-validation
status: complete
inputDocuments:
  - _bmad-output/planning-artifacts/prd.md
  - _bmad-output/planning-artifacts/architecture.md
  - _bmad-output/planning-artifacts/product-brief-bmad_demo.md
  - _bmad-output/planning-artifacts/product-brief-bmad_demo-distillate.md
---

# bmad_demo - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for bmad_demo, decomposing the requirements from the PRD and Architecture into implementable stories.

## Requirements Inventory

### Functional Requirements

**FR-1: Curriculum Navigation & Audience Entry**

- FR1.1: A trainee can land at the portal home page (`localhost:3000`) and see three differentiated audience entry points: trainee start-here, stakeholder demo, facilitator guide.
- FR1.2: A trainee can navigate through the six lessons in sequential order and see which lessons they have completed.
- FR1.3: A trainee can deep-link directly to any lesson, lab, or capstone step by URL, so links can be shared across teammates.
- FR1.4: A trainee can move forward and backward through lessons via browser navigation; back/forward preserves expected state.
- FR1.5: A lesson page can link to specific repo artifacts (e.g., `.github/CODEOWNERS`, a real story file) by relative path; the link is displayed for the trainee to open in their editor — the portal does not execute or modify the artifact.
- FR1.6: A stakeholder can enter via the stakeholder-demo path and complete the 15-minute scripted demo without reading any lessons in sequence.
- FR1.7: A facilitator can enter via the facilitator-guide path and access workshop prompts, per-lesson timing, common-questions, and lab-format selection.

**FR-2: Trainee Progress State**

- FR2.1: A trainee can mark a lesson as complete and see that completion state on subsequent visits.
- FR2.2: A trainee can mark a lab as run and see that state on subsequent visits.
- FR2.3: A trainee can mark capstone steps as complete and see cumulative capstone status.
- FR2.4: Progress state persists in a local SQLite file across browser restarts within a single clone of the repo.
- FR2.5: A trainee can reset all progress state via `npm run reset-progress`, which deletes the SQLite file and echoes the path that was deleted.
- FR2.6 *(intentional non-capability)*: The portal does NOT support user signup, signin, accounts, sessions, or multi-user state isolation. Enforced by the absence of any users table in SQLite.

**FR-3: Capstone Harness**

- FR3.1: A trainee can start the capstone from the lesson 6 entry and see a guided sequence of artifact-production steps.
- FR3.2: A trainee can produce 1 product brief through the capstone harness.
- FR3.3: A trainee can produce 1 epic through the capstone harness.
- FR3.4: A trainee can produce 2 stories through the capstone harness.
- FR3.5: A trainee can produce 1 architecture decision record (ADR) through the capstone harness.
- FR3.6: Capstone-produced artifacts are saved as files in the trainee's working tree (not stored in the SQLite file), so the trainee can commit them to their own team's repo.
- FR3.7: A trainee can resume the capstone from the last completed step on a subsequent visit.

**FR-4: Lab Facilitation**

- FR4.1: A trainee can run the **solo lab** (lesson-anchored) without any other participant.
- FR4.2: A team can run the **synchronous full-team lab** with all participants in one session, working from the same lab markdown.
- FR4.3: A team can run the **async cross-team story-review lab**, where one group authors a story file and another group reviews and signs off without implementing it.
- FR4.4: A facilitator can select one of the three lab formats per workshop session via the facilitator guide.

**FR-5: Curriculum Content**

- FR5.1: All lesson, lab, capstone, and reference content is committed as plain markdown in `training/` and rendered at request time. (No admin UI; no curriculum-management surface.)
- FR5.2: Each lesson includes prose that links to specific repo artifacts as **concrete instances** of the concept being taught (the self-reference pedagogy).
- FR5.3: Lesson 4 produces a reusable, pinnable PR-review checklist artifact at `training/lead-review-checklist.md` that leads can copy into their own team's repo.
- FR5.4: Lesson 5 teaches **five named failure-mode recovery loops**: spec drift caught at the gate, unclear stories, mixed-tooling conflicts, story too big to land in one PR, and lead disagrees with the spec itself (distinct from drift).
- FR5.5: A trainee can access per-tool friction notes for Claude Code, GitHub Copilot, OpenAI Codex (CLI + ChatGPT agent), and OpenCode via `training/tools-reference.md`. Each entry carries a "verified against versions X, last reviewed YYYY-MM-DD" header.
- FR5.6: The portal includes a one-page team-rituals checklist that a trainee can pin in their own team's repo as post-capstone reinforcement.
- FR5.7: Curriculum content reads neutrally about coding skill (no "as an engineer..." framing); examples include both engineer-facing and non-engineer-facing scenarios.
- FR5.8: The stakeholder demo script includes explicit sections that anticipate and address procurement, SSO, and vendor-lock-in objections.
- FR5.9: The facilitator guide includes per-lesson timing guidance, facilitator-specific prompts, common-questions sections, and lab-format selection guidance.
- FR5.10: The repo provides a canonical BMAD story-file template that capstone trainees use and that lessons 3 and 5 point at as the contract format.
- FR5.11: The repo includes a sample `AGENTS.md` at the root as the **tool-agnostic shared-agent-context template** (read by Codex, OpenCode, Claude Code).
- FR5.12: The repo includes a sample `.github/copilot-instructions.md` as the **Copilot-specific companion to `AGENTS.md`**.

**FR-6: Repo Surface — Governance & Distribution**

- FR6.1: The repo includes a working `.github/CODEOWNERS` file referencing the real role groups (`@product-engineers`, `@engineering-leads`, `@product-leads`) — the file lessons treat as the live artifact, not a placeholder.
- FR6.2: The repo includes branch-protection setup notes in `.github/` so an adopting team can apply the same posture to their fork.
- FR6.3: The repo includes a PR template at `.github/pull_request_template.md` with an explicit story-link field. Field-only at v1; CI enforcement of the field is deferred to v1.1.
- FR6.4: The repo includes a top-level `README.md` that names the curriculum maintainer (default: repo creator), the install path, the three audience entry points, and — when applicable — the documented bus-factor limitation.
- FR6.5: A developer can install dependencies via `npm install` and run the portal via `npm run dev` after cloning the repo, with no further setup required on macOS, Linux, or Windows-via-WSL2.
- FR6.6: The portal exposes `npm run dev`, `npm run reset-progress`, and `npm run test:e2e` as discoverable scripts in `package.json`.

### NonFunctional Requirements

**Performance**

- NFR-P1: Cold clone to running portal completes in **under 5 minutes** on a clean dev machine.
- NFR-P2: Lesson page render time is **<200ms server time** on a typical developer laptop.
- NFR-P3: Capstone artifact-save operations complete in **<500ms** per save action.
- NFR-P4: Facilitator prep time is **under 2 hours** to prepare a half-day workshop using `training/facilitator-guide.md` as-is.

**Accessibility**

- NFR-A1: The portal meets **WCAG 2.x Level AA** for: keyboard navigation through lesson sequence and capstone, screen-reader-friendly DOM, color contrast meeting AA on syntax highlighting and call-out blocks, no information conveyed by color alone.
- NFR-A2: Accessibility is verified by automated testing in the E2E suite (e.g., `axe-core` or equivalent) on the trainee golden path before v1 ships.
- NFR-A3: WCAG AAA accommodations are a v1.1 stretch where feasible; not a v1 release gate.

**Security**

- NFR-S1: The portal performs **zero data egress at runtime** — no telemetry, no analytics, no remote API calls beyond what the trainee explicitly invokes. Verified at runtime by network-request inspection in the E2E suite.
- NFR-S2: No authentication, authorization, session, or user-account surface exists. The portal trusts the local user.
- NFR-S3: Dependencies pass `npm audit` at the **high or higher** severity level on every CI run; new vulnerabilities at high or critical block merge until remediated.

**Reliability**

- NFR-R1: The trainee golden path (boot → start-here → six lessons → one lab → capstone start) is covered by the E2E test suite and breaks CI on regression.
- NFR-R2: Every lesson-to-artifact link (per FR-1.5 and FR-5.2) is a tested reference; broken links break CI.
- NFR-R3: A trainee who hits an error state (e.g., corrupted SQLite progress file) can recover via `npm run reset-progress` within one minute. Capstone artifacts in the working tree are not destroyed.
- NFR-R4: The portal has no uptime requirement — local-only by design.

**Maintainability**

- NFR-M1: Curriculum content is **plain markdown** committed in `training/`; any teammate can author or edit a lesson without touching application code.
- NFR-M2: A **named curriculum maintainer** (default: repo creator) is identified in `README.md` and owns the **quarterly tool-notes review cadence** and the **quarterly lesson sweep**.
- NFR-M3: The portal is a **single Next.js process**; operational complexity stays minimal.
- NFR-M4: Tool-friction notes (`training/tools-reference.md`) carry a "verified against versions X, last reviewed YYYY-MM-DD" header per entry; content with a stale review date (**>120 days**) is **visibly flagged on the page**.

**Licensing**

- NFR-L1: The portal is distributed under the **MIT License** (`LICENSE` at repo root, in place since the initial commit).

### Additional Requirements

**Starter Template (impacts Epic 1, Story 1):**

- The Architecture explicitly mandates `create-next-app` (Next.js v16, App Router) as the starter, with these flags: `--typescript --tailwind --eslint --app --src-dir --turbopack --import-alias "@/*" --use-npm`. Repo is non-empty (existing `_bmad/`, `_bmad-output/`, `training/`, `docs/`, `LICENSE`, `README.md`, `.gitignore`); init story scaffolds via temp directory and merges. Existing `README.md` is preserved; `.gitignore` is merged. Empty `docs/` is removed. React Compiler intentionally NOT enabled. AGENTS.md scaffolded by `create-next-app` v16 satisfies FR-5.11 directly.

**Stack & Infrastructure:**

- Single Next.js v16 process (App Router); no separate Express service.
- SQLite via `better-sqlite3` (^12.9.0); hand-written SQL; no ORM; idempotent inline schema in `src/db/schema.sql`.
- Progress DB at `./data/progress.sqlite` (gitignored).
- Capstone artifacts at `./_bmad-output/capstone/<utc-timestamp>/` (per-session subdirs gitignored).
- Server-side validation: Zod (^3.x) at API boundaries.
- Markdown pipeline: `remark` + `remark-rehype` + plugins (`remark-gfm`, `rehype-slug`, `rehype-autolink-headings`, `rehype-pretty-code` or `rehype-shiki`); explicitly NOT MDX.
- Styling: Tailwind CSS + accessible Radix primitives (`@radix-ui/react-*`) for non-trivial interactive widgets.
- Fonts and assets vendored locally (no Google Fonts CDN, no external image hosts).
- Two POST endpoints only: `POST /api/progress`, `POST /api/capstone/save`. Reads happen in Server Components directly. No Server Actions in v1.

**Testing & CI:**

- E2E framework: Playwright (covers golden path, accessibility via `@axe-core/playwright`, network interception for no-egress).
- Unit tests: Vitest, co-located with source.
- Two-layer link integrity: static scan via `scripts/check-links.ts` (`npm run lint:links`) + Playwright DOM check.
- No-egress test: Playwright `page.route()` records all outbound requests; fails on non-localhost origins.
- CI: paired pipelines `.vela.yml` (primary) and `.github/workflows/ci.yml` (mirror); both run the same npm-script contract: `lint` → `tsc --noEmit` → `audit` → `lint:links` → `test:unit` → `test:e2e`. Drift between the two files is a defect.
- `npm run audit` runs `npm audit --audit-level=high`; high or critical findings fail the pipeline.
- Cross-platform install verification (macOS / Linux / WSL2) is a manual pre-release checklist item, not CI-matrix-gated.

**Capstone resume — open schema-design point:**

- FR-3.7 resume requires the schema to **represent active-session state explicitly**, not just completions. Three viable shapes (nullable `completed_at` on existing `progress` table, separate `capstone_sessions` table, or distinct `kind` value transition). The architecture defers the choice to the FR-3 implementation story; the chosen shape must be queryable by "most recent active session" and "is this session complete?" in O(1), and `getRecentCapstoneSession()` in `src/lib/db/progress-db.ts` must align.

**Important architectural gaps to absorb in early stories:**

- Performance NFR-P2/P3 have no automated guard. Recommendation: add a soft-bound `tests/e2e/performance.spec.ts` (e.g., page response <500ms) when the lesson rendering story lands.
- NFR-M4 stale-date threshold needs a Vitest unit test (0/119/120/121 days, missing `reviewedAt`).
- No-egress test scope must enumerate allowed hosts explicitly (`localhost`, `127.0.0.1`, `::1`).

**Naming and structure rules (load-bearing for AI agent consistency):**

- Database: lowercase `snake_case` columns; `kind` column uses kebab-case string literals enforced by Zod enum, not SQL CHECK.
- API: kebab-case routes; only GET (for Server Component reads via DB; never API GETs) and POST. Request/response bodies use camelCase keys. Status codes: 200 / 201 / 400 / 500 (no 204, no 409).
- Code: PascalCase.tsx for default-exported React components; kebab-case.ts for utilities; PascalCase types (no `I`-prefix).
- Server-only code (`src/lib/db/*`) never imported by `"use client"` modules.
- Co-locate client components until rule-of-three; promote to `src/components/` after three reuses.
- ISO 8601 strings for dates in JSON; `completed_at` stored as TEXT.
- Capstone session id format: compact UTC (`20260507T143022Z`).

**Patterns deliberately NOT defined in v1 (rule-of-three trip-wires):**

- No logger library, metrics library, tracing library.
- No global error catalog or error-code enum.
- No response-envelope abstraction beyond `{ ok, error?, details? }`.
- No repository / service / DAO layer over `src/lib/db/`.
- No custom React hook for fetch state.
- No feature-flag mechanism.
- No i18n framework — content is English-only at v1.

### UX Design Requirements

*Not applicable — no UX Design Specification document exists. The PRD's Web Application Specific Requirements section establishes UX bounds (server-rendered, ≥1024px viewport, WCAG AA, modern evergreen browsers) that are absorbed into the Functional and Non-Functional Requirements above.*

### FR Coverage Map

**Functional Requirements:**

- FR1.1: Epic 1 — home page with three audience-entry cards
- FR1.2: Epic 2 — sequential six-lesson navigation with completion-state UI
- FR1.3: Epic 2 — deep-linkable lesson/lab/capstone routes (App Router file-based)
- FR1.4: Epic 2 — browser nav forward/back preserves state (Server Components)
- FR1.5: Epic 2 — lesson prose links to relative repo paths via remark/rehype
- FR1.6: Epic 2 (route) + Epic 6 (content) — stakeholder demo entry path
- FR1.7: Epic 2 (route) + Epic 6 (content) — facilitator guide entry path
- FR2.1: Epic 3 — mark lesson complete via POST /api/progress
- FR2.2: Epic 3 — mark lab run via POST /api/progress
- FR2.3: Epic 3 — mark capstone steps complete via POST /api/progress
- FR2.4: Epic 3 — SQLite persistence (`data/progress.sqlite`)
- FR2.5: Epic 3 — `npm run reset-progress` script
- FR2.6: Epic 3 — non-capability enforced by absence (no users table, no auth code)
- FR3.1: Epic 4 — capstone start at /capstone
- FR3.2: Epic 4 — produce 1 product brief
- FR3.3: Epic 4 — produce 1 epic
- FR3.4: Epic 4 — produce 2 stories
- FR3.5: Epic 4 — produce 1 ADR
- FR3.6: Epic 4 — write to working tree at `_bmad-output/capstone/<session>/<step>.md`
- FR3.7: Epic 4 — resume from last completed step (resolves capstone-session schema design point)
- FR4.1: Epic 6 — solo lab markdown
- FR4.2: Epic 6 — sync full-team lab markdown
- FR4.3: Epic 6 — async cross-team story-review lab markdown
- FR4.4: Epic 6 — facilitator format selection (in facilitator-guide content)
- FR5.1: Epic 2 — markdown rendered at request time via remark/rehype
- FR5.2: Epic 2 — lesson-to-artifact concrete linking (link integrity tested)
- FR5.3: Epic 6 — `training/lead-review-checklist.md` (produced by Lesson 4)
- FR5.4: Epic 6 — five named recovery loops in `lessons/5-working-as-a-team.md`
- FR5.5: Epic 6 — `training/tools-reference.md` per-tool sections with `reviewedAt`/`verifiedVersions` frontmatter
- FR5.6: Epic 6 — `training/team-rituals-checklist.md`
- FR5.7: Epic 6 — coding-skill-neutral content convention (reviewer-enforced)
- FR5.8: Epic 6 — stakeholder-demo objection sections
- FR5.9: Epic 6 — facilitator timing/prompts/common-Qs sections
- FR5.10: Epic 6 — `training/story-template.md`
- FR5.11: Epic 1 (scaffold default) + Epic 6 (customized content)
- FR5.12: Epic 5 (file shell) + Epic 6 (content)
- FR6.1: Epic 5 — `.github/CODEOWNERS`
- FR6.2: Epic 5 — `.github/branch-protection-notes.md`
- FR6.3: Epic 5 — `.github/pull_request_template.md` (story-link field; no CI enforcement)
- FR6.4: Epic 1 — README naming maintainer + bus-factor note
- FR6.5: Epic 1 — `npm install && npm run dev` cold-clone install path
- FR6.6: Epic 1 — `package.json` discoverable scripts

**Non-Functional Requirements:**

- NFR-P1 (cold-clone <5min): Epic 1 — lean deps, prebuilt better-sqlite3 binaries, manual platform checklist; tracked, no automated gate
- NFR-P2 (lesson render <200ms): Epic 5 — soft-bound `tests/e2e/performance.spec.ts`
- NFR-P3 (capstone save <500ms): Epic 4 (architectural) + Epic 5 (soft-bound assertion)
- NFR-P4 (facilitator prep <2h): Epic 6 — content-shape constraint of facilitator guide
- NFR-A1 (WCAG AA): Epic 5 — `@axe-core/playwright` on golden-path routes; Radix accessible primitives
- NFR-A2 (a11y automated checks): Epic 5 — `tests/e2e/accessibility.spec.ts` pipeline-gated
- NFR-A3 (WCAG AAA): explicit non-work for v1 (deferred to v1.1)
- NFR-S1 (zero data egress): Epic 5 — `tests/e2e/no-egress.spec.ts` with allowed-host enumeration; vendored fonts/assets
- NFR-S2 (no auth surface): Epic 3 + Epic 5 — verified by architectural absence (no users table, no auth code)
- NFR-S3 (npm audit high+ blocks merge): Epic 5 — `npm run audit` invoked by both bundled pipelines
- NFR-R1 (golden-path E2E): Epic 5 — `tests/e2e/golden-path.spec.ts`
- NFR-R2 (lesson-link integrity): Epic 2 — static `scripts/check-links.ts` + Playwright DOM check
- NFR-R3 (reset-progress recovery <1min, no capstone loss): Epic 3 — hardcoded reset target; capstone in separate path
- NFR-R4 (no uptime requirement): explicit non-work — local-only by design
- NFR-M1 (markdown editable by any teammate): Epic 6 — plain markdown convention, no MDX
- NFR-M2 (named maintainer + quarterly cadence): Epic 1 (README) + Epic 6 (cadence content)
- NFR-M3 (single Next.js process): Epic 1 — architectural lock from scaffold
- NFR-M4 (stale-date banner >120d): Epic 2 (component) + Epic 5 (Vitest unit test for threshold)
- NFR-L1 (MIT license): Epic 1 — verified in place from initial commit

## Epic List

### Epic 1: Project Foundation & One-Command Boot

A developer can clone the repo, run `npm install && npm run dev`, and land at the portal home page (`localhost:3000`) seeing three differentiated audience-entry cards (trainee start-here, stakeholder demo, facilitator guide). The repo is named, license is in place, scripts are discoverable, and the bus-factor limitation is documented. **FRs covered:** FR1.1, FR5.11 (scaffold default), FR6.4, FR6.5, FR6.6. **NFRs:** NFR-P1, NFR-L1, NFR-M3.

### Epic 2: Lesson Navigation & Self-Reference Link Integrity

A trainee can navigate through lessons sequentially or jump in by deep link; lesson prose can link to specific repo artifacts (the self-reference pedagogy mechanism); broken lesson-to-artifact links break CI. The markdown rendering pipeline is in place; lessons, labs, and audience-entry routes render plain markdown at request time; staleness banner is available for tool-notes content. **FRs covered:** FR1.2, FR1.3, FR1.4, FR1.5, FR1.6 (route), FR1.7 (route), FR5.1, FR5.2. **NFRs:** NFR-R2, NFR-M4 (component).

### Epic 3: Trainee Progress State & Reset

A trainee can mark lessons, labs, and capstone steps as complete and see that state persist across browser restarts; the absence of any user-account/auth surface is enforced architecturally; a corrupted SQLite file can be reset via `npm run reset-progress` (which echoes the deleted path) within one minute. **FRs covered:** FR2.1, FR2.2, FR2.3, FR2.4, FR2.5, FR2.6 (enforced by absence). **NFRs:** NFR-R3.

### Epic 4: Capstone Harness

A trainee can produce a real BMAD artifact set — 1 product brief + 1 epic + 2 stories + 1 ADR — through a guided multi-step flow, save artifacts as files in their own working tree, and resume from the last completed step on a subsequent visit. The implementation resolves the capstone-session schema-shape design point flagged in the architecture. **FRs covered:** FR3.1, FR3.2, FR3.3, FR3.4, FR3.5, FR3.6, FR3.7.

### Epic 5: Governance Surface, Paired CI, & Release-Readiness Verification

The live `.github/` artifacts that lessons treat as concrete instances exist and work (CODEOWNERS, branch-protection notes, PR template with story-link field, copilot-instructions.md). Two paired CI pipelines (`.vela.yml` primary + `.github/workflows/ci.yml` mirror) gate the same npm-script contract on every PR: lint, typecheck, audit, link-integrity, unit tests, E2E tests (golden path, accessibility, no-egress, soft-bound performance). The cross-platform install checklist is documented for the maintainer. **FRs covered:** FR6.1, FR6.2, FR6.3, FR5.12 (file shell). **NFRs:** NFR-A1, NFR-A2, NFR-S1, NFR-S2, NFR-S3, NFR-R1, NFR-P2, NFR-P3, NFR-M4 (test).

### Epic 6: Curriculum Content Authoring (🛑 SUPERSEDED — see Epic 12 below)

All curriculum content is authored and committed: a trainee reads six full lessons, runs any of three labs, and accesses the audience-specific guides (start-here, stakeholder-demo with explicit objection sections, facilitator-guide with timing and prompts). Lesson 4 produces the reusable lead-review-checklist artifact; Lesson 5 teaches five named failure-mode recovery loops. The repo carries the canonical story template, team-rituals checklist, per-tool friction notes (with versioned/dated headers), customized AGENTS.md, and customized copilot-instructions.md. **FRs covered:** FR1.6 (content), FR1.7 (content), FR4.1, FR4.2, FR4.3, FR4.4, FR5.3, FR5.4, FR5.5, FR5.6, FR5.7, FR5.8, FR5.9, FR5.10, FR5.11 (content), FR5.12 (content). **NFRs:** NFR-M1, NFR-M2, NFR-P4.

> **Status (2026-05-09):** Epic 6's slot was reclaimed by the rebuild planning for the Setup Wizard + Bootstrap epic. The curriculum-authoring scope was orphaned and lifted forward to **Epic 12 — Curriculum Content Authoring**, which adds a research foundation phase (Story 12.0) and reflects the post-rebuild architecture (interactive PTY chat, three-tool capstone).

### Epic 12: Curriculum Content Authoring (replaces Epic 6)

All curriculum content is authored and committed against a research foundation: a trainee reads six fully-authored lessons, runs any of three labs, and accesses the audience-specific guides — without ever encountering a "Placeholder" line. Lesson 4 produces the reusable lead-review-checklist; Lesson 5 teaches five named failure-mode recovery loops; Story 12.0 produces three research artifacts (BMAD mechanics / GitHub governance / team rituals) that ground every subsequent story. The repo carries the canonical story template, team-rituals checklist, per-tool friction notes, customized `AGENTS.md`, customized `.github/copilot-instructions.md`, and a stakeholder demo script with three explicit objection-handling sections. **FRs covered:** FR1.6 (content), FR1.7 (content), FR4.1, FR4.2, FR4.3, FR4.4, FR5.3, FR5.4, FR5.5, FR5.6, FR5.7, FR5.8, FR5.9, FR5.10, FR5.11 (content), FR5.12 (content). **NFRs:** NFR-M1, NFR-M2, NFR-P4.

## Epic 1: Project Foundation & One-Command Boot

A developer can clone the repo, run `npm install && npm run dev`, and land at the portal home page (`localhost:3000`) seeing three differentiated audience-entry cards (trainee start-here, stakeholder demo, facilitator guide). The repo is named, license is in place, and the bus-factor limitation is documented.

### Story 1.1: Scaffold Next.js v16 app and merge with existing repo

As a developer cloning the bmad_demo portal,
I want the repo to contain a working Next.js v16 App Router scaffold merged with the existing BMAD content,
So that I can run `npm install && npm run dev` and reach a Next.js page at `localhost:3000` without manual setup.

**Acceptance Criteria:**

**Given** a clean clone of the bmad_demo repo at the v1 baseline
**When** I inspect the repo root
**Then** the existing artifacts are preserved (`_bmad/`, `_bmad-output/`, `training/`, `LICENSE`, the existing `README.md`)
**And** new Next.js scaffold artifacts exist (`src/`, `next.config.ts`, `tsconfig.json`, `package.json`, `eslint.config.mjs`, `postcss.config.mjs`, `tailwind.config.ts`, `AGENTS.md`)
**And** the empty `docs/` directory is removed
**And** `.gitignore` is the merge of the existing entries and the scaffold additions (`node_modules/`, `.next/`, `data/*.sqlite`, `data/*.sqlite-journal`, `_bmad-output/capstone/[0-9]*/`, `playwright-report/`, `test-results/`)

**Given** the scaffolded repo
**When** I run `npm install && npm run dev` on a clean machine
**Then** the Next.js dev server starts on port 3000 using Turbopack
**And** `http://localhost:3000` returns a 200 response with the default Next.js page

**Given** `package.json`
**When** I inspect it
**Then** `"engines": { "node": ">=20" }` is declared
**And** the create-next-app default scripts (`dev`, `build`, `start`, `lint`) are present
**And** `next` is at v16.x and `react`/`react-dom` are at the v16-compatible major

**Given** the scaffolded `tsconfig.json`
**When** I check it
**Then** `strict: true` is enabled
**And** the `@/*` path alias resolves to `./src/*`

**Given** the repo root
**When** I check for the Node-version pin
**Then** `.nvmrc` exists pinning Node 20+ as an advisory floor

**Given** the scaffold
**When** I inspect Tailwind, ESLint, and React Compiler configuration
**Then** Tailwind CSS is wired (`tailwind.config.ts`, `postcss.config.mjs`, Tailwind directives in `src/app/globals.css`)
**And** ESLint flat-config is in place (`eslint.config.mjs`)
**And** React Compiler is NOT enabled (no React Compiler flag in `next.config.ts`)

**Given** the repo root
**When** I open `AGENTS.md`
**Then** the file exists (placeholder content from `create-next-app` v16 is acceptable; customization for this repo is deferred to Epic 6)

### Story 1.2: Render home page with three audience-entry cards

As a trainee, stakeholder, or facilitator visiting the portal for the first time,
I want the home page at `localhost:3000/` to present three differentiated audience-entry cards,
So that I can self-select my path (start-here / stakeholder demo / facilitator guide) without reading any onboarding prose first.

**Acceptance Criteria:**

**Given** the running dev server
**When** I navigate to `http://localhost:3000/`
**Then** I see three audience-entry cards on the page
**And** each card has a distinct title: "Trainee — Start Here", "Stakeholder — 15-minute Demo", "Facilitator — Workshop Guide"
**And** each card has a short descriptive blurb that names the audience and the time investment
**And** each card is rendered as an accessible link (clickable, keyboard-focusable, has an accessible name)

**Given** the home page
**When** I click the trainee card
**Then** the browser navigates to `/start-here`
**And** clicking the stakeholder card navigates to `/stakeholder`
**And** clicking the facilitator card navigates to `/facilitator`

**Given** the destination routes do not yet have content
**When** I land on `/start-here`, `/stakeholder`, or `/facilitator`
**Then** Next.js's default not-found or a minimal placeholder page renders (acceptable for this story; full rendering lands in Epic 2)

**Given** the home-page implementation
**When** I inspect the source
**Then** the home page is `src/app/page.tsx` rendered as a Server Component
**And** the audience-card UI is implemented as `src/components/audience-card.tsx` (promoted by rule-of-three from the start, since three cards live on the home page)
**And** no remote fonts or images are used (all assets vendored locally)

**Given** the rendered DOM in a browser DevTools inspection
**When** I check the cards
**Then** the three cards use semantic markup that exposes their audience labels to a screen reader
**And** color is not the only signal differentiating the cards (icon, label, or border also differentiates them)

### Story 1.3: Author top-level README with maintainer, install, audiences, and bus-factor note

As a developer or stakeholder landing on the repo,
I want a concise top-level README that names the maintainer, shows the install path, points at the three audience entry points, and discloses the bus-factor limitation,
So that I can decide what to do next within 30 seconds of opening the repo.

**Acceptance Criteria:**

**Given** the repo
**When** I open `README.md`
**Then** the README opens with a one-paragraph orientation: what bmad_demo is and why it exists
**And** the README explicitly names the **curriculum maintainer** (default: Devbox / repo creator) with a contact handle
**And** the README documents the install path: `git clone <repo> && cd bmad_demo && npm install && npm run dev` lands at `http://localhost:3000`
**And** the README points at the three audience entry points: trainee start-here, stakeholder demo, facilitator guide (each named with the route or markdown path)
**And** the README discloses the bus-factor limitation as a known v1 limitation, with a forward reference to the v1.1 maintainer-succession plan

**Given** the README
**When** I check for license and platform support
**Then** the README states the repo is MIT-licensed (linking `LICENSE`)
**And** the README states the supported platforms (macOS, Linux, Windows-via-WSL2) and the Node 20+ floor
**And** the README states the npm-only constraint for v1

**Given** the README
**When** I check for what's NOT in v1
**Then** the README briefly notes the v1 non-capabilities most likely to be assumed otherwise (no auth, no SaaS deployment, no remote services / telemetry)
**Or** the README points at the PRD's scope section as the canonical source

## Epic 2: Lesson Navigation & Self-Reference Link Integrity

A trainee can navigate through lessons sequentially or by deep link; lesson prose links to specific repo artifacts (the self-reference pedagogy mechanism); broken lesson-to-artifact links break CI. The markdown rendering pipeline is in place; lesson, lab, and audience-entry routes render plain markdown at request time; a staleness banner is available for tool-notes content.

**Note on scope split with Epic 5:** The architecture's two-layer link integrity is split between epics. Epic 2 ships the static scan (`scripts/check-links.ts` via `npm run lint:links`) — fast, deterministic, the 95%-case catcher. The Playwright DOM-side link check rides in alongside the broader E2E suite in Epic 5 (Playwright is first installed there).

### Story 2.1: Markdown rendering pipeline as a Server Component utility

As a curriculum author committing a markdown file under `training/`,
I want a single Server Component `<Markdown source={…} />` that renders my markdown into accessible HTML using a fixed remark/rehype pipeline,
So that any lesson, lab, or audience-entry route can render content with one consistent rendering contract.

**Acceptance Criteria:**

**Given** the codebase has a markdown rendering library
**When** I inspect `src/lib/markdown/`
**Then** `pipeline.ts` exports a configured remark/rehype pipeline with these plugins enabled in this order: `remark-parse`, `remark-gfm`, `remark-rehype`, `rehype-slug`, `rehype-autolink-headings`, and a syntax-highlighting plugin (`rehype-pretty-code` or `rehype-shiki`)
**And** `frontmatter.ts` exports a YAML frontmatter parser that returns `{ frontmatter: Record<string, unknown>, body: string }`; missing frontmatter returns `{}`
**And** `render.tsx` exports a Server Component `<Markdown source={…} />` that runs the pipeline and renders the resulting HTML

**Given** a markdown file containing GFM tables, footnotes, fenced code blocks, and a heading
**When** the `<Markdown>` Server Component renders it
**Then** tables, footnotes, and fenced code blocks all render correctly
**And** every `h1`–`h6` heading has an `id` slug
**And** the autolink-headings plugin produces an in-page anchor link for each heading

**Given** a fenced code block with a language tag
**When** rendered
**Then** syntax highlighting is applied with sufficient color contrast for WCAG AA
**And** the rendered code block exposes a screen-reader-readable structure (`<pre><code>` semantics; not a `<div>` soup)

**Given** a markdown file with a relative link `[CODEOWNERS](.github/CODEOWNERS)` or `../foo/bar.md`
**When** the `<Markdown>` Server Component renders it
**Then** the rendered `<a href="…">` preserves the relative path verbatim — it is NOT rewritten to an absolute URL or a `next/link`
**And** in development mode, a custom rehype plugin emits a console warning if a relative link's target file does not exist on disk

**Given** the markdown library
**When** I look at imports
**Then** the pipeline does NOT use MDX (no `@next/mdx`, no `next-mdx-remote`); markdown stays plain markdown
**And** the pipeline lives under `src/lib/markdown/` with co-located `pipeline.test.ts` (Vitest) covering: GFM rendering, heading slug + autolink, relative link preservation, and frontmatter parsing of present-and-missing cases

### Story 2.2: Lesson route with sequential lesson navigation

As a trainee working through the curriculum,
I want `/lessons/[slug]` to render the corresponding lesson markdown with a "previous / next" navigation strip showing my position in the six-lesson sequence,
So that I can move through lessons in order, deep-link to any lesson, and use browser back/forward to revisit prior lessons.

**Acceptance Criteria:**

**Given** the file `training/lessons/1-what-is-bmad.md` exists (placeholder content acceptable; real content lands in Epic 6)
**When** I visit `http://localhost:3000/lessons/1-what-is-bmad`
**Then** the page renders the markdown via `<Markdown>` from Story 2.1 inside a layout containing a sequential lesson navigation strip
**And** the page returns 200

**Given** I am on lesson 3
**When** I look at the sequential navigation
**Then** I see "Previous: Lesson 2 — The artifact chain" linking to `/lessons/2-the-artifact-chain`
**And** I see "Next: Lesson 4 — CODEOWNERS and the gate" linking to `/lessons/4-codeowners-and-the-gate`
**And** the strip shows my position in the sequence (e.g., "3 of 6")

**Given** I am on lesson 1
**When** I look at the navigation
**Then** the "Previous" affordance is absent or disabled (no broken link to a non-existent lesson 0)
**And** "Next: Lesson 2" is present

**Given** I am on lesson 6
**When** I look at the navigation
**Then** "Next" points at the capstone entry (`/capstone`) or is hidden if the capstone route does not yet exist (placeholder is acceptable; real cross-route nav lands when the capstone exists in Epic 4)
**And** "Previous: Lesson 5" is present

**Given** the sequential navigation
**When** I inspect the source
**Then** the lesson sequence is defined in a single source-of-truth (e.g., `src/lib/lessons/sequence.ts` or read from filesystem ordering by leading number prefix) — not duplicated across lesson pages
**And** the lesson route is `src/app/lessons/[slug]/page.tsx` rendered as a Server Component

**Given** I am on any lesson page
**When** I press the browser back button
**Then** I land on the previous URL I visited (Server Component rendering; no client-side router state to reset)
**And** keyboard navigation through the page (Tab) reaches the prev/next links and the in-content links in a logical order

**Given** an unknown lesson slug
**When** I visit `/lessons/some-nonsense`
**Then** Next.js renders the global 404 page (`not-found.tsx`)

### Story 2.3: Audience-entry routes and lab route render their markdown

As a stakeholder, facilitator, trainee, or workshop attendee following a deep link,
I want `/start-here`, `/stakeholder`, `/facilitator`, and `/labs/[slug]` to each render their respective markdown file via the pipeline,
So that the three audience entry points and any lab can be reached directly by URL without going through the lesson sequence.

**Acceptance Criteria:**

**Given** placeholder markdown files exist for each route (`training/00-start-here.md`, `training/stakeholder-demo-script.md`, `training/facilitator-guide.md`, and at least one stub under `training/labs/`)
**When** I visit `/start-here`
**Then** the page renders `training/00-start-here.md` via `<Markdown>` and returns 200

**Given** the stakeholder route
**When** I visit `/stakeholder`
**Then** the page renders `training/stakeholder-demo-script.md` via `<Markdown>` and returns 200
**And** the page does NOT include the lesson sequential-navigation strip (stakeholders are not on the lesson sequence)

**Given** the facilitator route
**When** I visit `/facilitator`
**Then** the page renders `training/facilitator-guide.md` via `<Markdown>` and returns 200

**Given** a lab markdown file at `training/labs/solo.md`
**When** I visit `/labs/solo`
**Then** the page renders the lab markdown via `<Markdown>` and returns 200

**Given** an unknown lab slug
**When** I visit `/labs/some-nonsense`
**Then** Next.js renders the 404 page

**Given** these route implementations
**When** I inspect the source
**Then** each route is a Server Component file: `src/app/start-here/page.tsx`, `src/app/stakeholder/page.tsx`, `src/app/facilitator/page.tsx`, `src/app/labs/[slug]/page.tsx`
**And** all four read their markdown source through a single shared helper (e.g., `src/lib/markdown/load-content.ts`) so file-loading conventions stay consistent

### Story 2.4: Static lesson-link integrity scan as `npm run lint:links`

As the curriculum maintainer or any contributor editing markdown,
I want `npm run lint:links` to scan every markdown file under `training/` and report broken relative links with non-zero exit on failure,
So that lesson prose silently rotting as artifacts evolve becomes a CI failure, not a surprise to a trainee.

**Acceptance Criteria:**

**Given** the codebase
**When** I look for the link-integrity script
**Then** `scripts/check-links.ts` exists
**And** `package.json` exposes `"lint:links": "tsx scripts/check-links.ts"`

**Given** every markdown file under `training/**/*.md` has well-formed relative links
**When** I run `npm run lint:links`
**Then** the script exits with code 0 and prints a success summary (file count and link count scanned)

**Given** a markdown file under `training/` containing a relative link to a path that does not exist on disk (e.g., `[X](../missing-file.md)` or `[Y](.github/MISSING)`)
**When** I run `npm run lint:links`
**Then** the script exits with non-zero
**And** the output names the offending file, the line number, and the broken target

**Given** a markdown file containing an absolute external link (e.g., `https://example.com`) or a `mailto:` link
**When** I run `npm run lint:links`
**Then** the script does NOT attempt to verify the external URL (no network calls — keeps the script deterministic and fast)
**And** the script does not flag the external link as broken

**Given** a markdown file containing an in-page heading anchor (e.g., `[See below](#some-heading)`)
**When** I run `npm run lint:links`
**Then** the script either resolves the anchor against the file's own headings, or skips anchor-only fragments by design (the choice is documented in the script's header comment)

**Given** the script implementation
**When** I inspect it
**Then** `scripts/check-links.ts` walks the markdown tree using a deterministic traversal (alphabetical or stat-ordered)
**And** the script prints its summary to stdout and errors to stderr
**And** the script does not require Playwright or any browser-runtime dependency (it runs as a plain Node + tsx invocation)

### Story 2.5: Staleness banner Server Component for content with `reviewedAt` frontmatter

As a trainee reading per-tool friction notes,
I want a visible banner on any content whose `reviewedAt` frontmatter is more than 120 days old,
So that I know when knowledge has aged past its expected freshness window.

**Acceptance Criteria:**

**Given** the codebase
**When** I look at `src/components/staleness-banner.tsx`
**Then** the file exports a Server Component `<StalenessBanner reviewedAt={…} />` taking a `string | undefined` prop (ISO date `'YYYY-MM-DD'`)

**Given** `reviewedAt` is provided and is fewer than 120 days before "now"
**When** the banner renders
**Then** the banner displays a non-warning "Last reviewed YYYY-MM-DD" line with neutral styling
**And** the banner is screen-reader-accessible (semantic markup, not styled by color alone)

**Given** `reviewedAt` is provided and is 120 or more days before "now"
**When** the banner renders
**Then** the banner displays an explicit "Last reviewed YYYY-MM-DD; flagged as stale" warning with visible warning styling
**And** the warning is conveyed by both text and a non-color signal (an icon, an inline label like "Stale", or a border treatment)

**Given** `reviewedAt` is missing or unparseable
**When** the banner renders
**Then** the banner displays a "no review date — treat as stale" warning equivalent to the >120-day case

**Given** the banner is rendered above content (e.g., a tool-notes section)
**When** the rendered HTML is inspected
**Then** the banner appears in the document order *before* the content it annotates (so screen readers encounter the staleness signal first)

**Given** the component
**When** Vitest tests are added under `src/components/staleness-banner.test.ts` (full test coverage lands in Epic 5)
**Then** at least one smoke test verifies the >120-day branch renders the warning string

## Epic 3: Trainee Progress State & Reset

A trainee can mark lessons, labs, and capstone steps as complete and see that state persist across browser restarts; the absence of any user-account/auth surface is enforced architecturally; a corrupted SQLite file can be reset via `npm run reset-progress` (which echoes the deleted path) within one minute.

**Note on scope split with Epic 4:** Epic 3 ships the SQLite store and progress API, plus mark-complete UI for lessons and labs. Capstone-step progress writes to the same `progress` table — but the active-session schema-shape design point (Architecture §Architectural Boundaries) is **deferred to Epic 4 Story 4.1**. Epic 3's schema and Zod enum cover `'lesson'` and `'lab'` kinds; `'capstone-session'` and `'capstone-step'` kinds (and the `getRecentCapstoneSession()` query) are extended in Epic 4.

### Story 3.1: SQLite progress store — connection, schema, and Zod types

As a Next.js Route Handler or Server Component reading or writing trainee progress,
I want a single `better-sqlite3` connection module, an idempotent inline schema, and Zod request schemas,
So that progress reads and writes share one storage idiom and one validation contract — and the absence of any users/auth surface is verifiable in code.

**Acceptance Criteria:**

**Given** the codebase
**When** I inspect `src/lib/db/`
**Then** `connection.ts` exports a `better-sqlite3` connection singleton that opens (or creates) `./data/progress.sqlite`
**And** on first connect the connection applies `src/db/schema.sql` idempotently (`CREATE TABLE IF NOT EXISTS progress …`)
**And** `progress-db.ts` exports `upsertProgress(entry)` and `getProgress(kind, id)` with synchronous, type-safe signatures
**And** `schemas.ts` exports a Zod `ProgressUpsertRequest` schema validating `{ kind, id, completed }` with `kind ∈ ['lesson', 'lab']` (capstone kinds are added by Epic 4) and `id: string` (non-empty)

**Given** the schema
**When** I open `src/db/schema.sql`
**Then** the file contains exactly one table: `progress(kind TEXT, id TEXT, completed_at TEXT NULL, PRIMARY KEY(kind, id))`
**And** the schema does NOT contain a `users` table, a `sessions` table, or any auth/account surface
**And** all column names are lowercase `snake_case`

**Given** an existing `data/progress.sqlite` file
**When** the connection module loads the schema again
**Then** the schema apply is a no-op (the `IF NOT EXISTS` guard is correct; running twice does not error or duplicate state)

**Given** the connection module
**When** `upsertProgress({ kind: 'lesson', id: 'lesson-1', completed: true })` is called
**Then** a row is inserted or updated such that `completed_at` is a fresh ISO 8601 UTC string (e.g., `'2026-05-07T14:30:22Z'`)
**And** `upsertProgress({ kind: 'lesson', id: 'lesson-1', completed: false })` updates the row to `completed_at = NULL`

**Given** the codebase
**When** I grep for auth-related code
**Then** there is no signin route, no signup route, no session middleware, no `users` table, and no auth-library import (e.g., no `next-auth`, no `clerk`, no `lucia-auth`)
**And** Story 3.1's verification documents this absence in `src/lib/db/progress-db.test.ts` as a smoke test that imports the schema text and asserts it does not contain the substring `users`

**Given** Vitest tests at `src/lib/db/progress-db.test.ts`
**When** I run `npm run test:unit` (the test:unit script can be added by this story or whichever epic first introduces Vitest config — pick whichever lands first)
**Then** tests pass covering: idempotent schema apply, upsert insert path, upsert update path, upsert mark-incomplete path, and the no-`users`-table smoke test

### Story 3.2: `POST /api/progress` Route Handler

As a trainee clicking a "mark complete" button,
I want a `POST /api/progress` endpoint that validates my request and upserts a row in the progress table,
So that progress mutations have a single, validated, server-bound entry point.

**Acceptance Criteria:**

**Given** the codebase
**When** I look at `src/app/api/progress/route.ts`
**Then** the file exports an async `POST` handler that parses the request body through `ProgressUpsertRequest` from Story 3.1

**Given** a valid request `POST /api/progress` with body `{ kind: 'lesson', id: 'lesson-2', completed: true }`
**When** the handler runs
**Then** the corresponding row is upserted with `completed_at` set to the current UTC ISO 8601 string
**And** the response is `200` with body `{ ok: true }`

**Given** a request with a body that fails Zod validation (e.g., missing `kind`, unknown `kind` value, empty `id`)
**When** the handler runs
**Then** the response is `400` with body `{ ok: false, error: 'Invalid request', details: <Zod flatten()> }`
**And** no row is inserted or modified

**Given** the SQLite connection throws an unexpected error
**When** the handler runs
**Then** the handler logs the error via `console.error(e)` (no logger library) and responds `500` with body `{ ok: false, error: 'Internal error' }`
**And** server-side stack traces are NOT exposed in the response body

**Given** the route file
**When** I inspect imports
**Then** the handler imports from `@/lib/db/schemas` and `@/lib/db/progress-db` only (no client-bundle leakage)
**And** the handler does NOT use a `next/server` Server Action — it is a Route Handler per Architecture §Implementation Patterns

### Story 3.3: Mark-complete client UI for lessons and labs, with completion state shown in lesson navigation

As a trainee finishing a lesson or running a lab,
I want a clearly labeled "Mark complete" button on each lesson and lab page, and I want the lesson sequential-navigation strip to indicate which lessons I've already completed,
So that I can track my position through the curriculum across visits.

**Acceptance Criteria:**

**Given** I am on a lesson page (e.g., `/lessons/2-the-artifact-chain`) and the lesson has not been marked complete
**When** I look at the page
**Then** a "Mark complete" button is visible
**And** the button has an accessible label and is keyboard-focusable

**Given** I click "Mark complete"
**When** the click fires
**Then** the client component calls `fetch('/api/progress', { method: 'POST', body: JSON.stringify({ kind: 'lesson', id: 'lesson-2', completed: true }) })`
**And** while the request is in flight the button is disabled with a pending state (`isSaving = true`)
**And** the local UI optimistically reflects "Completed" before the response arrives
**And** on a non-2xx response the local state reverts and a toast surfaces an error message

**Given** I have marked lesson 2 complete
**When** I navigate away and return to `/lessons/2-the-artifact-chain` later (in the same SQLite store)
**Then** the page renders showing lesson 2 as completed (the Server Component has read the progress row directly via `src/lib/db/progress-db.ts`)
**And** the button now reads "Unmark complete" or equivalent toggle

**Given** I am on any lesson page and have completed lessons 1, 2, and 3
**When** I look at the sequential navigation strip from Story 2.2
**Then** lessons 1, 2, and 3 are visually marked complete (checkmark icon + accessible-label "completed")
**And** the visual signal is conveyed by both an icon and a non-color cue (the checkmark serves both)

**Given** the lab page (e.g., `/labs/solo`) and the lab has not been marked run
**When** I look at the page
**Then** a "Mark this lab as run" button is visible
**And** clicking it posts `{ kind: 'lab', id: 'solo', completed: true }` to `/api/progress` with the same optimistic-update / revert-on-failure semantics as the lesson button

**Given** the implementation
**When** I inspect the source
**Then** the client component is co-located with the lesson page (e.g., `src/app/lessons/[slug]/lesson-complete-button.tsx`) per the rule-of-three pattern (lab page may import the same component now since two surfaces use it; promote to `src/components/` when capstone-step usage in Epic 4 makes it three surfaces)
**And** the component is marked `"use client"`
**And** the component does NOT import from `src/lib/db/*` (only `fetch`)

### Story 3.4: `npm run reset-progress` script

As a trainee whose progress state has become corrupted (or who simply wants a clean slate),
I want `npm run reset-progress` to delete the SQLite progress file and tell me exactly which path it removed,
So that I can recover from any progress-state error within one minute, without learning destructive Git, and without losing my capstone artifacts.

**Acceptance Criteria:**

**Given** the codebase
**When** I look for the reset script
**Then** `scripts/reset-progress.ts` exists
**And** `package.json` exposes `"reset-progress": "tsx scripts/reset-progress.ts"`

**Given** `data/progress.sqlite` exists (and possibly a `data/progress.sqlite-journal` companion file)
**When** I run `npm run reset-progress`
**Then** the script deletes `data/progress.sqlite` (and the journal companion if present)
**And** the script prints the absolute path that was deleted to stdout
**And** the script exits 0

**Given** `data/progress.sqlite` does NOT exist
**When** I run `npm run reset-progress`
**Then** the script prints a "nothing to reset (no progress file at <absolute-path>)" message to stdout
**And** the script exits 0 (no-op is not a failure)

**Given** capstone artifacts exist under `_bmad-output/capstone/<utc-timestamp>/`
**When** I run `npm run reset-progress`
**Then** the capstone directory and all its contents are NOT touched by the script
**And** an AC test (Vitest) verifies the script's deletion path is hardcoded to the SQLite file location and does not reference `_bmad-output/`

**Given** the script
**When** I inspect its implementation
**Then** the deletion target path is hardcoded (or imported from a single constants module) — there is no `process.argv` switch that would let a caller widen the deletion target
**And** the script imports only Node built-ins and (optionally) the path constant from `src/lib/db/connection.ts` — no import of the Next.js runtime

**Given** a trainee runs `npm run reset-progress` and then `npm run dev`
**When** the dev server starts
**Then** the connection module re-creates `data/progress.sqlite` with the inline schema from Story 3.1
**And** previously-completed lessons/labs read as not-completed (the new file is empty)

## Epic 4: Capstone Harness

A trainee can produce a real BMAD artifact set — 1 product brief + 1 epic + 2 stories + 1 ADR — through a guided multi-step flow, save artifacts as files in their own working tree, and resume from the last completed step on a subsequent visit. **This epic resolves the capstone-session schema-shape design point flagged in the architecture.**

### Story 4.1: Resolve capstone-session schema shape and extend the progress store for capstone kinds

As the developer landing FR-3.7 (resume),
I want to deliberately pick one of the three viable schema shapes flagged in Architecture §Architectural Boundaries — and extend the progress store and Zod schemas to cover capstone-session and capstone-step state,
So that "most recent active session" and "is this session complete?" are O(1) queryable, and the on-disk session-id matches the in-DB session-id by construction.

**Acceptance Criteria:**

**Given** the architecture's open design point
**When** I review the three viable shapes (nullable `completed_at` on `progress`, separate `capstone_sessions` table, distinct kind-value transition)
**Then** I pick exactly one shape
**And** the choice is documented in a short comment block at the top of `src/lib/db/progress-db.ts` naming the chosen shape and the rationale (e.g., "chose nullable `completed_at` to keep one table; tradeoff: overloads `completed_at` semantics for the capstone-session kind")

**Given** the chosen shape
**When** I update `src/db/schema.sql` (if needed) and `src/lib/db/progress-db.ts`
**Then** the schema continues to apply idempotently from a clean DB
**And** the schema continues to apply idempotently against a Story-3.1 DB (already-existing `data/progress.sqlite` with lesson/lab rows is forward-compatible, OR the migration story is documented if not)

**Given** the extended Zod
**When** I inspect `src/lib/db/schemas.ts`
**Then** `ProgressUpsertRequest`'s `kind` enum is extended to `['lesson', 'lab', 'capstone-session', 'capstone-step']`
**And** capstone-step `id` follows the format `'<utc-timestamp>/<step-name>'` where `<step-name> ∈ {'brief', 'epic', 'story-1', 'story-2', 'adr'}` (validated by Zod)
**And** capstone-session `id` follows the format `'<utc-timestamp>'` matching `^\d{8}T\d{6}Z$` (compact UTC, e.g., `'20260507T143022Z'`)

**Given** the progress-db module
**When** I look for capstone-aware queries
**Then** `getRecentCapstoneSession()` returns the most recently created session row, or `null` if none exists
**And** `isCapstoneSessionActive(sessionId)` returns whether the session is in-progress
**And** `markCapstoneSessionComplete(sessionId)` transitions the session to complete (mechanism depends on chosen shape: setting `completed_at`, inserting/deleting rows, or the kind-transition path)

**Given** Vitest tests at `src/lib/db/progress-db.test.ts`
**When** I run `npm run test:unit`
**Then** new tests pass covering: starting a session inserts an active row; marking a step complete inserts a `capstone-step` row; `getRecentCapstoneSession` returns the latest session by id (timestamps sort lexicographically); marking a session complete flips its active state; a fresh DB returns `null` from `getRecentCapstoneSession`

### Story 4.2: `POST /api/capstone/save` Route Handler and working-tree artifact write

As a trainee saving a capstone-step artifact (brief, epic, story, or ADR),
I want a `POST /api/capstone/save` endpoint that writes my artifact to `_bmad-output/capstone/<session>/<step>.md` and updates the corresponding capstone-step progress row,
So that my capstone outputs land as files in my own working tree (committable to my team's repo) and my session's step state advances atomically.

**Acceptance Criteria:**

**Given** the codebase
**When** I look at `src/app/api/capstone/save/route.ts`
**Then** the file exports a `POST` handler that parses the request body through a `CapstoneSaveRequest` Zod schema validating `{ session: string, step: 'brief' | 'epic' | 'story-1' | 'story-2' | 'adr', content: string }`
**And** `CapstoneSaveRequest` is exported from `src/lib/db/schemas.ts`
**And** the `session` field matches the compact-UTC format from Story 4.1

**Given** the codebase
**When** I look at `src/lib/capstone/`
**Then** `paths.ts` exports `CAPSTONE_DIR = path.resolve(process.cwd(), '_bmad-output/capstone')`, `sessionDir(sessionId)`, and `stepFile(sessionId, step)`
**And** `write-artifact.ts` exports `writeCapstoneArtifact({ session, step, content })` which writes the content to the path returned by `stepFile(...)`, creating the session directory if it does not exist
**And** `write-artifact.ts` rejects writes whose resolved path is outside `CAPSTONE_DIR` (path-traversal guard)

**Given** a valid request `POST /api/capstone/save` with body `{ session: '20260507T143022Z', step: 'brief', content: '...' }`
**When** the handler runs
**Then** the file `_bmad-output/capstone/20260507T143022Z/brief.md` is written with the supplied content
**And** a `capstone-step` row is upserted with `id = '20260507T143022Z/brief'` and `completed_at = <ISO 8601 now>`
**And** the response is `200` with body `{ ok: true, path: '_bmad-output/capstone/20260507T143022Z/brief.md' }` (path is relative to repo root)

**Given** a request with the session id pointing at a non-existent or non-active session
**When** the handler runs
**Then** the response is `400` with `{ ok: false, error: 'Unknown or inactive session' }`
**And** no file is written and no progress row is upserted

**Given** an invalid request body (missing field, unknown `step` value, malformed `session`)
**When** the handler runs
**Then** the response is `400` with the standard `{ ok: false, error: 'Invalid request', details }` envelope from Story 3.2's pattern

**Given** an unexpected filesystem error (e.g., permission denied)
**When** the handler runs
**Then** the handler logs the error via `console.error(e)` and responds `500` with `{ ok: false, error: 'Internal error' }`
**And** the partial file (if any) does not corrupt the progress row (the row is upserted only after the file write resolves)

**Given** Vitest tests at `src/lib/capstone/write-artifact.test.ts`
**When** I run `npm run test:unit`
**Then** tests pass covering: write-then-overwrite, session-directory creation, path-traversal guard rejecting `../`-laden inputs, and a sanity assertion that `CAPSTONE_DIR` resolves under the repo root

### Story 4.3: `/capstone` overview route with resume-or-start

As a trainee returning to the portal partway through a capstone,
I want `/capstone` to either resume my most recent in-progress session or offer to start a new one,
So that I never have to remember a session id and never accidentally clobber prior work.

**Acceptance Criteria:**

**Given** the codebase
**When** I look at `src/app/capstone/page.tsx`
**Then** the file is a Server Component that calls `getRecentCapstoneSession()` from Story 4.1

**Given** there is no prior capstone session
**When** I visit `/capstone`
**Then** the page shows a "Start your capstone" call-to-action explaining the 1 brief + 1 epic + 2 stories + 1 ADR scope
**And** clicking the start button: (a) generates a fresh compact-UTC timestamp, (b) inserts a new active `capstone-session` row via the progress API, (c) creates `_bmad-output/capstone/<that-timestamp>/` (empty), and (d) navigates the trainee to `/capstone/brief?session=<that-timestamp>` (or the chosen first-step URL convention)

**Given** my most recent session is in-progress
**When** I visit `/capstone`
**Then** the page shows a "Resume your capstone — last activity <ISO date>" panel with a link to the next incomplete step
**And** "next incomplete step" is computed by walking the canonical step order (`brief → epic → story-1 → story-2 → adr`) and picking the first step without a `completed_at` row for that session

**Given** my most recent session is complete
**When** I visit `/capstone`
**Then** the page acknowledges the completed session ("Your last capstone — <date>") with a link to view artifacts under `_bmad-output/capstone/<session>/`
**And** the page also offers to start a new session (which inserts a fresh active row with a new timestamp)

**Given** I have multiple historical sessions on disk
**When** I visit `/capstone?session=<older-timestamp>`
**Then** the page renders that older session's overview (read-only summary if complete; resume link if active)
**And** if the requested session id does not exist in the DB or on disk, the route 404s

**Given** the page is rendered
**When** the trainee enters via keyboard
**Then** the primary action (Start / Resume) is reachable via Tab and operable via Enter

### Story 4.4: `/capstone/[step]` per-step page with form for each artifact type

As a trainee producing one of the five capstone artifacts,
I want a per-step page that renders prompts specific to the step (brief / epic / story / ADR), accepts my markdown content, saves it on submit, and advances me to the next step,
So that I produce all 5 artifacts in sequence and finish my capstone with files in my working tree.

**Acceptance Criteria:**

**Given** I am on `/capstone/brief?session=<session-id>` for an active session
**When** the page renders
**Then** it renders a Server Component layout containing the step-specific prompts (a brief outline-of-prompts is acceptable for v1; full prompt content can be refined in Epic 6)
**And** it embeds the `<CapstoneStepForm>` client component (`src/app/capstone/[step]/capstone-step-form.tsx`) preloaded with any previously-saved content for that step (read in the Server Component)
**And** the route works identically for `/capstone/epic`, `/capstone/story-1`, `/capstone/story-2`, and `/capstone/adr`

**Given** the form is on screen
**When** I type my markdown content and click "Save and continue"
**Then** the client component calls `fetch('/api/capstone/save', ...)` with `{ session, step, content }`
**And** during the in-flight request the button is disabled with a pending state
**And** on `200` response the trainee is navigated to the next step in the canonical order, OR — if this was the final step (`adr`) — to a "Capstone complete" screen that calls `markCapstoneSessionComplete(session)` via a `POST /api/progress` `kind='capstone-session'` mutation
**And** on non-2xx response a toast surfaces an error and the form remains mounted with the typed content preserved

**Given** I have previously saved content for this step
**When** I revisit the step's URL during the same session
**Then** the form is preloaded with the saved content (read by the Server Component from `_bmad-output/capstone/<session>/<step>.md`)
**And** I can edit and re-save; the file is overwritten and the corresponding progress row is updated

**Given** I visit `/capstone/<step>` without a `?session=` query parameter
**When** the page renders
**Then** the Server Component falls back to `getRecentCapstoneSession()` and uses that session if active
**And** if no active session exists, the page redirects to `/capstone` (the resume-or-start overview)

**Given** I visit `/capstone/<step>` with a step value not in `{brief, epic, story-1, story-2, adr}`
**When** the page renders
**Then** Next.js renders the 404 page

**Given** the implementation
**When** I inspect the source
**Then** the per-step prompts are defined in a single source-of-truth (e.g., `src/lib/capstone/steps.ts` exporting an ordered list with prompt metadata) — not duplicated across `[step]/page.tsx` and `capstone-step-form.tsx`
**And** the canonical step order (`brief → epic → story-1 → story-2 → adr`) is defined once and consumed by the overview route, the form's "next step" navigation, and the progress-completion check

**Given** I complete the final step
**When** the "Capstone complete" screen renders
**Then** it lists the absolute paths of all 5 produced artifact files under `_bmad-output/capstone/<session>/`
**And** suggests the trainee `git add` and commit them in their team's repo (one-line nudge, not a workflow lecture)

## Epic 5: Governance Surface, Paired CI, and Release-Readiness Verification

The live `.github/` artifacts that lessons treat as concrete instances exist and work (CODEOWNERS, branch-protection notes, PR template with story-link field, copilot-instructions.md shell). Two paired CI pipelines (`.vela.yml` primary + `.github/workflows/ci.yml` mirror) gate the same npm-script contract on every PR: lint, typecheck, audit, link-integrity, unit tests, E2E tests (golden path, accessibility, no-egress, link-integrity DOM, soft-bound performance). The cross-platform install checklist is documented for the maintainer.

### Story 5.1: `.github/` governance artifacts — CODEOWNERS, branch-protection notes, PR template, Copilot instructions shell

As an adopting team forking the portal,
I want working `.github/` artifacts that lessons can point at as live instances of the BMAD-team-rituals pattern,
So that the curriculum's governance claims are demonstrated, not described — and our fork inherits a working starting posture.

**Acceptance Criteria:**

**Given** the repo
**When** I look at `.github/CODEOWNERS`
**Then** the file exists and references three real role groups: `@product-engineers`, `@engineering-leads`, `@product-leads`
**And** the file assigns ownership patterns covering the application code (`src/`), the curriculum (`training/`), the planning artifacts (`_bmad-output/planning-artifacts/`), and the governance surface (`.github/`) — leads gate code; product owns curriculum
**And** a comment block at the top of the file explains its dual role: this is both a working CODEOWNERS *and* the artifact Lesson 4 references; changes here change what lessons teach

**Given** the repo
**When** I look at `.github/branch-protection-notes.md`
**Then** the file exists and documents the recommended branch-protection posture for an adopting team's fork (require PR review, require CODEOWNERS approval, require status checks to pass, require linear history if desired)
**And** the notes mention both bundled CI pipelines (`.vela.yml` and `.github/workflows/ci.yml`) and which checks should be marked required

**Given** the repo
**When** I look at `.github/pull_request_template.md`
**Then** the file exists with: a "Summary" section, an explicit "Story link" field (e.g., a heading or labeled line where contributors paste the link to the story file backing the PR), a "Test plan" checklist, and a brief "What did the lead read for at the gate?" reflection prompt
**And** the template does NOT include CI enforcement of the story-link field (FR-6.3 explicitly defers this to v1.1)
**And** a comment explains that the field is human-checked at the gate, not auto-enforced

**Given** the repo
**When** I look at `.github/copilot-instructions.md`
**Then** the file exists as a content shell (placeholder copy is acceptable; full Copilot-specific instructions are authored in Epic 6)
**And** a comment block explains that this file is the Copilot-specific companion to the repo-root `AGENTS.md` from Story 1.1

**Given** the four files
**When** I run `npm run lint:links` (from Story 2.4)
**Then** the link-integrity scan still passes (any cross-references in these files that point at repo paths resolve)

### Story 5.2: Vitest configuration and rounded-out unit-test coverage

As a maintainer running `npm run test:unit`,
I want a configured Vitest setup that runs all co-located unit tests under `src/` — and the staleness-banner threshold cases that were left to this epic by Story 2.5,
So that every pure-function module has automated coverage and the >120-day staleness threshold is verified at the boundary.

**Acceptance Criteria:**

**Given** the codebase
**When** I look at `vitest.config.ts`
**Then** Vitest is configured to discover `*.test.ts` and `*.test.tsx` files anywhere under `src/`
**And** the React plugin is installed and wired so React Server Components can be tested where needed
**And** `package.json` exposes `"test:unit": "vitest run"` (CI mode; no watcher)

**Given** `src/components/staleness-banner.test.ts`
**When** I run `npm run test:unit`
**Then** tests pass for: 0 days (today), 119 days, 120 days, 121 days (boundary), missing `reviewedAt`, malformed `reviewedAt`, and a date in the future (treated as 0 days, not "stale" — sanity)
**And** the tests use a mocked "now" so they remain stable across calendar dates

**Given** the unit-test surface from earlier epics (`pipeline.test.ts`, `progress-db.test.ts`, `write-artifact.test.ts`, plus any link-script unit harness)
**When** I run `npm run test:unit`
**Then** all unit tests pass
**And** Vitest's exit code is 0 with no skipped tests outside an explicit `test.skip` annotation

### Story 5.3: Playwright configuration and golden-path E2E spec

As a maintainer about to ship v1,
I want a Playwright configuration and a golden-path E2E spec that walks `boot → home → start-here → all six lessons → one lab → capstone start`,
So that the trainee golden path breaks CI on regression.

**Acceptance Criteria:**

**Given** the codebase
**When** I look at `playwright.config.ts`
**Then** Playwright is configured with: `testDir: 'tests/e2e'`, a `webServer` block that runs `npm run start` (or `npm run dev` if production-mode local is not yet wired) and waits for `http://localhost:3000`, and projects for at least Chromium (Firefox/WebKit optional for v1)
**And** `package.json` exposes `"test:e2e": "playwright test"` and a `"test:e2e:install": "playwright install --with-deps chromium"` (for fresh CI environments)

**Given** the spec at `tests/e2e/golden-path.spec.ts`
**When** I run `npm run test:e2e -- golden-path.spec.ts` against a built portal
**Then** the test starts at `http://localhost:3000`, sees the home page with three audience cards
**And** clicks the trainee card → lands at `/start-here` and verifies the page renders content
**And** navigates to `/lessons/1-what-is-bmad`, marks complete, and walks through lessons 2 → 6 via the sequential nav
**And** opens at least one lab route (e.g., `/labs/solo`), marks it run
**And** opens `/capstone` and reaches the start-or-resume screen successfully
**And** the test exits 0 if every step succeeds; non-zero if any step fails

**Given** the spec
**When** I inspect it
**Then** assertions read on user-visible text/role/label (Playwright's `getByRole`, `getByText`) — not on CSS selectors that would break with restyling
**And** the spec uses placeholder content from earlier epics where final content has not yet landed

### Story 5.4: Accessibility and soft-bound performance E2E specs

As a maintainer enforcing WCAG AA and the stated performance bars,
I want a Playwright accessibility spec (axe-core) and a soft-bound performance spec running on each route in the trainee golden path,
So that a11y regressions and runaway server-render cost both fail CI.

**Acceptance Criteria:**

**Given** the codebase
**When** I look at dependencies
**Then** `@axe-core/playwright` is installed and imported by `tests/e2e/accessibility.spec.ts`

**Given** `tests/e2e/accessibility.spec.ts`
**When** I run `npm run test:e2e -- accessibility.spec.ts`
**Then** the spec navigates to each route in the golden-path set (`/`, `/start-here`, `/stakeholder`, `/facilitator`, `/lessons/1-what-is-bmad` … `/lessons/6-capstone`, `/labs/solo`, `/capstone`, `/capstone/brief`)
**And** runs axe-core on each route at WCAG-AA tag level
**And** asserts zero AA-level violations per route
**And** the spec fails the run if any AA-level rule is violated, naming the route, the rule, and the offending node

**Given** `tests/e2e/performance.spec.ts`
**When** I run `npm run test:e2e -- performance.spec.ts`
**Then** the spec navigates to each route in the golden-path set
**And** asserts each navigation's server response time is **under a soft bound of 500ms** (not the hard NFR-P2 bound of 200ms — runner variance dominates a 200ms gate; the soft bound catches order-of-magnitude regressions without flaking)
**And** the spec also covers a capstone save round-trip, asserting the `POST /api/capstone/save` response completes in under 1000ms (soft bound for NFR-P3's 500ms)
**And** the spec's bounds are configurable in one place (a constants block at the top of the file) so future tightening is a one-line change

**Given** Playwright is installed
**When** axe-core runs on routes that include syntax-highlighted code blocks (lessons typically do)
**Then** color-contrast rule violations on `<code>` styling are caught (this is the canonical risk surface for FR-5.1's syntax highlighting + NFR-A1's contrast bar)

### Story 5.5: No-egress and Playwright DOM-side link-integrity E2E specs

As a maintainer enforcing the zero-data-egress claim and the self-reference link-integrity claim at the rendering layer,
I want a Playwright spec that intercepts every outbound request on the trainee golden path and a Playwright spec that walks every rendered `<a href>` in lesson DOM and checks it resolves,
So that NFR-S1 is testable (not a posture statement) and rendering-layer regressions in link rendering can't slip past Story 2.4's static scan.

**Acceptance Criteria:**

**Given** `tests/e2e/no-egress.spec.ts`
**When** I run `npm run test:e2e -- no-egress.spec.ts`
**Then** the spec installs `page.route('**/*', …)` to record every outbound request the page issues during the golden-path walk
**And** asserts that **every recorded request targets only an allowed local origin**
**And** the **allowed-origin list is enumerated explicitly**: `localhost`, `127.0.0.1`, `::1` (resolves the architecture's flagged "no-egress test scope is implicit" gap)
**And** any request to a non-allowed origin (including private network addresses like `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`) fails the spec, naming the offending URL and the page that initiated it

**Given** `tests/e2e/link-integrity.spec.ts`
**When** I run `npm run test:e2e -- link-integrity.spec.ts`
**Then** the spec navigates to each lesson route in turn (`/lessons/1-what-is-bmad` … `/lessons/6-capstone`)
**And** for each rendered `<a href="…">` whose target is a relative repo path (not an external URL, not a `mailto:`, not an in-page anchor), the spec resolves the path against the working-tree filesystem and asserts the target file exists
**And** the spec also runs against `/start-here`, `/stakeholder`, `/facilitator`, and at least one `/labs/[slug]` route
**And** any unresolvable relative `<a href>` fails the spec, naming the page, the link text, and the broken target

**Given** both specs and the static scan from Story 2.4
**When** all three run in CI
**Then** the static scan catches author typos at the markdown layer
**And** the Playwright DOM check catches any rendering-pipeline regression (e.g., a future plugin that mangles relative `href` values) — together they form the two-layer protection per Architecture §Test Strategy

### Story 5.6: `npm run audit` script and cross-platform install checklist documented

As the curriculum maintainer prepping a v1 release,
I want `npm run audit` to gate dependencies at the high+ severity threshold and a manual cross-platform install checklist that I can walk through before every release,
So that NFR-S3 is enforceable in CI and NFR-P1's cross-platform claim is verified before shipping.

**Acceptance Criteria:**

**Given** the codebase
**When** I look at `package.json`
**Then** the `"audit"` script is wired: `"audit": "npm audit --audit-level=high"`
**And** running `npm run audit` against a clean installed tree exits 0 if there are no high or critical findings
**And** running `npm run audit` against an installed tree with a synthesized high-severity finding exits non-zero (verified manually during the story)

**Given** the repo
**When** I look at `.github/branch-protection-notes.md` (or a similar maintainer-doc location, whichever is closest by Architecture's "rule of one for top-level dirs")
**Then** a "Cross-Platform Install Checklist" section exists with exact commands for: macOS (latest LTS), Linux (Ubuntu LTS or equivalent), Windows-via-WSL2
**And** the checklist for each platform names the verification steps: `git clone …`, `node --version` (must be ≥20), `npm --version`, `npm install`, `npm run dev` → reach `http://localhost:3000` → see home page → click trainee card → verify lesson 1 renders → run `npm run reset-progress`
**And** the checklist names the **target completion time** of under 5 minutes per platform (NFR-P1)
**And** the checklist explicitly excludes native-Windows shell (per PRD lock)

**Given** the package-script set
**When** I list `package.json` scripts after this story lands
**Then** the FR-6.6 script set is fully discoverable: `dev`, `build`, `start`, `lint`, `lint:links`, `audit`, `test:unit`, `test:e2e`, `reset-progress`
**And** running `npm run` (without arguments) lists all of the above as discoverable

### Story 5.7: Paired CI pipelines — `.vela.yml` (primary) and `.github/workflows/ci.yml` (mirror)

As the curriculum maintainer (or an adopting team forking the portal),
I want two paired CI pipeline files at the repo root, both running the same npm-script contract,
So that platform portability is demonstrated in practice and any GitHub fork has a running pipeline without requiring self-hosted Vela infrastructure — and the maintenance invariant (drift between the two = bug) is documented.

**Acceptance Criteria:**

**Given** the repo
**When** I look at `.vela.yml`
**Then** the pipeline runs, in order: `npm install` → `npm run lint` → `tsc --noEmit` (typecheck) → `npm run audit` → `npm run lint:links` → `npm run test:unit` → `npm run test:e2e` (with the Playwright browser install step preceding it)
**And** the pipeline triggers on PRs targeting `main` and on direct pushes to `main`
**And** `.vela.yml` runs on Linux

**Given** the repo
**When** I look at `.github/workflows/ci.yml`
**Then** the workflow runs the same npm-script invocations in the same order as `.vela.yml`
**And** uses GitHub-hosted `ubuntu-latest` runners
**And** triggers on `pull_request` (against `main`) and `push` (to `main`)

**Given** both files
**When** I diff them at the npm-script-invocation level
**Then** they invoke the **same npm scripts in the same order** — only the YAML wrapper syntax differs
**And** a comment block at the top of each file states the maintenance invariant verbatim: *"If `.vela.yml` and `.github/workflows/ci.yml` check different things, that's a bug. They MUST stay synchronized on what they verify; only the wrapper syntax may differ."*

**Given** the maintenance invariant
**When** I look at `.github/branch-protection-notes.md` (or wherever the CI-related guidance was placed in Story 5.6)
**Then** the same invariant is restated there for any contributor reading the maintainer-facing docs
**And** the document explains that adopting teams on GitLab CI / Jenkins / CircleCI / etc. translate the same npm-script invocations into their platform's syntax — the npm scripts are the portable contract

**Given** the pipelines
**When** I open a PR with a deliberately broken link in a `training/` markdown file
**Then** both pipelines fail at the `npm run lint:links` step
**And** the PR cannot be merged until the link is fixed (assuming branch-protection rules per Story 5.1 are configured)

## Epic 6: Curriculum Content Authoring

> **🛑 SUPERSEDED — see Epic 12 below (2026-05-09).** Epic 6's slot was reclaimed by the rebuild planning for the Setup Wizard + Bootstrap epic; this curriculum-authoring scope was orphaned. The stories below remain as the original spec for reference, but the active curriculum-authoring epic is **Epic 12 — Curriculum Content Authoring**, which lifts the orphaned scope, adds a research phase, and reflects the post-rebuild architecture (interactive PTY chat, three-tool support, etc.).

All curriculum content is authored and committed: a trainee reads six full lessons, runs any of three labs, and accesses the audience-specific guides. Lesson 4 produces the reusable lead-review-checklist; Lesson 5 teaches five named failure-mode recovery loops. The repo carries the canonical story template, team-rituals checklist, per-tool friction notes (with versioned/dated headers), customized AGENTS.md, and customized copilot-instructions.md.

**Cross-cutting AC for every story in Epic 6:** All content reads coding-skill-neutrally (FR-5.7) — no "as an engineer..." framing; examples include both engineer-facing and non-engineer-facing scenarios where relevant. Every relative repo-path link in any new content resolves under `npm run lint:links` from Story 2.4.

### Story 6.1: Audience entry-point content — start-here, stakeholder demo (with objection sections), facilitator guide

As a trainee, stakeholder, or facilitator landing in the portal,
I want each audience-entry markdown file fully authored to its target,
So that I can self-serve from my entry point — trainee through the lesson sequence, stakeholder through the 15-minute demo, facilitator through workshop prep.

**Acceptance Criteria:**

**Given** the repo
**When** I read `training/00-start-here.md`
**Then** the file frames the trainee path: who the curriculum is for (anyone on the team, coding-skill-neutral), what they'll learn (the six lessons, the labs, the capstone), the time investment (~3 hours or one half-day workshop), and how to navigate (sequential through `/lessons/1-…` or click the cards on `/`)
**And** the file links to the lesson sequence and the capstone entry by relative path

**Given** the repo
**When** I read `training/stakeholder-demo-script.md`
**Then** the file is structured as a **15-minute scripted walk** through three artifacts: a story file, the live `.github/CODEOWNERS`, and a sample merged PR with a story-link reference
**And** the script includes **three explicit objection-handling sections** that anticipate and address: (a) procurement, (b) SSO/RBAC, and (c) vendor-lock-in (FR-5.8)
**And** the script's pacing notes are visible (e.g., "~3 minutes per artifact + 6 minutes of objection handling = 15 minutes")
**And** the script lands the contract → enforcement → propagation triangle by the end

**Given** the repo
**When** I read `training/facilitator-guide.md`
**Then** the file is structured around the same six lessons + three labs + capstone, with **per-lesson timing guidance, facilitator-specific prompts, common-questions sections, and explicit lab-format selection guidance** (FR-5.9, FR-4.4)
**And** the lab-format selection section explains when to pick solo vs. synchronous full-team vs. async cross-team story-review
**And** the guide can be walked end-to-end in the **NFR-P4 target of under 2 hours of prep** for a half-day workshop (verified by including a "prep checklist" at the top with estimated prep-time per item that sums to <2h)

**Given** the audience-entry routes from Epic 2 Story 2.3
**When** I navigate to `/start-here`, `/stakeholder`, `/facilitator` after this content lands
**Then** each route renders the corresponding file as full content (no longer placeholders)

### Story 6.2: Lessons 1, 2, and 3 — foundational content

As a trainee starting the lesson sequence,
I want lessons 1 (What is BMAD), 2 (The artifact chain), and 3 (Stories as tool-agnostic contract) authored as full lesson markdown,
So that I have the conceptual grounding to make sense of Lessons 4–6.

**Acceptance Criteria:**

**Given** `training/lessons/1-what-is-bmad.md`
**When** I read it
**Then** the lesson frames BMAD at the team-rituals + governance layer (not just the framework artifacts), and points at the official BMAD framework as the upstream source it builds on (Innovation #4 / Risk #7 mitigation: attribution preserved)
**And** the lesson includes self-reference moments: it points to specific files in this repo as concrete instances of BMAD artifacts (FR-5.2)

**Given** `training/lessons/2-the-artifact-chain.md`
**When** I read it
**Then** the lesson walks through the BMAD artifact chain (brief → PRD → architecture → epics → stories) using *this* repo's own `_bmad-output/planning-artifacts/` as the worked example (FR-5.2 self-reference)
**And** every artifact reference is a relative path that resolves (verified by `npm run lint:links`)

**Given** `training/lessons/3-stories-as-contract.md`
**When** I read it
**Then** the lesson teaches the **story-as-tool-agnostic-contract** thesis (the headline differentiator from the PRD)
**And** the lesson points to `training/story-template.md` (from Story 6.7) as the canonical template trainees will use
**And** the lesson explains how the story file enables a mixed-tool team to ship coherently (Claude Code + Copilot + Codex + OpenCode under one contract)

**Given** all three lesson files
**When** rendered through the lesson route from Story 2.2
**Then** each lesson renders successfully and the sequential nav advances correctly between them

### Story 6.3: Lesson 4 + the reusable lead-review-checklist artifact

As a trainee learning what makes CODEOWNERS load-bearing,
I want Lesson 4 (CODEOWNERS + lead-approval gate) authored — and the reusable lead-review-checklist artifact produced as its concrete output — pinnable in any team's repo,
So that I learn what the lead reads for at the gate, and my team's lead has a working checklist they can adopt.

**Acceptance Criteria:**

**Given** `training/lessons/4-codeowners-and-the-gate.md`
**When** I read it
**Then** the lesson explains CODEOWNERS as the *enforcement layer* (not just a routing convention) for the story-as-contract pattern
**And** the lesson teaches **what the lead reads for at the gate** — concrete checklist items, not narrative platitudes
**And** the lesson references the live `.github/CODEOWNERS` from Story 5.1 as the artifact (FR-5.2)
**And** the lesson references the paired CI pipelines (`.vela.yml` + `.github/workflows/ci.yml`) from Story 5.7 as paired example artifacts (the platform-portability lesson)
**And** the lesson explicitly produces and points at `training/lead-review-checklist.md` as the pinnable artifact (FR-5.3)

**Given** `training/lead-review-checklist.md`
**When** I read it
**Then** the file is formatted as a self-contained, copy-pasteable checklist a lead can drop into their team's repo as a working document
**And** the checklist items cover at minimum: spec-vs-code faithfulness check, scope-fit check (the change matches the story scope), accessibility/tests-still-passing posture, and "who is missing from this review" (CODEOWNERS hits the right groups)
**And** the checklist explicitly notes that this is **what the lead reads for** — it is a lead-side artifact, not a contributor-side one (PRD §FR-6.3 framing: human at the gate, not CI enforcement)

**Given** the lesson and the artifact
**When** I navigate to `/lessons/4-codeowners-and-the-gate`
**Then** the lesson renders fully and its links to the live `.github/` artifacts and `lead-review-checklist.md` resolve

### Story 6.4: Lesson 5 — working as a team with five named failure-mode recovery loops

As a trainee learning how mixed-tool teams stay coherent under AI-assisted contributions,
I want Lesson 5 (working as a team) authored with the **five named failure-mode recovery loops** the PRD requires,
So that I — and my lead — know how to recover when the contract bites and which recovery is appropriate to the failure.

**Acceptance Criteria:**

**Given** `training/lessons/5-working-as-a-team.md`
**When** I read it
**Then** the lesson teaches team rituals: async checkpoints, mixed AI tooling, the story-as-contract abstraction (so single-tool teams still benefit per Risk #6 mitigation)
**And** the lesson explicitly enumerates **five named failure-mode recovery loops** (FR-5.4) — each with a name, a description of the failure mode, and the recovery procedure:
  1. **Spec drift caught at the gate** — produced code drifts from story spec → revise code OR revise story (not both quietly)
  2. **Unclear stories** — story file the implementer can't act on unambiguously → revise the story BEFORE implementing
  3. **Mixed-tooling conflicts** — two teammates' AI tools produce diverging conventions → align on shared convention captured in the story or repo, not in tooling
  4. **Story too big to land in one PR** — implementer or lead recognizes the story exceeds a single reviewable change → split BEFORE implementing, not after
  5. **Lead disagrees with the spec itself, not the code** — code is faithful to the story, but the story was wrong → revise the SPEC, not the code (distinct from drift recovery)

**And** the lesson explicitly distinguishes recovery #1 (drift) from recovery #5 (spec wrong) so leads don't conflate them at the gate
**And** the lesson references `training/story-template.md` as the canonical contract format (FR-5.10 referenced from Lesson 5)

**Given** the lesson
**When** I navigate to `/lessons/5-working-as-a-team`
**Then** the lesson renders fully with all five recovery loops named and described

### Story 6.5: Lesson 6 — capstone framing and per-step prompt content

As a trainee about to start the capstone,
I want Lesson 6 (capstone) authored as the framing narrative, and the per-step prompts inside the capstone harness refined from Story 4.4's first-cut content,
So that I enter the capstone with the right mental model and the per-step pages give me concrete, actionable prompts.

**Acceptance Criteria:**

**Given** `training/lessons/6-capstone.md`
**When** I read it
**Then** the lesson frames the 60–90 minute capstone as the synthesis moment: the trainee runs a full BMAD planning cycle end-to-end and produces 1 brief + 1 epic + 2 stories + 1 ADR
**And** the lesson explains the link to a real PR through the lead-approval gate as the marquee aha moment (PRD's "transformation moment")
**And** the lesson links to `/capstone` as the entry point and to `training/story-template.md` as the format for capstone stories
**And** the lesson does NOT re-explain the BMAD framework (Lessons 1–2 already did) — it focuses on *running it for real*

**Given** the per-step prompts referenced in `src/lib/capstone/steps.ts` (introduced by Story 4.4)
**When** I review them after this story lands
**Then** each of the five steps (brief / epic / story-1 / story-2 / adr) has a refined prompt set: a one-paragraph framing of what the artifact is, two or three guiding questions, and a pointer to a concrete example in `_bmad-output/planning-artifacts/` (or the capstone session itself for stories that build on the brief and epic)
**And** the prompts read coding-skill-neutrally (FR-5.7)
**And** each step's prompt set fits in roughly the time budget implied by the 60–90-minute capstone target (e.g., 10–15 min per artifact)

### Story 6.6: Three labs — solo, synchronous full-team, and async cross-team story-review

As a trainee or workshop participant running a lab,
I want each of the three labs authored as a self-contained markdown file with clear setup, steps, and a debrief prompt,
So that I (or my facilitator) can run any of the three formats without external scaffolding.

**Acceptance Criteria:**

**Given** `training/labs/solo.md`
**When** I read it
**Then** the lab is **lesson-anchored**: a single trainee can run it without any other participant (FR-4.1)
**And** the lab specifies which lesson(s) it follows from, the prerequisite knowledge, the steps to run, the artifact produced, and a self-debrief prompt
**And** the lab's expected runtime is stated (e.g., 20–30 minutes)

**Given** `training/labs/sync.md`
**When** I read it
**Then** the lab supports a **full team in one synchronous session**, working from this lab markdown as the shared script (FR-4.2)
**And** the lab specifies team size, role assignments (who plays the implementer, who plays the lead, etc.), facilitator timing prompts, and a group debrief structure

**Given** `training/labs/async-story-review.md`
**When** I read it
**Then** the lab structures an **async cross-team story-review** where one group authors a story file and another group reviews and signs off on it WITHOUT implementing (FR-4.3)
**And** the lab specifies the handoff mechanism (PR comment thread, doc, or workshop-channel post), the review checklist (which references the story-template + lead-review-checklist), and the sign-off artifact
**And** the lab explicitly preserves the async-checkpoint muscle: review and sign-off happen on the spec, not on produced code

**Given** all three lab files
**When** rendered at `/labs/solo`, `/labs/sync`, `/labs/async-story-review` via Story 2.3
**Then** each lab renders successfully and is selectable from the facilitator guide's lab-format section (Story 6.1)

### Story 6.7: Reference artifacts — team-rituals checklist, story template, tools-reference with maintainer cadence

As a trainee finishing the capstone — or a maintainer keeping content fresh — or any teammate writing a story,
I want the reference artifacts authored: a one-page team-rituals checklist, the canonical story template, and tool friction notes with versioned/dated headers and a stated maintainer cadence,
So that the curriculum's reusable artifacts exist as pinnable, copy-able files in adopting teams' repos.

**Acceptance Criteria:**

**Given** `training/team-rituals-checklist.md`
**When** I read it
**Then** the file fits on a single screen (one-page, dense but readable)
**And** the items cover: writing a story before implementing; routing the right CODEOWNERS group; reading for spec-vs-code faithfulness at the gate; running the right async checkpoint when the story is too big or unclear; updating the story when the spec is wrong (not the code)
**And** the checklist is formatted as a copy-pasteable artifact a trainee pins in their team's repo (markdown checklist syntax: `- [ ] item` lines)
**And** the checklist explicitly says "post-capstone reinforcement" in its header (FR-5.6 framing)

**Given** `training/story-template.md`
**When** I read it
**Then** the file is the **canonical BMAD story format** referenced by Lessons 3, 5, and the capstone harness (FR-5.10)
**And** the template includes the load-bearing fields: title, user story (As a / I want / So that), acceptance criteria in Given/When/Then, references-to-spec section, and a "tool used to implement" optional field for mixed-tool reflection
**And** the file ends with a worked example (a real story shaped to the template — not a meta-comment that says "fill this in")

**Given** `training/tools-reference.md`
**When** I read it
**Then** the file contains one section per named tool: Claude Code, GitHub Copilot, OpenAI Codex (CLI + ChatGPT agent), OpenCode (FR-5.5)
**And** **every section's frontmatter carries `verifiedVersions: '<text>'` and `reviewedAt: 'YYYY-MM-DD'`** (the format the StalenessBanner from Story 2.5 reads)
**And** when a section is rendered through the lesson route, the StalenessBanner appears above its content (verified manually by setting one section's `reviewedAt` to a date >120 days in the past and confirming the warning surfaces)
**And** the file's top-level header (or a sibling maintainer-doc) names the **quarterly review cadence** owned by the curriculum maintainer (NFR-M2): once per quarter, the maintainer updates `verifiedVersions` and `reviewedAt` on each section after running through the listed friction notes

**Given** the maintainer cadence content
**When** I look at `README.md` (from Story 1.3) or a maintainer-doc
**Then** the quarterly cadence is restated for any new maintainer or co-owner reading the maintainer-facing docs

### Story 6.8: AGENTS.md customized for this repo, and copilot-instructions.md content

As a trainee or contributor opening the repo with any of Claude Code, Codex, OpenCode, or Copilot,
I want `AGENTS.md` (root) and `.github/copilot-instructions.md` authored with content specific to *this* repo,
So that AI tools opening the repo get the same shared contract — and trainees see the dual-role artifacts referenced by Lesson 5 as concrete instances.

**Acceptance Criteria:**

**Given** `AGENTS.md` at the repo root (scaffolded by Story 1.1 with `create-next-app` v16's default content)
**When** I read it after this story lands
**Then** the file is **customized for the bmad_demo portal** — naming the project, the load-bearing constraints (story-as-contract, plain-markdown curriculum, no-egress, no-auth, paired-CI invariant), and the canonical npm scripts an agent can use
**And** the file is intelligible to **all of** Claude Code, Codex, and OpenCode (the three tools that read `AGENTS.md` per FR-5.11) — no tool-specific pragma in this file

**Given** `.github/copilot-instructions.md` (file shell from Story 5.1)
**When** I read it after this story lands
**Then** the file is the **Copilot-specific companion** to `AGENTS.md` (FR-5.12), restating the load-bearing constraints in the format Copilot best honors
**And** the file is explicitly cross-referenced from `AGENTS.md` ("see also `.github/copilot-instructions.md` for Copilot-specific phrasing of the same contract")

**Given** both files
**When** Lesson 5 from Story 6.4 references the dual-role file pattern
**Then** the lesson points at *these* two files as concrete instances (FR-5.2 self-reference)
**And** both files' content stays in sync with respect to the load-bearing constraints — drift between them is a defect (analogous to the paired-CI maintenance invariant from Story 5.7); a comment in each file states this

**Given** both files exist with substantive content
**When** I run `npm run lint:links` and the link-integrity DOM check from Story 5.5
**Then** all links in both files resolve

---

## Epic 12: Curriculum Content Authoring (replaces orphaned Epic 6)

**Status:** authored 2026-05-09. Replaces the orphaned Epic 6 (slot reclaimed by Setup Wizard + Bootstrap). Lifts the original 6.1–6.8 stories, adds a research phase to source authoritative content, and reflects the post-rebuild architecture (interactive PTY chat, three-tool capstone, lessons that walk this repo's own artifacts as worked examples).

**Definition of done for the epic:**
- A trainee opening the portal cold can read 6 fully-authored lessons, run any of 3 labs, and reach the capstone with the right mental model — without ever encountering a "Placeholder" line.
- Stakeholders walk a 15-minute scripted demo with three concrete artifacts and three explicit objection-answer sections.
- A facilitator can prep a half-day workshop in under 2 hours using `training/facilitator-guide.md`.
- The pinnable artifacts — `training/story-template.md`, `training/lead-review-checklist.md`, `training/team-rituals-checklist.md`, `training/tools-reference.md` — exist as copy-pasteable reference docs adopting teams can drop into their own repos.
- `AGENTS.md` and `.github/copilot-instructions.md` are customized for *this* repo and stay in sync with each other on the load-bearing constraints.
- Every lesson reads coding-skill-neutrally (FR-5.7) and every relative path link resolves under `npm run lint:links`.
- The portal renders all curriculum surfaces successfully: `/start-here`, `/stakeholder`, `/facilitator`, `/lessons/1..6`, `/labs/{solo,sync,async-story-review}`.

**Cross-cutting AC for every story in Epic 12:**
- All content reads coding-skill-neutrally (FR-5.7) — no "as an engineer..." framing; examples include both engineer-facing and non-engineer-facing scenarios where relevant.
- Every relative repo-path link in any new content resolves under `npm run lint:links` from Story 2.4.
- Every concept introduced in a lesson references *this* repo's own artifacts as the worked example (FR-5.2 self-reference) — never abstract framing alone.

### Story 12.0: Research foundation (BMAD mechanics, GitHub governance, team rituals)

As the author landing the curriculum,
I want three research artifacts authored under `_bmad-output/planning-artifacts/research/`,
So that the lesson and reference-artifact stories that follow are grounded in accurate, sourced understanding rather than guesswork.

**Acceptance Criteria:**

**Given** the official BMAD docs (`bmadcode.com`) and the installed `_bmad/` directory + `.claude/skills/bmad-*` skills
**When** I read `research/bmad-mechanics.md`
**Then** the file documents (a) the BMAD methodology phase model (`1-analysis` → `2-plan-workflows` → `3-solutioning` → `4-implementation`), (b) the agent + skill structure used by the framework, (c) the artifact chain produced (brief → PRD → architecture → epics → stories → ADR), (d) how skills are dispatched and customized via `customize.toml`, and (e) where this portal's `bmad_demo` deviates or extends the framework
**And** every claim is grounded in a citation: a specific URL on `bmadcode.com`, a specific path under `_bmad/` in this repo, or a specific installed skill at `.claude/skills/bmad-<name>/`

**Given** GitHub's official docs on CODEOWNERS and branch protection
**When** I read `research/github-governance.md`
**Then** the file documents (a) CODEOWNERS file syntax + matching rules + edge cases (pattern precedence, team-handle resolution, multiple matches, last-match-wins), (b) branch-protection rules and how each interacts with CODEOWNERS (`Require a pull request before merging` vs `Require review from CODEOWNERS` vs `Require approvals from N people` vs `Restrict who can push to matching branches`), (c) the difference between branch-protection's "include administrators" toggle and "allow specified actors to bypass", (d) the gate pattern this curriculum teaches (CODEOWNERS as the *enforcement layer* for the story-as-contract pattern)
**And** every claim cites the relevant `docs.github.com` URL

**Given** the PRD's team-rituals thesis + the BMAD framework's team-collaboration patterns + the post-rebuild three-tool capstone surface (claude-code / codex / github-copilot)
**When** I read `research/bmad-team-rituals.md`
**Then** the file synthesizes (a) what BMAD-on-a-team actually looks like day-to-day in a mixed-tool environment, (b) the five named failure-mode recovery loops the PRD requires (drift / unclear stories / mixed-tooling conflicts / story-too-big / spec-wrong), (c) the dual-role AGENTS.md + `.github/copilot-instructions.md` pattern and why it exists (two tools, one contract), (d) how this portal's three-tool capstone (Claude Code / Codex / GitHub Copilot) maps onto the team-rituals thesis
**And** every claim cites either the PRD §, the BMAD docs, or a concrete artifact in this repo

**Given** all three research artifacts
**When** I run `npm run lint:links`
**Then** every internal link resolves
**And** the artifacts are committed to `_bmad-output/planning-artifacts/research/` (not under `implementation-artifacts/`, since they are *planning* inputs to the curriculum stories)

### Story 12.1: Lesson 1 — What is BMAD

As a trainee opening the lesson sequence,
I want Lesson 1 authored as full content that frames BMAD at the team-rituals + governance layer (not just the framework artifacts) and points at the official BMAD framework as the upstream source it builds on,
So that I have the conceptual grounding for Lessons 2–6.

**Acceptance Criteria:**

**Given** `training/lessons/1-what-is-bmad.md`
**When** I read it
**Then** the lesson frames BMAD at the team-rituals + governance layer — not just the framework's artifacts — and explicitly attributes the underlying framework to bmadcode.com (Innovation #4 / Risk #7 mitigation: attribution preserved)
**And** the lesson includes self-reference moments: it points to specific files in *this* repo (e.g., `.claude/skills/bmad-*`, `_bmad-output/planning-artifacts/`) as concrete instances of BMAD artifacts (FR-5.2)
**And** the lesson explains *why* a team adopting BMAD needs more than the framework alone — namely, the team-rituals + CODEOWNERS layer this curriculum teaches (preview of Lessons 4 + 5)
**And** the lesson reads in 15 minutes or less for a non-engineer (FR-5.7)

**Given** the lesson at `/lessons/1-what-is-bmad`
**When** rendered through the lesson route
**Then** the lesson renders successfully and the sequential nav advances to Lesson 2

### Story 12.2: Lesson 2 — The artifact chain

As a trainee learning what BMAD produces,
I want Lesson 2 authored as a walk through the artifact chain (brief → PRD → architecture → epics → stories → PR) using *this* repo's own `_bmad-output/planning-artifacts/` as the worked example,
So that I see the chain in action against real artifacts rather than abstract framing.

**Acceptance Criteria:**

**Given** `training/lessons/2-the-artifact-chain.md`
**When** I read it
**Then** the lesson walks through the BMAD artifact chain using *this* repo's own `_bmad-output/planning-artifacts/` (`product-brief-bmad_demo.md`, `prd.md`, `architecture.md`, `epics.md`) as the worked example (FR-5.2 self-reference)
**And** every artifact reference is a relative path that resolves (verified by `npm run lint:links`)
**And** the lesson explains how each artifact in the chain *constrains* the next — the brief is the contract for the PRD, the PRD is the contract for the architecture, etc.
**And** the lesson explicitly notes that the contract pattern is what makes the chain robust against AI-tool drift — change the spec, regenerate the implementation; do not edit the implementation while leaving the spec stale (preview of Lesson 5's drift-recovery loop)

**Given** the lesson at `/lessons/2-the-artifact-chain`
**When** rendered through the lesson route
**Then** the lesson renders successfully and sequential nav works

### Story 12.3: Lesson 3 + canonical story template

As a trainee about to write a story,
I want Lesson 3 authored as the story-as-tool-agnostic-contract thesis, AND `training/story-template.md` authored as the canonical BMAD story format,
So that I know the format and *why* the format is load-bearing for mixed-tool teams.

**Acceptance Criteria:**

**Given** `training/lessons/3-stories-as-tool-agnostic-contract.md`
**When** I read it
**Then** the lesson teaches the **story-as-tool-agnostic-contract** thesis — the PRD's headline differentiator
**And** the lesson explains how the story file enables a mixed-tool team to ship coherently (Claude Code + Codex + GitHub Copilot under one contract)
**And** the lesson points to `training/story-template.md` as the canonical template
**And** the lesson uses one of *this* repo's actual story files (e.g., `_bmad-output/implementation-artifacts/12-1-lesson-1.md` or another small story) as the worked example

**Given** `training/story-template.md`
**When** I read it
**Then** the file is the canonical BMAD story format with load-bearing fields: title, user story (As a / I want / So that), acceptance criteria in Given/When/Then, references-to-spec section, and a "tool used to implement" optional field for mixed-tool reflection (FR-5.10)
**And** the file ends with a worked example (a real story shaped to the template — not a meta-comment that says "fill this in")

**Given** the lesson + the template
**When** rendered through the lesson route
**Then** the lesson renders successfully and links to the template resolve

### Story 12.4: Lesson 4 + reusable lead-review-checklist artifact

As a trainee learning what makes CODEOWNERS load-bearing,
I want Lesson 4 (CODEOWNERS + lead-approval gate) authored — and `training/lead-review-checklist.md` produced as its concrete output, pinnable in any team's repo,
So that I learn what the lead reads for at the gate, and my team's lead has a working checklist they can adopt.

**Acceptance Criteria:**

**Given** `training/lessons/4-codeowners-and-the-gate.md`
**When** I read it
**Then** the lesson explains CODEOWNERS as the *enforcement layer* (not just a routing convention) for the story-as-contract pattern
**And** the lesson teaches **what the lead reads for at the gate** — concrete checklist items, not narrative platitudes
**And** the lesson references the live `.github/CODEOWNERS` from the bootstrapped capstone repos as the artifact (FR-5.2)
**And** the lesson explains the interaction between CODEOWNERS and branch-protection rules (sourced from Story 12.0 research) — review-required vs. review-from-CODEOWNERS vs. include-administrators
**And** the lesson explicitly produces and points at `training/lead-review-checklist.md` as the pinnable artifact (FR-5.3)

**Given** `training/lead-review-checklist.md`
**When** I read it
**Then** the file is formatted as a self-contained, copy-pasteable checklist a lead can drop into their team's repo as a working document
**And** the checklist items cover at minimum: spec-vs-code faithfulness, scope-fit (the change matches the story scope), accessibility/tests-still-passing posture, and "who is missing from this review" (CODEOWNERS hits the right groups)
**And** the checklist explicitly notes that this is **what the lead reads for** — it is a lead-side artifact, not a contributor-side one (PRD §FR-6.3 framing: human at the gate, not CI enforcement)

**Given** the lesson and the artifact
**When** I navigate to `/lessons/4-codeowners-and-the-gate`
**Then** the lesson renders fully and its links resolve

### Story 12.5: Lesson 5 + team-rituals checklist (with five named failure-mode recovery loops)

As a trainee learning how mixed-tool teams stay coherent under AI-assisted contributions,
I want Lesson 5 authored with the **five named failure-mode recovery loops** the PRD requires, AND `training/team-rituals-checklist.md` authored as the pinnable post-capstone reinforcement,
So that I — and my lead — know how to recover when the contract bites and which recovery is appropriate to the failure.

**Acceptance Criteria:**

**Given** `training/lessons/5-working-as-a-team.md`
**When** I read it
**Then** the lesson teaches team rituals: async checkpoints, mixed AI tooling, the story-as-contract abstraction (so single-tool teams still benefit per Risk #6 mitigation)
**And** the lesson explicitly enumerates **five named failure-mode recovery loops** (FR-5.4) — each with a name, a description of the failure mode, and the recovery procedure:
  1. **Spec drift caught at the gate** — produced code drifts from story spec → revise code OR revise story (not both quietly)
  2. **Unclear stories** — story file the implementer can't act on unambiguously → revise the story BEFORE implementing
  3. **Mixed-tooling conflicts** — two teammates' AI tools produce diverging conventions → align on shared convention captured in the story or repo, not in tooling
  4. **Story too big to land in one PR** — implementer or lead recognizes the story exceeds a single reviewable change → split BEFORE implementing, not after
  5. **Lead disagrees with the spec itself, not the code** — code is faithful to the story, but the story was wrong → revise the SPEC, not the code (distinct from drift recovery)

**And** the lesson explicitly distinguishes recovery #1 (drift) from recovery #5 (spec wrong) so leads don't conflate them at the gate
**And** the lesson references `training/story-template.md` as the canonical contract format (FR-5.10)
**And** the lesson references the dual-role `AGENTS.md` + `.github/copilot-instructions.md` pattern (Story 12.8) as a concrete instance of "two tools, one contract"

**Given** `training/team-rituals-checklist.md`
**When** I read it
**Then** the file fits on a single screen (one-page, dense but readable)
**And** items cover: writing a story before implementing; routing the right CODEOWNERS group; reading for spec-vs-code faithfulness at the gate; running the right async checkpoint when the story is too big or unclear; updating the story when the spec is wrong (not the code)
**And** the checklist is formatted as copy-pasteable artifact (markdown checklist syntax: `- [ ] item` lines)
**And** the checklist header explicitly says "post-capstone reinforcement" (FR-5.6)

### Story 12.6: Lesson 6 — refined capstone framing

As a trainee about to start the capstone,
I want Lesson 6 authored as the framing narrative for the post-rebuild interactive-PTY capstone (9 phases, three tools),
So that I enter the capstone with the right mental model.

**Acceptance Criteria:**

**Given** `training/lessons/6-from-lessons-to-capstone.md`
**When** I read it
**Then** the lesson frames the 90–120 minute capstone as the synthesis moment: the trainee runs a full BMAD planning cycle end-to-end and produces brief / PRD / architecture / epics+stories / ADR / dev-story-1.1 / HANDOFF.md
**And** the lesson explains the link to a real PR through the lead-approval gate as the marquee aha moment (PRD's "transformation moment")
**And** the lesson explicitly names the three tool choices (Claude Code / Codex / GitHub Copilot) and notes that the contract (story files) is identical regardless of tool
**And** the lesson links to `/capstone` as the entry point and to `training/story-template.md` as the format
**And** the lesson does NOT re-explain the BMAD framework (Lessons 1–2 already did) — it focuses on running it for real
**And** the lesson reflects the *current* phase model (interactive PTY chat per phase, not the pre-pivot textarea form)

### Story 12.7: Three labs — solo, synchronous full-team, async cross-team story-review

As a trainee or workshop participant running a lab,
I want each of the three labs authored as a self-contained markdown file with clear setup, steps, and a debrief prompt,
So that I (or my facilitator) can run any of the three formats without external scaffolding.

**Acceptance Criteria:**

**Given** `training/labs/solo.md`
**When** I read it
**Then** the lab is **lesson-anchored**: a single trainee can run it without any other participant (FR-4.1)
**And** the lab specifies which lesson(s) it follows from, the prerequisite knowledge, the steps to run, the artifact produced, and a self-debrief prompt
**And** the lab's expected runtime is stated (e.g., 60–90 minutes)

**Given** `training/labs/sync.md`
**When** I read it
**Then** the lab supports a **full team in one synchronous session** (FR-4.2)
**And** the lab specifies team size, role assignments (who plays the implementer, who plays the lead), facilitator timing prompts, and a group debrief structure

**Given** `training/labs/async-story-review.md`
**When** I read it
**Then** the lab structures an **async cross-team story-review** where one group authors a story file and another group reviews and signs off WITHOUT implementing (FR-4.3)
**And** the lab specifies the handoff mechanism, the review checklist (referencing `training/story-template.md` + `training/lead-review-checklist.md`), and the sign-off artifact
**And** the lab explicitly preserves the async-checkpoint muscle: review and sign-off happen on the spec, not on produced code

**Given** all three lab files
**When** rendered at `/labs/solo`, `/labs/sync`, `/labs/async-story-review` via Story 2.3
**Then** each lab renders successfully

### Story 12.8: AGENTS.md customized + `.github/copilot-instructions.md` content

As a trainee or contributor opening the repo with any of Claude Code, Codex, OpenCode, or Copilot,
I want `AGENTS.md` (root) and `.github/copilot-instructions.md` authored with content specific to *this* repo,
So that AI tools opening the repo get the same shared contract — and trainees see the dual-role artifacts referenced by Lesson 5 as concrete instances.

**Acceptance Criteria:**

**Given** `AGENTS.md` at the repo root
**When** I read it after this story lands
**Then** the file is **customized for the bmad_demo portal** — naming the project, the load-bearing constraints (story-as-contract, plain-markdown curriculum, no-egress, no-auth, paired-CI invariant), and the canonical npm scripts an agent can use
**And** the file is intelligible to all of Claude Code, Codex, and OpenCode (the three tools that read `AGENTS.md` per FR-5.11) — no tool-specific pragma in this file

**Given** `.github/copilot-instructions.md`
**When** I read it after this story lands
**Then** the file is the **Copilot-specific companion** to `AGENTS.md` (FR-5.12), restating the load-bearing constraints in the format Copilot best honors
**And** the file is explicitly cross-referenced from `AGENTS.md`

**Given** both files
**When** Lesson 5 references the dual-role file pattern
**Then** the lesson points at *these* two files as concrete instances (FR-5.2)
**And** both files' content stays in sync with respect to the load-bearing constraints — drift between them is a defect; a comment in each file states this

### Story 12.9: Audience entries (start-here, stakeholder, facilitator) + tools-reference

As a trainee, stakeholder, or facilitator landing in the portal,
I want each audience-entry markdown file fully authored to its target — and the per-tool friction notes authored at `training/tools-reference.md`,
So that I can self-serve from my entry point and the per-tool reference exists with maintainer cadence.

**Acceptance Criteria:**

**Given** `training/00-start-here.md`
**When** I read it
**Then** the file frames the trainee path: who the curriculum is for (anyone on the team, coding-skill-neutral), what they'll learn (six lessons, the labs, the capstone), the time investment (~3 hours or one half-day workshop), and how to navigate
**And** the file links to the lesson sequence and the capstone entry by relative path

**Given** `training/stakeholder-demo-script.md`
**When** I read it
**Then** the file is a **15-minute scripted walk** through three artifacts: a story file, the live `.github/CODEOWNERS` (or its template), and a sample merged PR with a story-link reference
**And** the script includes **three explicit objection-handling sections**: (a) procurement, (b) SSO/RBAC, (c) vendor-lock-in (FR-5.8)
**And** pacing notes are visible (e.g., "~3 minutes per artifact + 6 minutes of objection handling = 15 minutes")
**And** the script lands the contract → enforcement → propagation triangle

**Given** `training/facilitator-guide.md`
**When** I read it
**Then** the file is structured around the same six lessons + three labs + capstone, with per-lesson timing guidance, facilitator prompts, common-questions sections, and lab-format selection guidance (FR-5.9, FR-4.4)
**And** the lab-format selection section explains when to pick solo vs. synchronous full-team vs. async cross-team story-review
**And** the guide can be walked end-to-end in **NFR-P4 target of under 2 hours of prep** — verified by a "prep checklist" at the top with estimated prep-time per item summing to <2h

**Given** `training/tools-reference.md`
**When** I read it
**Then** the file contains one section per named tool: Claude Code, Codex (CLI), GitHub Copilot CLI, OpenCode (FR-5.5)
**And** every section's frontmatter carries `verifiedVersions: '<text>'` and `reviewedAt: 'YYYY-MM-DD'` (the format the StalenessBanner from Story 2.5 reads)
**And** when a section is rendered, the StalenessBanner appears above its content for sections with `reviewedAt > 120 days ago` (verified manually by setting one section's date and confirming the warning surfaces)
**And** the file's top-level header names the **quarterly review cadence** owned by the curriculum maintainer (NFR-M2)

**Given** the maintainer cadence content
**When** I look at `README.md`
**Then** the quarterly cadence is restated for any new maintainer reading the maintainer-facing docs

### Story 12.10: Language pass + curriculum-wide link integrity

As the author closing out the curriculum,
I want a single end-to-end language pass across all curriculum surfaces and a verified link-integrity sweep,
So that voice + framing stay coherent across the curriculum and no broken links ship.

**Acceptance Criteria:**

**Given** all stories 12.1–12.9 landed
**When** I read the curriculum end-to-end (start-here → lesson 1 → ... → lesson 6 → labs → audience entries → reference artifacts)
**Then** voice + framing are coherent: identical terminology for repeated concepts ("artifact chain", "story-as-contract", "lead-approval gate", "five recovery loops"), identical capitalization for tool names ("Claude Code" not "claude-code" in trainee-facing prose), no bare "TODO" / "TBD" / "Placeholder" lines remain

**Given** all curriculum files
**When** I run `npm run lint:links`
**Then** every relative link resolves (CI gate)

**Given** all curriculum routes
**When** I drive `/start-here`, `/stakeholder`, `/facilitator`, `/lessons/1..6`, `/labs/{solo,sync,async-story-review}` in Playwright
**Then** every page renders without console errors and the sequential nav between lessons works

**Given** the stale-content check from Story 2.5
**When** I look at `training/tools-reference.md`
**Then** all sections render without the StalenessBanner (recent `reviewedAt`)

**Given** all changes
**When** the quad gate is run
**Then** `npm run test:unit`, `npm run test:e2e`, `npm run lint`, `npm run lint:links` are all green
