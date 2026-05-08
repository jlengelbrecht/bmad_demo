# Session State — 2026-05-08

**Purpose:** Single document the next session can read first to pick up where we left off. Pairs with `_bmad-output/planning-artifacts/epics.md` (the backlog), the per-story files in this directory, and `deferred-work.md` (the running carry-over list).

---

## What's done (12 stories, 2 epics, 2 retros)

| Epic | Stories | Status | Retro |
|---|---|---|---|
| **Epic 1** — Project Foundation & One-Command Boot | 1.1, 1.2, 1.3 | ✅ all `done` | ✅ `epic-1-retro-2026-05-08.md` |
| **Epic 2** — Lesson Navigation & Self-Reference Link Integrity | 2.1, 2.2, 2.3, 2.4, 2.5 | ✅ all `done` | ⚪ never authored — Epic 3 retro action item B3 to retroactively capture if useful |
| **Epic 3** — Trainee Progress State & Reset | 3.1, 3.2, 3.3, 3.4 | ✅ all `done` | ✅ `epic-3-retro-2026-05-08.md` |

Each story file in `_bmad-output/implementation-artifacts/N-N-*.md` has its **Status** set to `done` and carries: Tasks/Subtasks (all `[x]`), Implementation Plan, Debug Log, Completion Notes, Review Findings (with all patches resolved), File List, and Change Log.

There is no `sprint-status.yaml` — the BMad sprint-tracking file was never created for this project. Story states are tracked in the individual story files.

## Cross-cutting work also landed

- **Playwright E2E baseline** with chromium + 20 specs covering home, audience-entry routes, lessons (incl. keyboard tab order), labs, mark-complete (incl. optimistic-revert via stubbed 500), and the global not-found page
- **Vitest unit suite** at 112 cases across 9 test files (markdown pipeline, sequence module, dev-link-check, load-content, check-links, staleness banner, progress-db, route handler, reset-progress)
- **Implementation-readiness report** + AC re-walk (Epic 1+2 era; Epic 3 ACs walked story-by-story in the review process)
- **Walkability fixes** (Story-1.x era): site header with home link, "Begin Lesson 1 →" forward link from /start-here
- **Typography polish**: `@tailwindcss/typography` plugin installed, autolink-anchor `#` hidden on default state, inline-code GitHub-backtick decorations dropped (`!important` override in globals.css)
- **Architecture-doc reconciliation**: staleness threshold inequality (`>` → `≥`)
- **Manual Playwright walkthrough** at end-of-Epic-3 surfaced: stale-state-after-reset-progress (fixed with a dev-server-restart hint) + the typography backtick noise (fixed)

## Test + lint state at session close

```
npm run test:unit   → 112 / 112 (9 test files)
npm run test:e2e    → 20 / 20 (chromium)
npm run lint        → clean
npm run lint:links  → clean (12 markdown files / 0 relative links)
npm run build       → succeeds (last verified 2026-05-08; one Turbopack warning about NFT trace breadth — non-blocking)
```

## Active scripts

| Script | Purpose |
|---|---|
| `npm run dev` | Next.js dev server with Turbopack on `localhost:3000` |
| `npm run build` | Production build (16 routes prerendered) |
| `npm run start` | Next.js production server (local-only deployment per architecture) |
| `npm run lint` | ESLint (flat config) |
| `npm run lint:links` | `tsx scripts/check-links.ts` — static link-integrity scan over `training/**/*.md` |
| `npm run test:unit` | Vitest |
| `npm run test:e2e` | Playwright (chromium) |
| `npm run reset-progress` | `tsx scripts/reset-progress.ts` — deletes `data/progress.sqlite` (+ WAL/SHM sidecars). Honors `BMAD_DATABASE_PATH` env var (must end in `.sqlite`). Reminds the user to restart any running dev server. |

## Live runtime surface (visit `localhost:3000`)

| Route | What it is |
|---|---|
| `/` | Home with three audience-entry cards |
| `/start-here` | Trainee path placeholder + "Begin Lesson 1 →" forward link |
| `/stakeholder` | Stakeholder demo placeholder |
| `/facilitator` | Facilitator guide placeholder |
| `/lessons/[slug]` | 6 lessons (1–6 with placeholder content), prev/next nav strip with completion pills, mark-complete button |
| `/labs/[slug]` | 3 labs (solo, sync, async-story-review) with mark-as-run button |
| `/api/progress` (POST only) | Zod-validated upsert; written to local SQLite |
| `_not-found` | Global 404 with "← Back to home" |

Architecture's locks honored throughout: Server Components by default; Route Handlers for mutations (no Server Actions); plain `Response.json` error envelopes; no auth; npm-only; Turbopack default; Tailwind v4 + typography plugin; Geist via `next/font/google` (build-time-vendored).

## Carry-overs (`deferred-work.md`)

A single running file at `_bmad-output/implementation-artifacts/deferred-work.md` tracks every defer call across stories. Highest-leverage clusters:

- **Epic 5 / CI matrix** (cross-platform install verification, Node 22 LTS verification, axe-core a11y on the trainee golden path, `next/font/google` no-egress E2E, paired CI Vela + GHA, `next-env.d.ts` typecheck-before-build, port-collision guards in tests)
- **Epic 4 / Capstone** (revisit `_bmad-output/capstone/[0-9]*/` glob brittleness when the harness lands; capstone-step nested-interactive-element refactor of `LessonCompleteButton` would make it 3 surfaces and trigger the rule-of-three relocation to `src/components/`)
- **Epic 6 / Curriculum** (`AGENTS.md` customization, tsconfig + eslint excludes for `_bmad/`, `_bmad-output/`, `training/`, lab forward-navigation chrome, audience-page forward-navigation chrome)
- **Architecture-doc drift sweep** (still pending: reset-progress "hardcoded target" wording vs. impl honoring `BMAD_DATABASE_PATH`; any other drifts uncovered during Epic 4–6)

## Pickup hints for the next session

**State the patterns established this session so they don't have to be rediscovered:**

1. **Per-story cadence** — implement → CR with 3 parallel review agents (`Blind Hunter`, `Edge Case Hunter`, `Acceptance Auditor`) → triage → apply patches → commit. Patches go in a follow-up commit so review history stays visible.

2. **Patch counts vary honestly** — Epic 1 ran 3–6, Epic 2 averaged 8–10, Epic 3 was 9/5/7/5. Trust the triage; don't pad to a round number. If review surfaces nothing material, ship.

3. **Architectural threat-model dismissals** — the architecture's "local-only single-user trusts-the-local-user" lock (`architecture.md:212`) means CSRF / body-size cap / Content-Type validation / concurrent-write race / similar generic-API-hardening concerns DON'T apply. Dismiss with rationale; don't pad them into the patch list.

4. **Tests follow the architecture's "no React-component tests at v1" lock** — the unit suite is for pure functions and storage layers. React-component bugs are caught at code review or e2e. This blind spot is bounded today; if Epic 4/5/6 grow the client-component count, revisit.

5. **`BMAD_DATABASE_PATH`** is the e2e isolation seam — any future test that mutates progress must use this env var rather than hardcoding a path.

6. **AI attribution** — never add Claude/AI signatures to commits, PRs, code, or docs in this repo (see `~/.claude/projects/.../memory/`).

7. **Git identity** — commits use `Devbox <dudeitsdallyboy@gmail.com>` via `-c user.email -c user.name` per command. Don't modify git config.

**To resume Story 4.1 cleanly, the next session can read in order:**

1. This file (`session-state-2026-05-08.md`) — the snapshot
2. `_bmad-output/implementation-artifacts/epic-3-retro-2026-05-08.md` — the most recent retro, including Epic 4 prep predictions
3. `_bmad-output/planning-artifacts/epics.md` line 743 onward — Story 4.1 AC text
4. `_bmad-output/planning-artifacts/architecture.md` §"Frontend Architecture → Capstone resume mechanism" — the schema-shape design point Story 4.1 resolves
5. `_bmad-output/implementation-artifacts/3-1-sqlite-progress-store.md` — the storage layer Story 4.1 extends

**The next epic, Epic 4 (Capstone Harness), has 4 stories** (4.1, 4.2, 4.3, 4.4) per `epics.md`. Story 4.1 is the schema/design-point resolver and is the natural starting point — no blocking carry-overs prevent it.

## Total work this session

```
34 commits on main, with 2 epic retros, 1 readiness report, 1 AC re-walk,
1 Epic 1 retro, 1 Epic 3 retro, 12 story files, 1 session-state doc.
```
