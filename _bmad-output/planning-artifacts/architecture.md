---
stepsCompleted:
  - step-01-init
  - step-02-context
  - step-03-starter
  - step-04-decisions
  - step-05-patterns
  - step-06-structure
  - step-07-validation
  - step-08-complete
lastStep: 8
status: complete
completedAt: '2026-05-07'
inputDocuments:
  - _bmad-output/planning-artifacts/prd.md
  - _bmad-output/planning-artifacts/product-brief-bmad_demo.md
  - _bmad-output/planning-artifacts/product-brief-bmad_demo-distillate.md
workflowType: 'architecture'
project_name: 'bmad_demo'
user_name: 'Devbox'
date: '2026-05-07'
---

# Architecture Decision Document

_This document builds collaboratively through step-by-step discovery. Sections are appended as we work through each architectural decision together._

## Project Context Analysis

### Requirements Overview

**Functional Requirements** (6 groups, ~40 FRs):

- **FR-1 Navigation & Audience Entry** — three differentiated entry points (trainee / stakeholder / facilitator); sequential lesson flow with completion state; deep-linkable lesson/lab/capstone URLs; lesson prose links out to specific repo artifacts by relative path (the self-reference pedagogy mechanism).
- **FR-2 Trainee Progress State** — local SQLite for lesson/lab/capstone completion; `npm run reset-progress` deletes the file and echoes its path; **explicit non-capability**: no signup/signin/sessions/users table.
- **FR-3 Capstone Harness** — guided artifact-production producing 1 brief + 1 epic + 2 stories + 1 ADR; **artifacts written to the trainee's working tree as files (not SQLite)** so the trainee commits them to their own repo; resumable across visits.
- **FR-4 Lab Facilitation** — three lab formats (solo / synchronous full-team / async cross-team story-review); facilitator selects format per session.
- **FR-5 Curriculum Content** — all lessons/labs/capstone/reference content is plain markdown in `training/`, rendered at request time; reusable PR-review checklist (`training/lead-review-checklist.md`); five named failure-mode recovery loops in Lesson 5; per-tool friction notes with versioned/dated headers; coding-skill-neutral framing; canonical story-file template; `AGENTS.md` and `.github/copilot-instructions.md` as both lesson artifacts and live tool config.
- **FR-6 Repo Surface — Governance & Distribution** — working `.github/CODEOWNERS`, branch-protection notes, PR template with story-link field (field-only at v1, no CI enforcement — deliberate); `README.md` names the maintainer; cold clone runs on macOS / Linux / WSL2 with `npm install && npm run dev`.

**Non-Functional Requirements** (architectural drivers):

- **Performance** — cold-clone-to-running <5 min (NFR-P1); lesson page render <200ms server time (NFR-P2); capstone artifact-save <500ms (NFR-P3); facilitator prep <2h (NFR-P4, content-shape constraint, not architecture).
- **Accessibility** — **WCAG 2.x Level AA** with automated checks in the E2E suite (`axe-core` or equivalent) on the trainee golden path (NFR-A1, NFR-A2). Release gate.
- **Security** — **zero data egress at runtime**, verified by E2E network-request inspection (NFR-S1); no auth surface (NFR-S2); dependencies pass `npm audit --audit-level=high`; high or critical findings should block merge per the adopting team's chosen workflow, tracked via `npm run audit` (NFR-S3).
- **Reliability** — golden-path covered by the E2E test suite; failure fails the pipeline (NFR-R1); **every lesson-to-artifact link is a tested reference; broken links fail the pipeline** (NFR-R2 — direct mitigation for self-reference rot, Risk #3); reset-progress recoverable in <1 min and does not destroy capstone working-tree artifacts (NFR-R3); **no uptime requirement** — local-only.
- **Maintainability** — markdown content authorable by any teammate (NFR-M1); named maintainer with quarterly cadence (NFR-M2); single Next.js process (NFR-M3); tool-notes with stale-date visibility flag at >120 days (NFR-M4).
- **Licensing** — MIT, repo root (NFR-L1) — already in place since initial commit.

### Scale & Complexity

- Primary domain: **Server-rendered web app** with **clonable reference-repo (developer-tool) overlay**
- Complexity level: **Medium-low** — small surface, conventional stack, no novel infra; complexity is concentrated in *integration completeness* (E2E coverage, lesson-link integrity, accessibility automation, no-egress verification), not any individual component
- Estimated architectural components: ~8 — Next.js app shell, lesson rendering pipeline, progress-state API + SQLite driver, capstone artifact-write pipeline (working-tree FS), markdown content tree (`training/`), `.github/` governance artifact set, E2E test harness (golden path + a11y + link integrity + no-egress), repo-level scripts (`dev`, `reset-progress`, `test:e2e`).

### Technical Constraints & Dependencies

**Locked by PRD** (architectural decisions already made — not re-litigated):

- **Single Next.js process** (App Router); Express service from the brief is **dropped**.
- **SQLite for trainee progress state only** — no curriculum content, no users table.
- **Lesson markdown rendered at request time** — no build step gates curriculum updates.
- **Node 20.x LTS floor**, **npm only** for v1.
- **Cross-platform: macOS / Linux / Windows-via-WSL2** — native Windows shell explicitly out.
- **Local-only distribution** — `git clone && npm install && npm run dev`. No SaaS, no CDN, no telemetry, no remote runtime fetches.
- **WCAG 2.x AA**, browser support: latest two stable Chrome/Edge/Firefox/Safari, ≥1024px viewport.
- **MIT license** (repo root, in place).

**Open architectural decisions surfaced by the requirements** (to address in upcoming steps):

- Markdown rendering pipeline choice (`next-mdx-remote` vs. `@next/mdx` vs. `remark` + `rehype` direct) and how it supports relative links to repo files, accessible code-block rendering, and the NFR-M4 stale-date banner.
- SQLite driver choice (`better-sqlite3` vs. `node:sqlite` once Node 22 is feasible vs. an ORM like Drizzle) — must build cleanly on macOS / Linux / WSL2.
- Capstone working-tree write strategy — target path resolution, conflict handling on resume (FR-3.7), and a guarantee that `npm run reset-progress` does not touch capstone files (NFR-R3).
- E2E framework choice (Playwright is the default given a11y testing, network-request inspection for no-egress, and golden-path coverage all in one tool — but the call should be explicit).
- Lesson-to-artifact link-integrity test mechanism (CI step beyond E2E? a dedicated `npm run test:links` script? built into Playwright?) — this is load-bearing for Risk #3.
- Accessibility automation surface (`axe-core` via Playwright vs. `@axe-core/playwright` vs. `pa11y` — and what passes/fails CI).
- Folder layout — the codebase's *legibility* is a pedagogical surface; layout should match what Lessons 2–4 point at without contortion.

### Cross-Cutting Concerns Identified

- **Self-reference link integrity** — every relative link from lesson prose to a repo artifact is a tested reference; the test surface spans markdown rendering and the file tree. Broken links fail the pipeline.
- **Accessibility (WCAG AA)** — applies to lesson rendering, navigation, capstone harness, and any interactive content; verified in E2E.
- **No data egress at runtime** — applies to rendering (no CDN'd assets), client bundles (no analytics), and CI verification (network-request inspection).
- **Pedagogical legibility of the codebase** — the architecture is itself part of the curriculum (lessons 2 and 4 point at it); naming and layout choices must read cleanly to a trainee opening files in their editor.
- **Cold-clone-to-running-app under 5 minutes** — cross-platform install, no native-build hangs, no manual config, no remote-asset fetches at first boot.
- **Content freshness signal** — tool-notes with stale-date headers and a >120-day visible flag (NFR-M4); cuts across markdown pipeline, rendering, and content authoring conventions.
- **Two persistence paths** — SQLite for ephemeral progress state, working-tree files for capstone artifacts; reset-progress affects only the former.
- **Dual-role files** — `AGENTS.md`, `.github/copilot-instructions.md`, `.github/CODEOWNERS`, PR template, **`.vela.yml`**, and **`.github/workflows/ci.yml`** are simultaneously **lesson artifacts** (referenced in prose) and **live tool/governance/pipeline config**. Architecture must avoid duplicating them; lessons point at the live files. The two CI pipelines are paired artifacts that demonstrate platform portability the same way `training/tools-reference.md` demonstrates tool portability — neither YAML wrapper is canonical; the npm scripts are.

## Starter Template Evaluation

### Primary Technology Domain

Server-rendered Next.js web application with a clonable reference-repo overlay. Identified from PRD §Web Application Specific Requirements and §Project Context.

### Starter Options Considered

| Option | Outcome | Reasoning |
|---|---|---|
| `create-next-app` (Next.js v16, official) | **Selected** | Official, ecosystem-standard, makes only the architectural decisions we want made. Scaffolds `AGENTS.md` (FR-5.11) for free as a v16 default. |
| `create-t3-app` | Rejected | Bundles auth (NextAuth), tRPC, and Prisma — auth is an explicit non-capability (FR-2.6); tRPC/Prisma are unwarranted at our scale (single 1-table progress store). |
| SaaS boilerplates (Shipfast, Makerkit, Supastarter) | Rejected | Built for multi-tenant SaaS with auth, billing, marketing pages. Adoption would mean removing code before adding curriculum — net negative. |
| Hand-rolled (`npm init` + manual Next.js install) | Rejected | All the work, no lift; reinvents what `create-next-app` standardizes. |

### Selected Starter: `create-next-app` (Next.js v16, App Router)

**Rationale for Selection:**

- Official, conventional, well-maintained — boring-tech principle.
- All defaults align with PRD locks (App Router, npm, Node 20+ compatible) or are sensible upgrades (TypeScript, Tailwind, src/ layout).
- The v16 `AGENTS.md` scaffold satisfies FR-5.11 directly.
- Makes no architectural decisions we'd later need to undo (compared to T3 / SaaS boilerplates).

**Initialization Command (intent — actual mechanics are a story-1 concern):**

```bash
npx create-next-app@latest bmad-portal-scaffold \
  --typescript \
  --tailwind \
  --eslint \
  --app \
  --src-dir \
  --turbopack \
  --import-alias "@/*" \
  --use-npm \
  --yes
```

**Note on in-place scaffolding:** the repo is non-empty (existing `_bmad/`, `_bmad-output/`, `training/`, `docs/`, `LICENSE`, `README.md`, `.gitignore`). The init story scaffolds via a temp directory and merges; the only conflicts are `README.md` and `.gitignore`. The repo's `README.md` is preserved; useful entries from the scaffold's `.gitignore` are merged into the existing one. **React Compiler is intentionally not enabled** for v1 (boring-tech principle; revisit only if NFR-P2 pressures us).

### Architectural Decisions Provided by Starter

**Language & Runtime:**

- TypeScript, strict mode (Next.js v16 default).
- Node 20+ runtime (matches PRD floor; Node 22 LTS works without re-pinning).
- npm (PRD lock).

**Styling Solution:**

- Tailwind CSS — utility-first, paired well with accessible primitive libraries (e.g., shadcn/ui, Radix) if we need them later. Hits WCAG AA contrast targets via tokenized configuration rather than hand-rolled CSS.

**Build Tooling:**

- Turbopack (Next.js v16 stable default) for dev and build. Faster cold-clone-to-running (NFR-P1) than the legacy webpack path.

**Testing Framework:**

- Not provided by `create-next-app` — added in tech decisions step. Anticipated: **Playwright** for E2E (covers golden path, accessibility via `@axe-core/playwright`, and network-request inspection for no-egress in one tool).

**Code Organization:**

- App Router under `src/app/` — co-located route segments, layouts, and server components.
- Repo top-level remains for non-app concerns: `training/` (curriculum markdown), `_bmad/`, `_bmad-output/`, `.github/`, `docs/`. `src/` cleanly demarcates app code from teaching content.

**Development Experience:**

- `npm run dev` (Turbopack), `npm run build`, `npm run lint`, `npm run start` from the starter.
- `npm run reset-progress` and `npm run test:e2e` added by us per FR-6.6.
- ESLint + Next.js's built-in lint rules; Prettier optional, can be added in a follow-up if the team wants opinionated formatting.

**Note:** Project initialization using this command, plus the file-merge mechanics described above, should be the **first implementation story**.

## Core Architectural Decisions

### Decision Priority Analysis

**Critical Decisions (block implementation):**

- Markdown rendering pipeline (lesson content)
- SQLite driver
- E2E test framework
- Lesson-to-artifact link-integrity mechanism
- Capstone artifact write path
- Progress-state persistence path

**Important Decisions (shape architecture):**

- Server-side request validation library
- Routing topology
- API design surface
- State management approach
- Accessibility automation surface
- CI gate composition
- Capstone resume mechanism (FR-3.7)

**Deferred Decisions (post-v1):**

- Prettier adoption (style preference; not load-bearing)
- React Compiler enablement (revisit only if NFR-P2 binds)
- Multi-package-manager support (PRD locks npm-only for v1; v1.1 if adopters press)
- CI enforcement of PR-template story-link field (PRD §FR-6.3 explicitly defers this)

### Data Architecture

| Decision | Choice | Version | Rationale |
|---|---|---|---|
| **SQLite driver** | `better-sqlite3` | ^12.9.0 | Prebuilt binaries for Node 20–25 cover macOS/Linux/WSL2; synchronous API simplifies Server Component / Route Handler code; `node:sqlite` is still experimental in 2026 and requires a CLI flag — fails the boring-tech bar. |
| **ORM / query layer** | **None — hand-written SQL** | — | Single table (`progress`), <10 columns. An ORM (Drizzle/Prisma) is theatre at this scale and adds a lesson distraction (trainees opening `src/db/` see ORM ceremony, not "everything is a file"). |
| **Schema migrations** | **Single inline schema in `src/db/schema.sql`**, applied idempotently on first connection (`CREATE TABLE IF NOT EXISTS …`) | — | No migrations framework needed at v1; schema is stable and tiny. If schema ever evolves, the next person introduces a migration tool with the second migration, not the first. |
| **Progress DB location** | `./data/progress.sqlite` (repo-root, gitignored) | — | Visible to trainees in the file tree (reinforces "everything is a file" from PRD §FR-2.5); `npm run reset-progress` echoes this absolute path on delete. |
| **Capstone artifact location** | `./_bmad-output/capstone/<utc-timestamp>/` (gitignored at the per-trainee level; the directory itself is committed empty with a `.gitkeep` and `README.md`) | — | Pedagogical bonus: trainees see their outputs land *next to* this repo's own `_bmad-output/planning-artifacts/`, reinforcing what BMAD artifacts are. **Reset-progress does not touch this path** (NFR-R3 guarantee, enforced by the script's hardcoded target). |
| **Progress data model** | Single table:<br>`progress(kind TEXT, id TEXT, completed_at TEXT NULL, PRIMARY KEY(kind, id))`<br>Where `kind ∈ {'lesson', 'lab', 'capstone-session', 'capstone-step'}`.<br><br>**Encoding conventions:**<br>• Lessons: `kind='lesson'`, `id='lesson-1'` … `id='lesson-6'`. `completed_at` set on completion.<br>• Labs: `kind='lab'`, `id='solo'` / `'sync'` / `'async-story-review'`. `completed_at` set on completion.<br>• **Capstone session:** `kind='capstone-session'`, `id=<UTC timestamp string matching the artifact directory name>`. **`completed_at IS NULL`** while the session is in progress; set when the trainee finishes all capstone steps.<br>• Capstone steps: `kind='capstone-step'`, `id='<session-timestamp>/<step-name>'` (e.g., `'20260507T143022Z/brief'`, `'…/epic'`, `'…/story-1'`, `'…/story-2'`, `'…/adr'`). Each step's `completed_at` is set on save. | — | Smallest model satisfying FR-2.1 / 2.2 / 2.3 **and** FR-3.7 (resume). One table, one storage idiom; no JSON blobs, no separate sessions table. The capstone-session row's `id` is the same timestamp as the artifact directory — the file tree and the database speak the same language to the trainee. |
| **Server-side validation** | **Zod** | ^3.x latest | Server-only validation (no client bundle hit); ecosystem default; Valibot's bundle-size win is irrelevant when validation lives on the server. |

### Authentication & Security

| Decision | Choice | Rationale |
|---|---|---|
| **Authentication** | **None** | Per PRD §FR-2.6: explicit non-capability. No users table, no sessions, no SSO. Architecture trusts the local user. |
| **Authorization** | **None** | Same as above. |
| **CSRF / CSP / CORS** | Default Next.js App Router posture; no public exposure | Local-only; the threat model is "the trainee runs their own clone." We do not invent auth-shaped concerns. |
| **No-egress verification** | **Playwright network-request interception** (`page.route()` recording all outbound requests on the trainee golden path; the test fails the pipeline if any request leaves the local origin) | Direct mitigation for NFR-S1 — testable, not a posture statement. |
| **Dependency scanning** | `npm run audit` runs `npm audit --audit-level=high` and is invoked by both bundled pipelines; high or critical findings fail the pipeline, moderate findings tracked. **Adopting teams using a different CI** translate the same `npm run audit` invocation into their platform's syntax. | NFR-S3. The bar is enforceable via `npm run audit`; the bundled pipelines (Vela + GHA) gate it on PR by default; teams on other platforms wrap the same script. |

### API & Communication Patterns

| Decision | Choice | Rationale |
|---|---|---|
| **API style** | **Next.js App Router Route Handlers** under `src/app/api/`; a tiny REST surface | OpenAPI / GraphQL / tRPC are all theatrical at this scale (one resource, two verbs). Route Handlers keep the whole app in one process per PRD lock. |
| **Endpoints (v1)** | Two POST Route Handlers, period:<br>• `POST /api/progress` — mark a lesson / lab / capstone-step / capstone-session as complete or active.<br>• `POST /api/capstone/save` — write a capstone artifact to the working tree.<br>**Reads** happen in Server Components directly via the SQLite driver — no GET endpoint.<br>**`npm run reset-progress`** deletes `./data/progress.sqlite` directly via the script — no endpoint involved. | Smallest possible surface satisfying FR-2 and FR-3. No phantom endpoints listed; what's documented is what exists. |
| **Mutation idiom** | **Route Handlers for all mutations.** No Server Actions in v1. | Pedagogical legibility (cross-cutting concern §Pedagogical legibility): a trainee opening `src/app/api/progress/route.ts` sees "this is the endpoint" matching the URL `POST /api/progress`, with no hidden indirection. Server Actions live inside component files, where route → file mapping isn't legible at a glance. The teaching surface wins; we forgo Server Action ergonomics to keep the architecture inspectable. |
| **Error model** | Plain `Response.json({ error: '…' }, { status: … })`; client surfaces a toast on non-2xx | No global error middleware; no error catalog; one app, two endpoints — simplest thing that works. |

### Frontend Architecture

| Decision | Choice | Rationale |
|---|---|---|
| **Rendering model** | **Server Components by default**; client components only for interactivity (lesson-complete button, capstone form, lesson sidebar toggle) | Aligns with PRD §Web Application Specific Requirements (server-rendered, screen-reader-friendly DOM, deep-linkable URLs). Minimizes client bundle for NFR-S1 (less to scrutinize for egress) and NFR-A1 (rendered HTML is auditable). |
| **Markdown pipeline** | **`remark` + `remark-rehype` + `rehype` plugins in a Server Component** (no MDX). Plugins: `remark-gfm` (tables, footnotes), `rehype-slug` + `rehype-autolink-headings` (deep links per FR-1.3), `rehype-pretty-code` or `rehype-shiki` (accessible syntax highlighting), a custom plugin to verify relative links resolve to existing files at request time (dev-only warning). | Plain markdown stays plain markdown — preserves the brief's "readable in editor when portal is broken" property and keeps NFR-M1 (any teammate can author content) honest. MDX is rejected explicitly: it would let an author embed JSX and break the resilience claim. |
| **Stale-date banner** | A small Server Component (`<StalenessBanner reviewedAt={…} />`) that renders inline above content with a `Last reviewed YYYY-MM-DD; flagged as stale` warning if `now - reviewedAt > 120 days`. Reads the date from frontmatter on each tool-notes section file. | NFR-M4 verbatim; no hidden mechanism — frontmatter, banner, done. |
| **State management** | **React local state + Server Components**; no Redux/Zustand/Jotai | Smallest interactive surface. Server Components handle reads from SQLite directly; mutations go through Route Handlers; the only client state is "is the sidebar open" and "is this button disabled while saving." |
| **Routing topology** | App Router routes:<br>`/` (home: three audience-entry cards)<br>`/start-here` → renders `training/00-start-here.md`<br>`/stakeholder` → renders `training/stakeholder-demo-script.md`<br>`/facilitator` → renders `training/facilitator-guide.md`<br>`/lessons/[slug]` → renders `training/lessons/<slug>.md`<br>`/labs/[slug]` → renders `training/labs/<slug>.md`<br>`/capstone` (overview + resume/start)<br>`/capstone/[step]` (each capstone step) | Direct mapping `URL → markdown file` keeps the codebase legible (cross-cutting concern §Pedagogical legibility); deep-linkable per FR-1.3; matches the markdown source layout one-to-one. |
| **Capstone resume mechanism (FR-3.7)** | On a visit to `/capstone`:<br>1. Query the most recent `capstone-session` row by `id DESC`.<br>2. If it exists and `completed_at IS NULL` → **resume** it; render the next incomplete step.<br>3. If it exists and `completed_at IS NOT NULL`, **or** no session exists → **offer to start a new session**, which inserts a fresh `capstone-session` row with `id = <new UTC timestamp>` and creates `_bmad-output/capstone/<that-timestamp>/`.<br>4. Multiple historical sessions are visible on disk (`_bmad-output/capstone/*`) and in the DB; the trainee can re-enter an older session by URL (`/capstone?session=<timestamp>`) but the home `/capstone` route always offers the most-recent-or-new path. | Reuses the existing `progress` table — no schema additions, no rename ceremony. The dated directory name **is** the session id; what's on disk and what's in the DB stay synchronized by construction. Trainees see BMAD-style dated paths in `_bmad-output/capstone/` and recognize them as the same dating convention used elsewhere in `_bmad-output/`. |
| **UI primitives** | Tailwind utility classes + a small set of accessible Radix primitives (`@radix-ui/react-*`) for any non-trivial interactive widget (dialogs, popovers, disclosure). No design-system library. | Radix gives us WCAG AA-grade keyboard/aria semantics for free; Tailwind handles styling. Avoids hand-rolling accessibility for the few interactive bits we have. |
| **Fonts and assets** | All fonts and assets **vendored locally** (no Google Fonts CDN, no external image hosts) | NFR-S1 — no egress at runtime. Easier to verify in the network-interception test. |

### Infrastructure & Deployment

| Decision | Choice | Rationale |
|---|---|---|
| **Hosting** | **Local-only** — `npm run dev` for the trainee, `npm run start` for production-mode local | PRD lock; no deploy target. |
| **CI/CD** | **Two paired pipeline files at the repo root, both running the same npm scripts:**<br>• `.vela.yml` — the team's primary CI (Target's Vela platform).<br>• `.github/workflows/ci.yml` — the **maintained mirror** so any GitHub fork has a running pipeline without requiring self-hosted Vela infrastructure.<br><br>Both pipelines run, in order: `npm run lint` → `tsc --noEmit` (typecheck) → `npm run audit` → `npm run lint:links` → `npm run test:unit` → `npm run test:e2e`.<br><br>**Maintenance invariant: if `.vela.yml` and `.github/workflows/ci.yml` check different things, that's a bug.** The two files MUST stay synchronized on what they check; they may differ only in YAML wrapper syntax. A drift between them is a defect to be filed and fixed.<br><br>**Adopting teams on GitLab CI, Jenkins, CircleCI, etc.** translate the same npm-script invocations into their platform's syntax. The npm scripts are the portable layer; the YAML wrappers are the example translations. | Two pipelines demonstrate platform portability *in practice* — the same way the curriculum's four named tools demonstrate tool portability. With Vela + GHA side by side, trainees see at a glance that neither YAML wrapper is canonical; the npm scripts are the actual portable contract. GHA also gives any GitHub-fork adopter a running pipeline without needing Vela infrastructure. |
| **Cross-platform verification** | **Manual pre-release checklist item** on macOS, Linux, and Windows-via-WSL2 | Cross-platform install is a release gate (Technical Success); the responsibility for running it sits with the maintainer, not a CI matrix. Both bundled pipelines run on Linux only by default. |
| **Environment configuration** | **No `.env` for v1** — all config is convention (paths) or hardcoded. If a v1.1 need surfaces (e.g., custom progress DB path), introduce `.env.local` with documented keys. | NFR-S1 / NFR-S2 — no secrets to manage; no remote services to point at. |
| **Logging** | Console only (Next.js default); no Sentry, no telemetry | NFR-S1. Errors are visible in the dev terminal; production-mode logs are local. |
| **Observability** | None at v1 | Local-only; no uptime requirement (NFR-R4). |

### Test Strategy

| Decision | Choice | Rationale |
|---|---|---|
| **E2E framework** | **Playwright** | Highest 2026 adoption (45.1%), faster than Cypress, `@axe-core/playwright` auto-injects, built-in `page.route()` for no-egress verification, native multi-browser. One tool for golden path + a11y + network interception. |
| **Unit/integration tests** | **Vitest** for pure functions (markdown pipeline plugins, validation schemas, the staleness check). No React-component-level tests at v1 | Most app logic is Server Component data flow + Playwright covers UX. Vitest is the lightweight default; component tests would duplicate Playwright coverage. |
| **Accessibility automation** | `@axe-core/playwright` run on each route in the trainee golden path; **AA-level rule violations fail the pipeline** | NFR-A2. Auto-injection means no `injectAxe()` boilerplate. |
| **Lesson-to-artifact link-integrity** | **Two-layer:**<br>1. Static scan (`npm run lint:links`): a Node script in `scripts/check-links.ts` walks every `*.md` in `training/` and resolves relative links against the working tree; fails on any missing target. Fast, deterministic, cheap to keep green.<br>2. Playwright DOM check: navigates each lesson route and asserts every `<a href="…">` resolves to an existing file (catches rendering-layer breakage where the DOM diverges from the markdown source). | Risk #3 mitigation. The static scan catches the 95% case (author typos); Playwright catches the rendering-layer regression case. Both fail the pipeline on regression. |
| **No-egress test** | A dedicated Playwright spec that walks the golden path with `page.route('**/*', …)` recording outbound requests; **fails the pipeline if any request targets a non-`localhost` origin** | NFR-S1 verbatim. |

### Folder Layout (preview — formalized in step-06)

```
bmad_demo/
  _bmad/                       # BMAD scaffolding (existing)
  _bmad-output/
    planning-artifacts/        # PRD, brief, this architecture (existing)
    capstone/                  # capstone outputs (created by capstone harness)
  .github/
    CODEOWNERS                 # FR-6.1
    pull_request_template.md   # FR-6.3
    workflows/
      ci.yml                   # lint, typecheck, audit, links, E2E
    branch-protection-notes.md # FR-6.2
    copilot-instructions.md    # FR-5.12 — Copilot-specific tool config
  AGENTS.md                    # FR-5.11 — shared agent context (scaffolded by create-next-app v16)
  src/
    app/                       # Next.js App Router
      page.tsx                 # home / three audience cards
      start-here/page.tsx
      stakeholder/page.tsx
      facilitator/page.tsx
      lessons/[slug]/page.tsx
      labs/[slug]/page.tsx
      capstone/page.tsx
      capstone/[step]/page.tsx
      api/
        progress/route.ts
        capstone/save/route.ts
    components/                # client + server components
    lib/
      markdown/                # remark/rehype pipeline
      db/                      # better-sqlite3 connection + queries
      capstone/                # working-tree write helpers
    db/
      schema.sql
  data/
    .gitkeep                   # progress.sqlite lives here at runtime, gitignored
  training/                    # all curriculum content (existing scaffold)
    00-start-here.md
    stakeholder-demo-script.md
    facilitator-guide.md
    lead-review-checklist.md   # FR-5.3
    team-rituals-checklist.md  # FR-5.6
    tools-reference.md         # FR-5.5
    story-template.md          # FR-5.10
    lessons/
    labs/
  scripts/
    reset-progress.ts          # FR-2.5
    check-links.ts             # link-integrity static scan
  tests/
    e2e/                       # Playwright specs
    unit/                      # Vitest specs
  docs/                        # existing — for any operator/maintainer docs
  README.md                    # FR-6.4
  LICENSE                      # MIT (existing)
  package.json
  tsconfig.json
  next.config.ts
```

### Decision Impact Analysis

**Implementation sequence (rough order):**

1. Scaffold (run `create-next-app` per step-03; merge with existing files).
2. Folder structure + empty placeholders for `src/lib/markdown`, `src/lib/db`, `scripts/`.
3. SQLite driver + schema + progress API route.
4. Markdown rendering pipeline + lesson route.
5. Audience entry pages (start-here / stakeholder / facilitator).
6. Capstone harness (multi-step form + working-tree write + resume mechanism).
7. `.github/` artifacts (CODEOWNERS, PR template, branch-protection notes, Copilot instructions) and the paired CI pipelines (`.vela.yml` + `.github/workflows/ci.yml`).
8. E2E test suite (golden path → a11y → no-egress).
9. Link-integrity static scan + Playwright DOM check.
10. Curriculum content (lessons, labs, reference, capstone steps) — content-heavy, lands in parallel with later code stories.

**Cross-component dependencies:**

- The markdown pipeline must be in place **before** any lesson can be authored or tested.
- The link-integrity scan's correctness depends on the markdown pipeline's link-rendering convention staying stable (relative paths preserved as relative); a regression in the pipeline that mangles links would falsely pass the static scan but fail the Playwright DOM check. Both are needed.
- The capstone harness depends on a stable storage convention (`_bmad-output/capstone/<timestamp>/`) that `npm run reset-progress` is **explicitly told not to touch**. Reset-progress's hardcoded target is `./data/progress.sqlite`, period.
- The capstone resume mechanism depends on the `capstone-session` row's `id` matching the on-disk directory name exactly — they're produced from the same UTC timestamp at session-create time and never re-derived independently.
- `AGENTS.md` is scaffolded by `create-next-app` v16 *and* referenced by lessons — the curriculum-side reference can land any time after scaffold.

## Implementation Patterns & Consistency Rules

### Conflict-Point Audit

Most "naming and structure" conflict points are pre-resolved by Next.js App Router conventions and the decisions in step 4. The patterns below codify only the calls that **could vary between agents** and where consistency matters more than absolute correctness. The principle: rule of three before abstraction — if a pattern applies to fewer than three places, the example *is* the rule.

### Naming Patterns

**Database (`progress` table — the only table):**

- Table names: **lowercase singular noun** (`progress`). Plural-vs-singular is irrelevant at one table; the rule is "match what's there."
- Column names: **lowercase `snake_case`** (`completed_at`, not `completedAt`). Standard SQL convention; readable in raw SQL queries that lessons may quote.
- The `kind` column uses **kebab-case string literals** (`'capstone-session'`, `'capstone-step'`); enforced by Zod enum at the application boundary, not by SQL `CHECK` (we don't want a schema migration the first time we add a kind).

**API & URLs:**

- Routes: **kebab-case path segments** (`/start-here`, `/api/capstone/save`). Matches Next.js convention and reads naturally as URLs.
- HTTP methods: only `GET` (Server Components handle reads — no API GETs) and `POST` (mutations). No `PUT`/`PATCH`/`DELETE` in v1; if a future need surfaces, the *delete* primitive lives in a script (`reset-progress`), not an endpoint.
- Route Handler files: always `route.ts` per App Router; one handler per file.
- Request bodies and JSON responses: **camelCase keys** (`{ kind, id, completedAt }`). TypeScript-ecosystem default; matches in-memory variable names so there's no transformation layer.
- Status codes: `200` for successful POST that doesn't create a new resource (e.g., upsert progress), `201` for successful POST that *does* create one (e.g., new capstone session), `400` for Zod validation failures, `500` for unexpected. No `204`, no `409`, no surprises.

**Code (TypeScript / React):**

- Files containing a default-exported React component: **`PascalCase.tsx`** (`LessonNav.tsx`).
- Files containing utilities, hooks, or non-component modules: **`kebab-case.ts`** (`progress-db.ts`, `markdown-pipeline.ts`).
- App Router page/layout/route files: keep their Next-mandated names exactly (`page.tsx`, `layout.tsx`, `route.ts`, `not-found.tsx`).
- React components: **PascalCase** (`LessonNav`, `StalenessBanner`).
- Functions and variables: **camelCase** (`getRecentCapstoneSession`).
- Constants exported from a module: **UPPER_SNAKE_CASE** (`PROGRESS_DB_PATH`, `CAPSTONE_DIR`).
- Types and interfaces: **PascalCase**, no `I`-prefix or `T`-suffix (`ProgressEntry`, not `IProgressEntry`).

### Structure Patterns

**Where things live:**

- Server Components live in `src/app/**/page.tsx` (or `layout.tsx`). Don't add a parallel `src/server-components/` tree.
- Client Components: by default, co-locate in the same directory as the page that uses them (e.g., `src/app/lessons/[slug]/lesson-complete-button.tsx`). Promote to `src/components/` **only after the rule of three** — when at least three pages reuse it.
- Pure utilities and library code live under `src/lib/<domain>/` (e.g., `src/lib/markdown/`, `src/lib/db/`, `src/lib/capstone/`). One folder per domain; no top-level `utils/` grab-bag.
- Scripts (Node-executable, not part of the Next.js process): `scripts/<kebab-name>.ts`, run via `tsx scripts/<name>.ts` or wired through `package.json` scripts.
- Tests: **co-located unit tests** (`foo.ts` + `foo.test.ts` side by side under `src/`); **E2E tests** centralized in `tests/e2e/`. Vitest discovers `*.test.ts` anywhere under `src/`; Playwright discovers under `tests/e2e/`.

**Where things do NOT go:**

- No `src/types/` global type dump. Types live next to the code that owns them; cross-cutting types live in the module that produces them.
- No `src/constants/` global constants dump. Constants live next to their users; promote only when reused across three+ modules.
- No `src/services/` or `src/repositories/` ceremony. The DB layer is `src/lib/db/`; the markdown layer is `src/lib/markdown/`. Domain folders, not architectural layer folders.

### Format Patterns

**Request/response shapes:**

- Request body for `POST /api/progress`: `{ kind: 'lesson' | 'lab' | 'capstone-session' | 'capstone-step', id: string, completed: boolean }`. Validated by a Zod schema named `ProgressUpsertRequest` exported from `src/lib/db/schemas.ts`.
- Request body for `POST /api/capstone/save`: `{ session: string, step: 'brief' | 'epic' | 'story-1' | 'story-2' | 'adr', content: string }`. Validated by `CapstoneSaveRequest`.
- Successful response shape: `{ ok: true, ...resourceData }` — top-level `ok: true` so the client can branch on a single field, not on HTTP status alone.
- Error response shape: `{ ok: false, error: string, details?: unknown }`. `details` is set only for Zod validation errors; never includes server-side stack traces.
- Date format in JSON: **ISO 8601 strings** (`'2026-05-07T14:30:22Z'`). The `completed_at` column stores ISO strings (TEXT); never Unix timestamps.
- Capstone session id format: **compact UTC** (`20260507T143022Z` — no dashes, no colons). It's both a SQLite `id` value and a directory name; the format chosen avoids filesystem-unsafe characters across macOS/Linux/WSL2.

**Markdown frontmatter conventions:**

- All `training/**/*.md` files MAY carry frontmatter; lesson-renderable files MUST carry at least `title`. The renderer treats missing frontmatter as `{}`.
- Tool-notes section files MUST carry `reviewedAt: 'YYYY-MM-DD'` and `verifiedVersions: '<text>'` per FR-5.5 / NFR-M4. Missing `reviewedAt` is treated as "stale" and triggers the banner.

### Communication Patterns

**State updates (client side):**

- Client mutations follow this exact sequence: optimistic local state → `fetch` POST → on success no-op → on failure revert local state and show toast. No retry-with-backoff; the user re-clicks if they want to.
- No event bus, no pub/sub, no global state library. The interactive surface is small enough that prop drilling and Server Components cover it.

**Logging:**

- Server-side: `console.log(...)` for happy-path traces (gated by `NODE_ENV === 'development'` if noisy), `console.error(...)` for errors with full stack. **No logger library** at v1 — adding `pino`/`winston` is the kind of premature plumbing trainees see and copy.
- Client-side: `console.error` only on unexpected; user-facing errors go to a toast, never to `console.log`.

### Process Patterns

**Error handling:**

- Server: Route Handlers wrap their body in `try { … } catch (e) { console.error(e); return Response.json({ ok: false, error: 'Internal error' }, { status: 500 }); }`. Validation errors return 400 with `details` populated by `error.flatten()`.
- Server Components: let errors bubble to the route's `error.tsx` boundary; don't `try`/`catch` defensively. Next.js renders `error.tsx`; we provide one global `src/app/error.tsx` and don't proliferate per-segment ones unless a real difference in recovery emerges (rule of three).
- Client mutations: on non-2xx, surface a single toast; the user re-attempts manually.
- A trainee who hits an error that the toast can't recover from is told (in the toast or `error.tsx`): "If progress is corrupted, run `npm run reset-progress`." This is the documented escape hatch (NFR-R3).

**Loading states:**

- Server Components stream — Next.js handles loading via `loading.tsx`. We add `loading.tsx` only when the parent route's data fetching is visibly slow; otherwise the default suffices.
- Client mutation pending state: a single boolean (`isSaving`) on the component; the trigger button is `disabled` while pending. No skeleton screens, no global progress bar.

**Validation timing:**

- Always at the server boundary (Route Handlers parse request bodies through Zod). **No client-side mirror** of the schema; if the server rejects, the toast says so. The cost of duplicating schemas (drift between client and server) outweighs the round-trip latency at our scale.

### Patterns the Architecture Deliberately Does NOT Define

A future contributor may be tempted to introduce these — they're explicitly out of v1 scope:

- A logger library, a metrics library, a tracing library.
- A global error catalog or error-code enum.
- A response-envelope abstraction beyond `{ ok, error?, details? }`.
- A repository / service / DAO layer over `src/lib/db/`.
- A custom React hook for fetch state (`useApi`, `useMutation`); inline `useState` covers the v1 use cases.
- A feature-flag mechanism.
- An i18n framework — content is English-only at v1.

Each is a **rule-of-three trip-wire**: introduce only when at least three concrete usages demand it. Listing them here is the expected nudge for the next contributor who's about to introduce one.

### Enforcement

- **TypeScript strict mode + ESLint** enforce most code-style rules at CI time.
- **Zod schemas at API boundaries** enforce the request/response format rules at runtime.
- **Naming conventions** are not auto-enforced beyond what ESLint covers; reviewers (per CODEOWNERS) hold the line. This is consistent with the PRD's thesis: the human-at-the-gate is the enforcement layer for things that auto-tooling can't fully encode.

### Examples

**Good — a Route Handler that follows the patterns:**

```ts
// src/app/api/progress/route.ts
import { ProgressUpsertRequest } from '@/lib/db/schemas';
import { upsertProgress } from '@/lib/db/progress-db';

export async function POST(req: Request) {
  const parsed = ProgressUpsertRequest.safeParse(await req.json());
  if (!parsed.success) {
    return Response.json(
      { ok: false, error: 'Invalid request', details: parsed.error.flatten() },
      { status: 400 },
    );
  }
  try {
    upsertProgress(parsed.data);
    return Response.json({ ok: true });
  } catch (e) {
    console.error(e);
    return Response.json({ ok: false, error: 'Internal error' }, { status: 500 });
  }
}
```

**Anti-pattern — what NOT to do:**

```ts
// DON'T: client-side schema mirror that drifts
// DON'T: response envelope { data, meta, error: null } (we use { ok, ... })
// DON'T: try/catch in a Server Component (let it bubble to error.tsx)
// DON'T: a logger import at v1 (use console.error)
```

## Project Structure & Boundaries

### Complete Project Directory Structure

```
bmad_demo/
├── _bmad/                          # BMAD scaffolding (existing — do not modify)
├── _bmad-output/
│   ├── planning-artifacts/         # PRD, brief, architecture, epics-and-stories
│   │   ├── prd.md                  # (existing)
│   │   ├── product-brief-bmad_demo.md      # (existing)
│   │   ├── product-brief-bmad_demo-distillate.md  # (existing)
│   │   └── architecture.md         # this document
│   └── capstone/                   # trainee-produced capstone artifacts
│       ├── README.md               # explains the timestamp directories
│       └── .gitkeep                # per-session subdirs are gitignored
├── .github/
│   ├── CODEOWNERS                  # FR-6.1 — @product-engineers / @engineering-leads / @product-leads
│   ├── pull_request_template.md    # FR-6.3 — story-link field, no CI enforcement
│   ├── branch-protection-notes.md  # FR-6.2 — setup notes for adopting teams
│   ├── copilot-instructions.md     # FR-5.12 — Copilot-specific tool config (also a lesson artifact)
│   └── workflows/
│       └── ci.yml                  # GHA mirror pipeline — runs the same npm scripts as .vela.yml
├── src/
│   ├── app/
│   │   ├── globals.css             # Tailwind base + minimal global styles
│   │   ├── layout.tsx              # root layout (Tailwind, vendored fonts, no remote assets)
│   │   ├── page.tsx                # home — three audience-entry cards (FR-1.1)
│   │   ├── error.tsx               # global error boundary (per Patterns §Process)
│   │   ├── not-found.tsx           # 404
│   │   ├── start-here/
│   │   │   └── page.tsx            # FR-1.6 trainee entry; renders training/00-start-here.md
│   │   ├── stakeholder/
│   │   │   └── page.tsx            # FR-1.6 stakeholder demo path; renders training/stakeholder-demo-script.md
│   │   ├── facilitator/
│   │   │   └── page.tsx            # FR-1.7 facilitator entry; renders training/facilitator-guide.md
│   │   ├── lessons/
│   │   │   └── [slug]/
│   │   │       ├── page.tsx        # FR-1.2/1.3 lesson rendering with sequential nav
│   │   │       └── lesson-complete-button.tsx  # client component (co-located, rule-of-three not yet hit)
│   │   ├── labs/
│   │   │   └── [slug]/
│   │   │       └── page.tsx        # FR-4 lab rendering
│   │   ├── capstone/
│   │   │   ├── page.tsx            # FR-3.1/3.7 — resume-or-start
│   │   │   └── [step]/
│   │   │       ├── page.tsx        # FR-3.2-3.5 — one of brief/epic/story-1/story-2/adr
│   │   │       └── capstone-step-form.tsx  # client component (co-located)
│   │   └── api/
│   │       ├── progress/
│   │       │   └── route.ts        # POST — upsert progress (FR-2.1/2.2/2.3)
│   │       └── capstone/
│   │           └── save/
│   │               └── route.ts    # POST — write capstone artifact to working tree (FR-3.6)
│   ├── components/                 # promoted (rule-of-three) shared components
│   │   ├── lesson-nav.tsx          # used in /lessons + /labs + /capstone
│   │   ├── audience-card.tsx       # 3x on home page — promoted
│   │   └── staleness-banner.tsx    # NFR-M4 — used by tool-notes sections
│   └── lib/
│       ├── markdown/
│       │   ├── pipeline.ts         # remark + rehype configuration
│       │   ├── pipeline.test.ts    # Vitest co-located
│       │   ├── frontmatter.ts      # YAML frontmatter parser
│       │   └── render.tsx          # Server Component <Markdown source={…} />
│       ├── db/
│       │   ├── connection.ts       # better-sqlite3 singleton; loads schema.sql on first connect
│       │   ├── progress-db.ts      # upsertProgress, getProgress, getRecentCapstoneSession
│       │   ├── progress-db.test.ts
│       │   ├── schemas.ts          # Zod: ProgressUpsertRequest, CapstoneSaveRequest
│       │   └── schema.sql          # CREATE TABLE IF NOT EXISTS progress (...)
│       └── capstone/
│           ├── paths.ts            # CAPSTONE_DIR, sessionDir(timestamp), stepFile(...)
│           ├── write-artifact.ts   # working-tree FS write
│           └── write-artifact.test.ts
├── data/
│   └── .gitkeep                    # progress.sqlite created here at runtime; gitignored
├── training/                       # all curriculum content (plain markdown — FR-5.1)
│   ├── 00-start-here.md            # (existing skeleton)
│   ├── stakeholder-demo-script.md
│   ├── facilitator-guide.md
│   ├── lead-review-checklist.md    # FR-5.3 — pinnable PR-review checklist artifact
│   ├── team-rituals-checklist.md   # FR-5.6 — one-page post-capstone reinforcement
│   ├── tools-reference.md          # FR-5.5 — per-tool friction notes (carries reviewedAt frontmatter)
│   ├── story-template.md           # FR-5.10 — canonical BMAD story template
│   ├── lessons/
│   │   ├── 1-what-is-bmad.md
│   │   ├── 2-the-artifact-chain.md
│   │   ├── 3-stories-as-contract.md
│   │   ├── 4-codeowners-and-the-gate.md   # produces the lead-review-checklist artifact
│   │   ├── 5-working-as-a-team.md         # five named recovery loops (FR-5.4)
│   │   └── 6-capstone.md
│   └── labs/
│       ├── solo.md
│       ├── sync.md
│       └── async-story-review.md
├── scripts/
│   ├── reset-progress.ts           # FR-2.5 — deletes data/progress.sqlite, echoes path
│   └── check-links.ts              # static link-integrity scan (NFR-R2)
├── tests/
│   └── e2e/                        # Playwright specs
│       ├── golden-path.spec.ts     # NFR-R1
│       ├── accessibility.spec.ts   # NFR-A2 — axe-core on each route
│       ├── link-integrity.spec.ts  # NFR-R2 — DOM-side link check
│       ├── no-egress.spec.ts       # NFR-S1 — page.route() outbound interception
│       ├── progress-and-reset.spec.ts
│       └── capstone-flow.spec.ts   # FR-3 — multi-step + resume
├── public/                         # vendored static assets (no remote URLs)
│   └── fonts/                      # locally hosted fonts per NFR-S1
├── .gitignore                      # merged from create-next-app + repo-existing
├── .vela.yml                       # primary CI pipeline (Vela) — paired with .github/workflows/ci.yml
├── eslint.config.mjs               # ESLint flat-config; from create-next-app v16
├── .nvmrc                          # Node 20 floor pin (advisory)
├── README.md                       # FR-6.4 — maintainer, install, audiences, bus-factor note
├── LICENSE                         # MIT (existing)
├── AGENTS.md                       # FR-5.11 — shared agent context (scaffolded by create-next-app v16; also a lesson artifact)
├── next.config.ts
├── package.json                    # FR-6.6 scripts: dev, build, start, lint, test:e2e, test:unit, lint:links, audit, reset-progress
├── playwright.config.ts
├── postcss.config.mjs              # Tailwind
├── tailwind.config.ts
├── tsconfig.json
└── vitest.config.ts
```

**`.gitignore` adds (merged into existing):**

```
node_modules/
.next/
data/*.sqlite
data/*.sqlite-journal
_bmad-output/capstone/[0-9]*/      # per-session artifact dirs are local to each trainee
playwright-report/
test-results/
```

**Note on the existing empty `docs/` directory:** the working tree currently contains an empty `docs/` folder. The init story should remove it; a top-level `docs/` is added back only when the first operator-doc lands (rule of one for top-level dirs).

### Architectural Boundaries

**API boundaries (the entire surface):**

- `POST /api/progress` — request body validated by `ProgressUpsertRequest`; idempotent upsert into the `progress` table. Returns `{ ok: true }` on success, `{ ok: false, error, details? }` otherwise.
- `POST /api/capstone/save` — request body validated by `CapstoneSaveRequest`; writes `_bmad-output/capstone/<session>/<step>.md` and upserts the corresponding `capstone-step` row. Returns `{ ok: true, path }` on success.
- **No other endpoints.** Reads are Server Components calling `src/lib/db/progress-db.ts` directly.

**Component boundaries:**

- **Server Components** read from `src/lib/db/*` and `src/lib/markdown/*` synchronously (better-sqlite3 + node:fs). They do not import from `src/app/api/*`.
- **Client Components** (`"use client"`) never import from `src/lib/db/*` (would leak server-only code into the bundle). They only call `fetch('/api/...')` for mutations.
- **Library boundary:** `src/lib/<domain>/` modules do not import from `src/app/*`. The dependency direction is one-way: app → lib.
- **Script boundary:** `scripts/*.ts` are run via `tsx`, never imported by the Next.js process. They may import from `src/lib/db/` for path constants but should not pull in the full Next.js runtime.

**Data boundaries:**

- **SQLite** is the only persistence for progress state — `data/progress.sqlite`.
- **Working-tree filesystem** is the only persistence for capstone artifacts — `_bmad-output/capstone/<session>/`.
- **Markdown content** is read-only at runtime; the app never writes to `training/`.
- **No caching layer.** Lesson markdown is re-read on each request (cheap; SQLite + fs are local). If NFR-P2 ever binds, in-process memoization is the first lever, not a cache library.

**Open schema-design point (resolved in the FR-3 implementation story):**

FR-3.7 resume requires the schema to **represent active-session state explicitly**, not just completions. The `progress` table's name implies "progress made" — naively, a reader could assume the table only stores completions. The story author writing FR-3 must choose how to represent an in-progress session. Three viable shapes:

1. **Nullable `completed_at`** on the existing `progress` table, where `kind='capstone-session'` rows with `completed_at IS NULL` mean "active." Pros: one table; cons: overloads `completed_at` semantics for one kind.
2. **A separate `capstone_sessions` table** with explicit `started_at` / `completed_at` columns. Pros: clean semantics; cons: a second table for one feature.
3. **A distinct `kind` value** with the active-state encoded in the row's existence (e.g., `kind='capstone-session-active'` flips to `kind='capstone-session-complete'` on finish). Pros: no nullable column; cons: a kind transition feels awkward.

The architecture **does not pick** between these. It requires only that the chosen shape be queryable by *"most recent active session"* and *"is this session complete?"* in O(1) — and that whichever choice lands also decides how `getRecentCapstoneSession()` is implemented in `src/lib/db/progress-db.ts`. Flagged here so the story author owns the call deliberately rather than tripping over it mid-implementation.

### Requirements-to-Structure Mapping

**FR-1 Curriculum Navigation & Audience Entry → `src/app/`:**

| FR | Lives in |
|---|---|
| FR-1.1 home with three entry cards | `src/app/page.tsx` + `src/components/audience-card.tsx` |
| FR-1.2 sequential six-lesson navigation with completion state | `src/app/lessons/[slug]/page.tsx` + `src/components/lesson-nav.tsx` reading `progress` table |
| FR-1.3 deep-linkable lesson/lab/capstone URLs | App Router file-based routes (no work — falls out of structure) |
| FR-1.4 forward/backward via browser nav preserves state | Server Components (no client-side router state) |
| FR-1.5 lesson prose links to relative repo paths | `src/lib/markdown/pipeline.ts` rehype plugins preserve relative `href` |
| FR-1.6 stakeholder entry; FR-1.7 facilitator entry | `src/app/stakeholder/page.tsx`, `src/app/facilitator/page.tsx` |

**FR-2 Trainee Progress State → `src/lib/db/` + `src/app/api/progress/`:**

| FR | Lives in |
|---|---|
| FR-2.1/2.2/2.3 mark complete (lessons/labs/capstone) | `src/app/api/progress/route.ts` → `src/lib/db/progress-db.ts:upsertProgress` |
| FR-2.4 persistence in SQLite | `src/lib/db/connection.ts` opens `data/progress.sqlite` |
| FR-2.5 `npm run reset-progress` | `scripts/reset-progress.ts`; wired in `package.json` |
| FR-2.6 (non-capability) no auth | enforced by absence: no `users` table, no auth code anywhere |

**FR-3 Capstone Harness → `src/app/capstone/` + `src/lib/capstone/`:**

| FR | Lives in |
|---|---|
| FR-3.1 capstone start | `src/app/capstone/page.tsx` (resume-or-start logic) |
| FR-3.2/3.3/3.4/3.5 produce brief/epic/stories/ADR | `src/app/capstone/[step]/page.tsx` + `capstone-step-form.tsx` |
| FR-3.6 artifacts saved to working tree | `src/app/api/capstone/save/route.ts` → `src/lib/capstone/write-artifact.ts` |
| FR-3.7 resume from last completed step | `src/lib/db/progress-db.ts:getRecentCapstoneSession` + `src/app/capstone/page.tsx` (schema shape per the open design point above) |

**FR-4 Lab Facilitation → `training/labs/` + `src/app/labs/`:**

| FR | Lives in |
|---|---|
| FR-4.1/4.2/4.3 three lab formats | three markdown files under `training/labs/` |
| FR-4.4 facilitator selects format | covered in `training/facilitator-guide.md` content + UI option in `src/app/facilitator/page.tsx` |

**FR-5 Curriculum Content → `training/`:**

| FR | Lives in |
|---|---|
| FR-5.1 plain markdown rendered at request | `training/**/*.md` + `src/lib/markdown/pipeline.ts` |
| FR-5.2 lesson-to-artifact concrete linking | enforced by `scripts/check-links.ts` + Playwright DOM check |
| FR-5.3 lead-review-checklist artifact | `training/lead-review-checklist.md` (referenced by lesson 4) |
| FR-5.4 five recovery loops in lesson 5 | `training/lessons/5-working-as-a-team.md` (content; structural validation in step-07) |
| FR-5.5 per-tool friction notes with reviewedAt | `training/tools-reference.md` (one section per tool; carries `reviewedAt`/`verifiedVersions` frontmatter) |
| FR-5.6 team-rituals checklist | `training/team-rituals-checklist.md` |
| FR-5.7 coding-skill-neutral framing | content convention; reviewer-enforced (no automation) |
| FR-5.8 stakeholder-demo objection sections | `training/stakeholder-demo-script.md` content |
| FR-5.9 facilitator timing/prompts/common-Qs | `training/facilitator-guide.md` content |
| FR-5.10 canonical story template | `training/story-template.md` (referenced by lessons 3, 5, capstone harness) |
| FR-5.11 sample `AGENTS.md` | repo root `AGENTS.md` (scaffolded by create-next-app v16, then customized) |
| FR-5.12 sample `.github/copilot-instructions.md` | repo `.github/copilot-instructions.md` |

**FR-6 Repo Surface → `.github/` + repo root:**

| FR | Lives in |
|---|---|
| FR-6.1 working CODEOWNERS | `.github/CODEOWNERS` |
| FR-6.2 branch-protection notes | `.github/branch-protection-notes.md` |
| FR-6.3 PR template with story-link field | `.github/pull_request_template.md` |
| FR-6.4 README naming maintainer + bus-factor | `README.md` |
| FR-6.5 cold-clone runs cross-platform | `package.json` scripts + `.nvmrc`; verified by manual pre-release checklist |
| FR-6.6 discoverable scripts | `package.json` scripts: `dev`, `build`, `start`, `lint`, `lint:links`, `test:e2e`, `test:unit`, `reset-progress` |

**Cross-cutting concerns → multiple locations:**

| Concern | Location(s) |
|---|---|
| Self-reference link integrity (Risk #3 / NFR-R2) | `scripts/check-links.ts` (static) + `tests/e2e/link-integrity.spec.ts` (DOM) |
| Accessibility (NFR-A1/A2) | `tests/e2e/accessibility.spec.ts` (axe-core) + Radix primitives in `src/components/` + Tailwind config |
| No data egress (NFR-S1) | `tests/e2e/no-egress.spec.ts` + `public/fonts/` (vendored) + no remote-asset imports anywhere |
| Cold-clone-to-running <5 min (NFR-P1) | `package.json` lean dependency list + `.nvmrc` + manual platform checklist |
| Content freshness (NFR-M4) | `src/components/staleness-banner.tsx` + `reviewedAt` frontmatter convention in `training/tools-reference.md` |

### Integration Points

**Internal data flow (the only flow that exists):**

```
Browser (Server Component HTML) ──── fetch ────► /api/progress
        ▲                                             │
        │ rendered HTML                               ▼
   Server Component ◄── reads ── better-sqlite3 ── data/progress.sqlite
        │
        └── reads markdown ──► training/**/*.md ── via remark/rehype pipeline

Capstone form ──── fetch ────► /api/capstone/save ── writes ──► _bmad-output/capstone/<session>/<step>.md
                                       │
                                       └── upserts progress row ──► better-sqlite3
```

**External integrations:** **None** at runtime. No third-party services, no APIs, no CDNs. Trainees may click out-links to external docs (e.g., Next.js docs, BMAD reference) — those are user-initiated and not part of the runtime integration surface.

**CI integration:** Two paired pipelines run on PR and gate merge through CODEOWNERS + branch protection (configured per `.github/branch-protection-notes.md`):

- `.vela.yml` — the team's primary CI (Target's Vela platform).
- `.github/workflows/ci.yml` — the maintained mirror so any GitHub fork has a running pipeline without requiring self-hosted Vela infrastructure.

Both run the same npm-script contract: `lint` → `tsc --noEmit` → `audit` → `lint:links` → `test:unit` → `test:e2e`. Drift between the two files is a defect (see §Infrastructure & Deployment for the maintenance invariant). Adopting teams on GitLab CI / Jenkins / CircleCI / etc. translate the same npm-script invocations into their platform's syntax — the npm scripts are the portable contract.

### File Organization Patterns (recap from §Implementation Patterns)

| Concern | Location |
|---|---|
| Configuration files | repo root (`*.config.{ts,mjs}`, `tsconfig.json`, etc.) |
| Source code | `src/` only; `app/`, `components/`, `lib/` underneath |
| Server-only code | `src/lib/<domain>/` and `src/app/api/`; never imported by `"use client"` modules |
| Client components | co-located with their parent route until rule-of-three; promote to `src/components/` |
| Tests | unit co-located (`*.test.ts` next to source); E2E centralized at `tests/e2e/` |
| Static assets | `public/` (fonts, images — all vendored, none remote) |
| Curriculum content | `training/` only; never under `src/` |
| Trainee runtime data | `data/progress.sqlite` (gitignored) |
| Trainee capstone outputs | `_bmad-output/capstone/<session>/` (gitignored per-session) |
| Scripts | `scripts/<kebab-name>.ts` |

### Development Workflow Integration

**Local development:**

```bash
git clone <repo>
cd bmad_demo
npm install               # one shot; no postinstall hooks beyond what create-next-app installs
npm run dev               # Turbopack; opens localhost:3000
```

`npm run dev` starts a single Next.js process (no docker-compose, no separate worker, no other moving parts). `data/progress.sqlite` is created on first DB write. `_bmad-output/capstone/` directories are created on first capstone save.

**Build / production-mode local:**

```bash
npm run build             # Next.js production build
npm run start             # serves the production build on localhost:3000
```

**Test suite:**

```bash
npm run lint              # ESLint
npm run lint:links        # static lesson-link integrity scan
npm run test:unit         # Vitest, co-located *.test.ts
npm run test:e2e          # Playwright (golden path + a11y + link DOM + no-egress)
npm run audit             # npm audit --audit-level=high
```

These npm scripts are the platform-agnostic verification surface. Two paired CI pipelines wrap them by default — `.vela.yml` (the team's primary) and `.github/workflows/ci.yml` (the GHA mirror so any GitHub fork has a running pipeline). Both must run the same checks; drift is a bug. Adopting teams on other CI platforms (GitLab CI, Jenkins, CircleCI, etc.) translate the same npm-script invocations into their platform's syntax.

**Reset:**

```bash
npm run reset-progress    # deletes data/progress.sqlite; echoes the absolute path
```

**Deployment:** None. The repo is the artifact; `git clone && npm install && npm run dev` is the full distribution path. Adopting teams fork the repo and customize CODEOWNERS / curriculum for their context.

## Architecture Validation Results

### Coherence Validation ✅

**Decision compatibility — checked:**

- Next.js 16 App Router + better-sqlite3 12.9.0 + Node 20+ floor: all three are mutually compatible per current release notes. No conflicting peer-dep ranges.
- Server Components reading `better-sqlite3` synchronously is the *recommended* pattern for sync I/O at the data-fetch boundary; no async-context conflicts.
- Tailwind + Radix primitives: ecosystem-default pairing; Radix primitives are unstyled and designed for utility-class composition.
- Playwright + `@axe-core/playwright`: official integration, drops in cleanly.
- Vitest + Next.js 16: Vitest's `defineConfig` with the React plugin is the documented path; no test-runner conflicts with Next's bundler.

**Pattern consistency — checked:**

- Naming conventions (snake_case in SQL, camelCase in JSON/JS, kebab-case in URLs/files-non-component, PascalCase in component files) are consistent across all sections — no rule contradicts another.
- Server/client boundary rules in §Implementation Patterns match the §Project Structure component-boundary rules: `src/lib/db/*` is server-only; `"use client"` modules call only `fetch`. One rule, two views.
- Error model (`{ ok, error?, details? }`) is the same shape everywhere it appears (Patterns §Format, Boundaries §API).

**Structure alignment — checked:**

- Project tree implements every architectural decision: SQLite path, Route Handler files, markdown pipeline location, capstone artifact directory, `.github/` artifacts, **paired CI pipelines** (`.vela.yml` + `.github/workflows/ci.yml`). No decision is undocumented at the file level.
- The capstone resume design point is explicitly *deferred* to the FR-3 implementation story (with the constraint named) — coherent rather than missing.
- **Two CI pipelines, one contract.** The npm scripts are the verification surface; the two YAML wrappers are paired example translations demonstrating that adopting teams can use whichever platform they prefer. The maintenance invariant (drift between the two files = bug) keeps the parallel honest.

### Requirements Coverage Validation

Two dimensions: per-FR ("does the architecture place this somewhere?") and per-NFR ("is this driver acted on?").

**Functional requirements coverage — 40/40 placed:**

Every FR is mapped to a file or directory in the §Requirements-to-Structure Mapping. Spot-check on the high-risk ones:

- ✅ FR-1.5 (lesson prose links to relative repo paths) → `src/lib/markdown/pipeline.ts` rehype plugins + dual-layer link-integrity test (Risk #3 mitigation).
- ✅ FR-2.6 (no auth, non-capability) → enforced *by absence*: no users table in `schema.sql`, no auth code anywhere; reviewer-enforced going forward.
- ✅ FR-3.6 (capstone artifacts to working tree) → `src/lib/capstone/write-artifact.ts` + the explicit reset-progress non-overlap guarantee.
- ✅ FR-3.7 (resume) → architecturally placed; schema-shape design point explicitly flagged for the implementation story.
- ✅ FR-5.1 (plain markdown only) → MDX deliberately rejected; `remark`/`rehype` pipeline preserves plain-text legibility.
- ✅ FR-5.11 / FR-5.12 (`AGENTS.md`, `copilot-instructions.md`) → both in tree, dual-role files acknowledged in §Cross-Cutting (now alongside the two CI pipeline files).

**Non-functional requirements coverage — every NFR has at least one architectural lever:**

| NFR | Architectural lever | Verifiable? |
|---|---|---|
| NFR-P1 cold-clone <5 min | Lean deps, no native compile (better-sqlite3 prebuilt), `.nvmrc`, manual pre-release platform checklist | Manual checklist; no automated gate |
| NFR-P2 lesson render <200ms | Server Components, no caching layer (SQLite + fs are local), markdown pipeline cost is bounded | **Gap: no automated assertion.** See §Gap Analysis. |
| NFR-P3 capstone save <500ms | Single fs.writeFile + single SQL upsert; no remote calls | **Gap: no automated assertion.** See §Gap Analysis. |
| NFR-A1/A2 WCAG AA + automated checks | `@axe-core/playwright` on every golden-path route; Radix accessible primitives; vendored fonts | ✅ pipeline-gated (Vela + GHA examples; portable to any CI) |
| NFR-S1 zero data egress | Vendored fonts/assets, `tests/e2e/no-egress.spec.ts` records all outbound requests | ✅ pipeline-gated (Vela + GHA examples; portable to any CI) |
| NFR-S2 no auth surface | Architectural absence (no users table, no auth code) | Reviewer-enforced |
| NFR-S3 npm audit high+ blocks merge | `npm run audit`; both bundled pipelines invoke it; teams on other CIs translate the same script | ✅ pipeline-gated (Vela + GHA examples; portable to any CI) |
| NFR-R1 golden-path E2E | `tests/e2e/golden-path.spec.ts` | ✅ pipeline-gated (Vela + GHA examples; portable to any CI) |
| NFR-R2 lesson-link integrity | Two-layer: `scripts/check-links.ts` + `tests/e2e/link-integrity.spec.ts` | ✅ pipeline-gated (Vela + GHA examples; portable to any CI) |
| NFR-R3 reset-progress recovery <1 min, no capstone loss | Hardcoded reset target; capstone artifacts in separate path; documented escape hatch | Reviewer-enforced + golden-path test in `progress-and-reset.spec.ts` |
| NFR-R4 no uptime requirement | Local-only; nothing to do | N/A |
| NFR-M1 markdown editable by any teammate | Plain markdown in `training/`, no MDX, no build step | Architectural |
| NFR-M2 named maintainer + quarterly cadence | `README.md` per FR-6.4 | Content-side; calendar-side |
| NFR-M3 single Next.js process | Architectural lock; nothing else introduced | Architectural |
| NFR-M4 stale-date banner at >120d | `<StalenessBanner>` Server Component + `reviewedAt` frontmatter convention | **Partial: needs Vitest unit test for the threshold.** See §Gap Analysis. |
| NFR-L1 MIT license | `LICENSE` (existing) | ✅ |

### Implementation Readiness Validation

**Decision completeness — checked:**

- Every "Critical Decision" from step 4 has: choice, version (where applicable), rationale, and at least one location it lives.
- The one *deliberately deferred* decision (capstone schema shape) is flagged with the constraint and the file (`progress-db.ts`) where the resolution lands.
- No silent placeholders. Where v1 says "none" (auth, ORM, logger library, observability), the absence is justified and the trip-wire for re-introduction is named.

**Pattern completeness — checked:**

- Naming, structure, format, communication, process patterns all addressed.
- Concrete code example given (Route Handler) plus an anti-pattern list.
- Enforcement layer named (TypeScript + ESLint + Zod + reviewer).

**Structure completeness — checked:**

- Every FR mapped to a file or directory.
- Folder layout is concrete down to per-test-spec leaves.
- `.gitignore` additions enumerated.
- Note on the existing empty `docs/` directory included so the init story handles it.
- Two paired CI pipeline files at repo root with a documented maintenance invariant (drift = bug).

### Gap Analysis

**Critical gaps (block implementation if unfixed):** **None.**

**Important gaps (smooth implementation, fix during early stories):**

1. **Performance NFRs (P2, P3) have no automated guard.** Lesson render <200ms and capstone save <500ms are stated bars; nothing in the pipeline fails when they regress. The cost of adding microbenchmarks at this scale is high relative to risk (a local SQLite write or markdown render is ~milliseconds), so the architecture deliberately leaves this out — but the *risk* is silently accumulating render cost (e.g., a heavy syntax-highlighting plugin) without a tripwire. **Recommendation:** add a single `tests/e2e/performance.spec.ts` that asserts a soft bound (e.g., page response <500ms on a typical developer laptop) when story 1 lands. Soft bound, not hard — runner variance dominates a hard 200ms gate.
2. **NFR-M4 stale-date threshold needs a unit test.** The `<StalenessBanner>` Server Component implements a 120-day rule; without a test, an off-by-one or timezone bug ages content silently wrong. **Recommendation:** Vitest co-located test in `src/components/staleness-banner.test.ts` covering: 0 days, 119 days, 120 days, 121 days, missing `reviewedAt`. Cheap to write; catches the cases that matter.
3. **No-egress test scope is implicit.** §Test Strategy says the test "fails the pipeline if any request targets a non-`localhost` origin." Edge case: what about `127.0.0.1`, `::1`, `0.0.0.0`? **Recommendation:** the implementation story for `no-egress.spec.ts` explicitly enumerates allowed hosts (likely: `localhost`, `127.0.0.1`, `::1`) and rejects everything else, including private network addresses if any leak through. Code-level concern, not architectural.

**Nice-to-have gaps (defer to v1.1 unless adoption signal demands):**

1. **CI matrix is single-platform.** Both bundled pipelines run on Linux only. Cross-platform install verification is a manual pre-release checklist item. The risk is low (better-sqlite3 prebuilt binaries are well-tested across LTS versions), but a macOS- or WSL2-specific install regression could ship undetected.
2. **No Prettier.** ESLint covers most style enforcement; Prettier was deliberately deferred. If the team grows past 3 contributors and style-vs-substance review comments multiply, add it. Listed as a v1.1 candidate.
3. **No bundle-size budget.** Next.js 16 reports bundle sizes in build output; nothing in the pipeline fails on regression. Given Server Components dominate and the client surface is tiny, this is unlikely to bite — but a budget would catch a future contributor importing a heavy client library by accident.

### Validation Issues Addressed

The six refinements applied in step 6 (capstone-resume schema callout, `src/db/` consolidation, `audience-card` promotion, `AGENTS.md` deduplication, empty-`docs/` removal, ESLint flat-config) plus the eight refinements applied in step 7 (Vela primary + GHA mirror, paired-pipeline framing in Lesson 4, NFR phrasing neutralization, dual-role files updated, Integration Points restored for both pipelines, Validation table relabel, maintenance invariant, drift = bug) closed structural-hygiene issues raised during structure and validation. No further validation issues were uncovered beyond the three Important Gaps named above.

### Architecture Completeness Checklist

**Requirements Analysis**

- [x] Project context thoroughly analyzed
- [x] Scale and complexity assessed
- [x] Technical constraints identified
- [x] Cross-cutting concerns mapped

**Architectural Decisions**

- [x] Critical decisions documented with versions
- [x] Technology stack fully specified
- [x] Integration patterns defined
- [x] Performance considerations addressed *(via NFR-P bars + acknowledged automation gap)*

**Implementation Patterns**

- [x] Naming conventions established
- [x] Structure patterns defined
- [x] Communication patterns specified
- [x] Process patterns documented

**Project Structure**

- [x] Complete directory structure defined
- [x] Component boundaries established
- [x] Integration points mapped
- [x] Requirements to structure mapping complete

### Architecture Readiness Assessment

**Overall Status:** **READY WITH MINOR GAPS** — all 16 checklist items pass; three Important Gaps are named with concrete recommendations that fold into early implementation stories (not blockers).

**Confidence Level:** **High.** The stack is conventional, the requirements are well-bounded by the PRD, every FR has a home, and every NFR has at least one architectural lever (with two of them carrying soft-rather-than-hard verification, deliberately).

**Key strengths:**

- **Boring tech end-to-end.** Nothing in the stack is bleeding-edge; every choice has years of production weight behind it.
- **Pedagogical legibility built in.** Folder layout, URL → file mapping, and the dual-role artifacts (`AGENTS.md`, `.github/CODEOWNERS`, PR template, `.vela.yml` + `.github/workflows/ci.yml`) are all positioned to be *teaching surfaces*, not just developer conveniences.
- **CI portability demonstrated, not described.** Two paired pipeline files running the same npm-script contract make the platform-agnostic claim self-evident — same trick the curriculum uses with four AI tools to demonstrate tool portability.
- **Risk #3 (self-reference rot) gets two-layer protection.** Static scan + DOM check is overkill in a small repo and exactly right for one whose value rests on the references staying live.
- **NFR-S1 (no egress) is testable, not a posture.** Vendored assets + Playwright network interception turn the claim into a verifiable test, runnable in any CI.
- **Deliberate non-decisions are surfaced, not hidden.** The "Patterns the Architecture Deliberately Does NOT Define" list, the Open schema-design point, and the maintenance invariant on the two CI files are guardrails for future contributors.

**Areas for future enhancement (post-v1.1, roughly in priority order):**

1. Cross-platform CI matrix (macOS + Windows-WSL2) once a real failure-mode incident surfaces.
2. Performance microbenchmarks for NFR-P2/P3 if rendering or save cost grows past comfort.
3. Lesson-link integrity becomes a stronger CI-step contract (e.g., dependency-graph verification beyond href existence) per PRD §Growth Features.
4. Multi-owner CODEOWNERS lesson + companion architecture for gate-load distribution (PRD §Innovation §Risk #4 fallback).
5. Capstone variants (e.g., 30-min stakeholder capstone) once content authoring patterns settle.

### Implementation Handoff

**AI agent guidelines:**

- Treat the §Implementation Patterns rules as load-bearing constraints; deviating requires either explicit user approval or rule-of-three justification.
- The §Project Structure tree is the source of truth for "where does this code go?". When in doubt, find the closest existing analog.
- The capstone-schema design point in §Architectural Boundaries must be resolved by the FR-3 implementation story — the agent picks one of the three shapes and updates `schema.sql` + `progress-db.ts` consistently.
- The three Important Gaps (perf assertion, staleness unit test, no-egress host enumeration) should land within the first ~5 stories, not be left to v1.1.
- **The two CI pipeline files MUST stay synchronized on what they check.** Any change to one requires the same change to the other in the same commit. Drift between `.vela.yml` and `.github/workflows/ci.yml` on what gets verified is a defect, not a permitted variation. The YAML syntax may differ; the npm-script invocations may not.

**First implementation priority:**

1. **Story 1 — Scaffold the app.** Run `create-next-app` per §Starter Template Evaluation, merge the scaffold into the existing repo (preserving `README.md`, `LICENSE`, `_bmad/`, `_bmad-output/`, `training/`; removing the empty `docs/`; merging `.gitignore`), commit. Validates the §Project Structure top level.
2. **Story 2 — DB layer and progress API.** `src/lib/db/connection.ts`, `schema.sql`, `progress-db.ts` (with the chosen capstone-session shape), `schemas.ts`, `src/app/api/progress/route.ts`, plus the `progress-and-reset.spec.ts` E2E. Validates the §Data Architecture decisions end-to-end.
3. **Story 3 — Markdown pipeline + first lesson route.** `src/lib/markdown/pipeline.ts`, `render.tsx`, `src/app/lessons/[slug]/page.tsx`. Validates the rendering decisions and unblocks all subsequent content stories.
4. **Story 4 — Paired CI pipelines.** `.vela.yml` + `.github/workflows/ci.yml` running the npm-script contract; `branch-protection-notes.md` updated to mention both. The maintenance invariant lands as a `CONTRIBUTING.md`-style note (or in `branch-protection-notes.md`, since that's the closest existing home for CI-related guidance).

After story 4, content authoring (`training/lessons/*.md`) and the remaining `.github/` artifacts can land in parallel.
