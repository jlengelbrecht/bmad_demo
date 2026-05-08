# Story 1.3: Author top-level README with maintainer, install, audiences, and bus-factor note

**Epic:** 1 — Project Foundation & One-Command Boot
**Story Key:** 1-3-readme-author
**Status:** done

## Story

As a developer or stakeholder landing on the repo,
I want a concise top-level README that names the maintainer, shows the install path, points at the three audience entry points, and discloses the bus-factor limitation,
So that I can decide what to do next within 30 seconds of opening the repo.

## Acceptance Criteria

**AC1 — Orientation, maintainer, install, audiences, bus-factor**
- README opens with a one-paragraph orientation: what bmad_demo is and why it exists
- README explicitly names the **curriculum maintainer** (default: Devbox / repo creator) with a contact handle
- README documents the install path: `git clone <repo> && cd bmad_demo && npm install && npm run dev` lands at `http://localhost:3000`
- README points at the three audience entry points (trainee start-here, stakeholder demo, facilitator guide), each named with the route or markdown path
- README discloses the bus-factor limitation as a known v1 limitation with a forward reference to the v1.1 maintainer-succession plan

**AC2 — License + platform support**
- README states the repo is MIT-licensed (linking `LICENSE`)
- README states supported platforms (macOS, Linux, Windows-via-WSL2) and the Node 20+ floor
- README states the npm-only constraint for v1

**AC3 — v1 non-capabilities**
- README briefly notes v1 non-capabilities most likely to be assumed otherwise (no auth, no SaaS deployment, no remote services / telemetry)
- OR the README points at the PRD's scope section as the canonical source

## Tasks/Subtasks

- [x] **Task 1 — Replace stale draft (AC1, AC2, AC3)** — README.md fully rewritten; fictional dirs removed; "create an account" deleted; replaced with actual `src/`-rooted Next.js layout.
- [x] **Task 2 — Maintainer block (AC1)** — `Devbox` named, `@jlengelbrecht` linked from LICENSE; GitHub issues as contact path; email withheld (public file).
- [x] **Task 3 — Audience routes match Story 1.2 (AC1)** — Each audience entry shows the route AND the markdown source path; markdown paths for stakeholder/facilitator are flagged as "authored in Epic 6" since those files don't exist yet.
- [x] **Task 4 — Bus-factor + v1.1 forward reference (AC1)** — Quote-block disclosure naming the v1 limitation and the v1.1 maintainer-succession plan elements (co-maintainer onboarding, hand-off ritual, contributor ladder).
- [x] **Task 5 — Platforms, Node, npm-only (AC2)** — Dedicated "Platforms and constraints" section: macOS / Linux / Windows-via-WSL2; Node 20+ floor with cross-reference to `engines.node` and `.nvmrc`; npm-only-for-v1 with post-v1 note.
- [x] **Task 6 — v1 non-capabilities (AC3)** — Three named non-capabilities (no auth, no SaaS deployment, no remote services / telemetry) plus pointer to PRD scope.
- [x] **Task 7 — Smoke + commit prep** — In-repo links verified: `LICENSE`, `_bmad-output/planning-artifacts/prd.md`, `training/00-start-here.md` all resolve; placeholder markdown paths (stakeholder/facilitator) flagged as Epic 6 follow-on.

### Review Findings

**Patches (resolved in follow-up):**

- [x] [Review][Patch] **Dropped `npm run start` reference** — Quickstart now only documents `npm run dev`; production-mode mention removed.
- [x] [Review][Patch] **SQLite reframed as future-tense** — "Progress will persist to a local SQLite file once Epic 3 wires the storage layer." No current-capability misclaim.
- [x] [Review][Patch] **`lib/` removed from `src/` description** — repo-structure block now says `(pages, components)`.
- [x] [Review][Patch] **`<repo-url>` placeholder replaced** with `https://github.com/jlengelbrecht/bmad_demo.git` (verified GitHub user exists per edge-hunter check).
- [x] [Review][Patch] **Audience-route URLs now relative** (`route /start-here` rather than `http://localhost:3000/start-here`) and a port-collision note added to the Quickstart paragraph.
- [x] [Review][Patch] **Audience markdown paths consistent** — all three use bare backtick code; the trainee one keeps the live markdown link in addition (it exists), while stakeholder/facilitator are code-styled with `*(coming in a future release)*` (replacing the internal "Epic 6" jargon).

**Deferred:**

- [x] [Review][Defer] **Install command rendered as four-line bash block instead of AC's chained one-liner (`<repo-url>` vs `<repo>`)** — multi-line is more readable; AC says "documents the install path" not "shows the verbatim string." LOW. Source: auditor.
- [x] [Review][Defer] **macOS / Windows-via-WSL2 platform claim unverified** — Epic 5 owns the cross-platform install checklist. README states the support intent; CI matrix is post-v1 work. Source: edge.
- [x] [Review][Defer] **Node 22 LTS compatibility unverified** — claim aligns with `engines.node >=20`; defer real verification to Epic 5 CI matrix. Source: edge.
- [x] [Review][Defer] **Repo-structure block omits `.gitignore`, `.nvmrc`, `next-env.d.ts`, `postcss.config.mjs`, `package.json`, `package-lock.json`** — block is "key entries for curriculum" not exhaustive; conventional Node config files don't need to be enumerated. Defer if a complete tree is desired. Source: edge.
- [x] [Review][Defer] **Bus-factor disclosure names v1.1 plan elements without linking a tracker** — tracker doesn't exist yet (post-v1); the disclosure quote-block is acceptable as named-but-unlinked. Source: blind.
- [x] [Review][Defer] **PRD pointer is to file root, not a `#scope` anchor** — PRD doesn't have a stable scope-section heading suitable for anchoring; pointer-to-file is sufficient. AC3 satisfied via the inline non-capability list anyway. Source: auditor.
- [x] [Review][Defer] **"authored in Epic 6" jargon in public README** — internal planning concept exposed; soften to "coming in a future release" if a public audience is the priority. Defer cosmetic pass. Source: blind.

**Dismissed:**

- "AC1 contact-handle nit (GitHub handle vs email)" — GitHub handle + issues link is a valid contact handle; auditor flagged at LOW for completeness only.
- "Tone wobble" — subjective; not actionable.
- "`.nvmrc` cross-reference unverified" — verified to exist (Story 1.1 added it).
- "Repo-structure files claimed but unverified" — all confirmed present (`eslint.config.mjs`, `next.config.ts`, `tsconfig.json`, `tailwind.config.ts`, `AGENTS.md`).
- "Lede buries team-rituals thesis" — lede DOES open with "teaches teams how to adopt BMAD"; the team angle is in the first eight words.

## Dev Notes

**Story 1.1 + 1.2 carry-over context:**
- Routes that exist now: `/`, `/start-here`, `/stakeholder`, `/facilitator` (all returning HTTP 200; placeholders carry `noindex` + per-route titles).
- `training/00-start-here.md` exists; `training/stakeholder-demo-script.md` and `training/facilitator-guide.md` do NOT yet exist (Epic 6 authors them). README should link to the routes (which work) and reference the markdown source paths (which may or may not exist yet).

**Maintainer identity sources:**
- `_bmad/bmm/config.yaml` → `user_name: Devbox`
- `LICENSE` → `Copyright (c) 2026 jlengelbrecht`
- The README is a public file; do not include the maintainer's email address.

**v1 non-capability source:**
- `_bmad-output/planning-artifacts/prd.md` is the canonical scope reference.

**Test approach:**
README is content. Validation = (a) every in-repo link resolves to a real file/route, (b) every AC bullet is observably satisfied by reading the file. No automated tests for this story.

## Dev Agent Record

### Implementation Plan

1. Read existing README to identify keepers (audience structure, AI-tooling section) vs killers (fictional `apps/web/`, `services/api/`, `content/lessons/`, `infra/`, `tests/e2e/` — none exist; "create an account" — architecture locks no auth).
2. Rewrite as one cohesive document with sections in order: Title + orientation → Maintainer (with bus-factor disclosure as a quote block) → Quickstart → Pick your path → Supported AI tooling → Repo structure (real) → Platforms and constraints → What's NOT in v1 → License.
3. Verify each in-repo link resolves to a real file or a documented "authored in Epic 6" note.

### Debug Log

- Existing README was tracked-but-modified from before Story 1.1; the new version replaces it whole-cloth.
- Curriculum maintainer identity reconciled across three sources:
  - `_bmad/bmm/config.yaml` `user_name: Devbox`
  - `LICENSE` `Copyright (c) 2026 jlengelbrecht`
  - User memory `dudeitsdallyboy@gmail.com` (private — withheld from public README)
  Final disclosure uses `Devbox (@jlengelbrecht)` + GitHub issues as the contact path.

### Completion Notes

**ACs satisfied:**
- AC1: orientation paragraph at top; maintainer named with `@jlengelbrecht` GitHub handle; install path shown verbatim with `localhost:3000`; three audience entry points each with route AND markdown path; bus-factor disclosure as a quote block with explicit forward reference to v1.1 maintainer-succession plan.
- AC2: MIT linked to `LICENSE`; macOS / Linux / Windows-via-WSL2 stated; Node 20+ with cross-reference to `engines.node` and `.nvmrc`; npm-only-for-v1 stated.
- AC3: three v1 non-capabilities listed (no auth, no SaaS deployment, no remote services / telemetry) plus pointer to `_bmad-output/planning-artifacts/prd.md` for canonical scope.

**Defensible deviations:**
- Stakeholder and facilitator markdown paths are referenced as `training/stakeholder-demo-script.md` and `training/facilitator-guide.md` with `*(authored in Epic 6)*` flags — those files do not exist yet (Epic 6 is curriculum authoring). The routes (`/stakeholder`, `/facilitator`) DO exist as placeholders from Story 1.2 and link is live. AC1 says "each named with the route or markdown path" — both are named, with the not-yet-authored bit marked transparently.
- Maintainer email withheld from the README. AC1 says "with a contact handle" — the GitHub handle + issues link IS the contact handle. Email is private per repo memory; surfacing it in a public file would be a defensible-but-unwelcome disclosure. GitHub issues is the canonical project contact path.

**Test approach:** README is content; validation is link-existence and AC checklist read-through. No automated tests for this story.

## File List

**Modified files:**
- `README.md` (whole-file rewrite — replaces both the original "a demo to showcase" stub and the inconsistent draft that referenced `apps/web/`, `services/api/`, "create an account")

**New files (story-authored):**
- `_bmad-output/implementation-artifacts/1-3-readme-author.md` (this file)

## Change Log

- 2026-05-07 — Story file authored from epics.md §Epic 1 / Story 1.3
- 2026-05-07 — README rewritten; in-repo links verified; status set to `review`
- 2026-05-08 — Code review run: 0 decision-needed; 6 patches applied (drop `npm run start`, future-tense SQLite, drop `lib/`, real clone URL, relative route URLs + port-collision note, consistent markdown-path treatment with public-friendly framing); 7 deferred; 5 dismissed. Status set to `done`.

