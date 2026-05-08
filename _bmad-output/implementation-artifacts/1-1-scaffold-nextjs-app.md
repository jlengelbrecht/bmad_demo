# Story 1.1: Scaffold Next.js v16 app and merge with existing repo

**Epic:** 1 — Project Foundation & One-Command Boot
**Story Key:** 1-1-scaffold-nextjs-app
**Status:** done

## Story

As a developer cloning the bmad_demo portal,
I want the repo to contain a working Next.js v16 App Router scaffold merged with the existing BMAD content,
So that I can run `npm install && npm run dev` and reach a Next.js page at `localhost:3000` without manual setup.

## Acceptance Criteria

**AC1 — Existing artifacts preserved + scaffold added**
- Given a clean clone of the bmad_demo repo at the v1 baseline
- When I inspect the repo root
- Then the existing artifacts are preserved (`_bmad/`, `_bmad-output/`, `training/`, `LICENSE`, the existing `README.md`)
- And new Next.js scaffold artifacts exist (`src/`, `next.config.ts`, `tsconfig.json`, `package.json`, `eslint.config.mjs`, `postcss.config.mjs`, `tailwind.config.ts`, `AGENTS.md`)
- And the empty `docs/` directory is removed
- And `.gitignore` is the merge of the existing entries and the scaffold additions (`node_modules/`, `.next/`, `data/*.sqlite`, `data/*.sqlite-journal`, `_bmad-output/capstone/[0-9]*/`, `playwright-report/`, `test-results/`)

**AC2 — One-command boot works**
- Given the scaffolded repo
- When I run `npm install && npm run dev` on a clean machine
- Then the Next.js dev server starts on port 3000 using Turbopack
- And `http://localhost:3000` returns a 200 response with the default Next.js page

**AC3 — package.json correctness**
- `"engines": { "node": ">=20" }` declared
- create-next-app default scripts (`dev`, `build`, `start`, `lint`) present
- `next` is at v16.x and `react`/`react-dom` are at the v16-compatible major

**AC4 — tsconfig strict + path alias**
- `strict: true` enabled
- `@/*` path alias resolves to `./src/*`

**AC5 — Node version pin**
- `.nvmrc` exists pinning Node 20+ as advisory floor

**AC6 — Tailwind, ESLint, React Compiler config**
- Tailwind CSS wired (`tailwind.config.ts`, `postcss.config.mjs`, Tailwind directives in `src/app/globals.css`)
- ESLint flat-config in place (`eslint.config.mjs`)
- React Compiler NOT enabled (no React Compiler flag in `next.config.ts`)

**AC7 — AGENTS.md exists**
- `AGENTS.md` exists at repo root (placeholder content from create-next-app v16 acceptable; customization deferred to Epic 6)

## Tasks/Subtasks

- [x] **Task 1 — Scaffold Next.js v16 app in a temp directory and merge into repo (AC1, AC3, AC4, AC6, AC7)**
  - [x] Run `create-next-app@latest` with flags: `--typescript --tailwind --eslint --app --src-dir --turbopack --import-alias "@/*" --use-npm --skip-install --yes` into `/tmp/nextjs-scaffold` (`--skip-install` defers npm install to a deliberate, repo-root step after the merge)
  - [x] Copy scaffold files into repo root, preserving existing `_bmad/`, `_bmad-output/`, `training/`, `LICENSE`, `README.md`
  - [x] Delete the empty `docs/` directory
  - [x] Verify scaffold artifacts present at repo root: `src/`, `next.config.ts`, `tsconfig.json`, `package.json`, `eslint.config.mjs`, `postcss.config.mjs`, `AGENTS.md`
  - [x] Tailwind wiring verified — Next.js v16 generates Tailwind v4 (no `tailwind.config.ts`); see deviation note in Completion Notes
  - [x] Verify `next.config.ts` has no React Compiler flag (confirmed: empty config object)

- [x] **Task 2 — Merge .gitignore (AC1)**
  - [x] Combine existing `.gitignore` entries with scaffold additions
  - [x] Entries present: `node_modules/`, `.next/`, `data/*.sqlite`, `data/*.sqlite-journal`, `_bmad-output/capstone/[0-9]*/`, `playwright-report/`, `test-results/`

- [x] **Task 3 — Add package.json engines + verify deps (AC3)**
  - [x] Added `"engines": { "node": ">=20" }`
  - [x] Scripts present: `dev`, `build`, `start`, `lint`
  - [x] `next@16.2.6`, `react@19.2.4`, `react-dom@19.2.4` (Next.js v16 ships with React 19 — the v16-compatible major)

- [x] **Task 4 — Add .nvmrc (AC5)**
  - [x] `.nvmrc` written with `20`

- [x] **Task 5 — Verify tsconfig strict + path alias (AC4)**
  - [x] `compilerOptions.strict: true` confirmed
  - [x] `compilerOptions.paths["@/*"] = ["./src/*"]` confirmed

- [x] **Task 6 — Smoke test the boot (AC2)**
  - [x] `npm install` clean (360 packages added)
  - [x] `npm run dev` started — output: `▲ Next.js 16.2.6 (Turbopack)` ready in 199ms on `http://localhost:3000`
  - [x] `curl http://localhost:3000/` returned `HTTP 200` with default Next.js page HTML
  - [x] Dev server stopped cleanly; port 3000 free

- [x] **Task 7 — File List + completion notes**
  - [x] File List populated below
  - [x] Completion Notes record approach and deviations

### Review Findings

**Decision Needed (resolved):**

- [x] [Review][Decision] **`tailwind.config.ts` missing — AC1 + AC6 literal violation, architecture line 613 also lists it (HIGH)** — **Resolved (Option 1):** generated a minimal `tailwind.config.ts` (content-glob only) and wired it via `@config "../../tailwind.config.ts";` in `src/app/globals.css`. Preserves AC literal text and architecture-locked folder layout; Tailwind v4's CSS-first idiom (`@theme inline`) remains in `globals.css`. Sources: blind+edge+auditor.

**Patches (resolved):**

- [x] [Review][Patch] **Add `--turbopack` to `dev` script** [`package.json:8`] — `"dev": "next dev --turbopack"`. Hard-coded against a future Next.js minor flipping the default. Verified by re-smoke: `▲ Next.js 16.2.6 (Turbopack)` ready in 181 ms; HTTP 200.
- [x] [Review][Patch] **Move `*.pem` out of "Editor / OS" section in `.gitignore`** — created a "Secrets / keys" section (also added `*.key`).
- [x] [Review][Patch] **Reconcile story Implementation Plan vs Task 1 wording** — Task 1 now explicitly notes `--skip-install` in the create-next-app invocation, matching the executed plan.

**Deferred (real but out-of-scope for Story 1.1):**

- [x] [Review][Defer] **Default `page.tsx`/`layout.tsx`/`metadata.title="Create Next App"`/`globals.css` Geist-vs-Arial mismatch** — Story 1.2 replaces the home page with three audience-entry cards. Source: blind+edge.
- [x] [Review][Defer] **AGENTS.md placeholder content + reference to non-existent `node_modules/next/dist/docs/`** — AC7 explicitly defers customization to Epic 6. Source: blind.
- [x] [Review][Defer] **tsconfig + eslint should `exclude`/`ignore` `_bmad/`, `_bmad-output/`, `training/`** — preventive. Currently no `.ts(x)` files in those trees, so no breakage; revisit when curriculum content lands in Epic 6. Source: edge.
- [x] [Review][Defer] **`.gitignore` glob `_bmad-output/capstone/[0-9]*/` is brittle** — matches only dirs starting with a digit. Architecture states capstone session ids are UTC timestamps (always digit-prefixed), so the glob aligns. Re-validate when Capstone harness lands in Epic 4. Source: blind+edge.
- [x] [Review][Defer] **`next/font/google` build-time fetch + NFR-S1 (no runtime egress)** — `next/font` self-hosts at runtime so NFR-S1 holds, but the build-time fetch is worth verifying when the no-egress E2E test lands in Epic 5. Source: edge.
- [x] [Review][Defer] **Port 3000 hardcoded in AC2 smoke** — `next dev` auto-fallback to 3001+ would silently skip the smoke. Address when CI tests land in Epic 5. Source: edge.
- [x] [Review][Defer] **`next-env.d.ts` references types generated only after first `next dev`/`next build`** — affects clean-clone `tsc --noEmit` in CI. Address when CI typecheck step lands in Epic 5 (run `next build` once before typecheck). Source: blind+edge.

**Dismissed (review-process artifacts or scaffold defaults that match v16 conventions):**

- `next-env.d.ts` showing in this review's diff — artifact of synthesized review diff; the file is gitignored on disk and won't be committed.
- `package-lock.json` absent from review diff — intentionally filtered for size; lockfile exists on disk per `ls -la`.
- `README.md` modification absent from review diff — pre-existing change, out of Story 1.1 scope.
- `tsconfig.json` dual `.next/types/**` and `.next/dev/types/**` — both paths are correct for Next.js v16 (build vs dev type emission).
- `eslint-config-next` subpath imports (`/core-web-vitals`, `/typescript`) — scaffold default; v16 exposes these subpaths.
- `engines.node: ">=20"` no upper bound — matches AC3 wording verbatim.
- `CLAUDE.md` case-insensitivity — pre-existing repo convention from initial commit's `.gitignore`.

## Dev Notes

**Architecture references:**
- Selected starter: `create-next-app` (Next.js v16, App Router) — see `_bmad-output/planning-artifacts/architecture.md` §"Selected Starter"
- In-place scaffolding via temp dir; merge keeps existing `README.md` and existing `.gitignore` entries
- React Compiler intentionally NOT enabled for v1 (boring-tech principle)

**Test approach:**
Story 1.1 is scaffolding. No Vitest/Playwright frameworks installed yet (those land in Epic 5 / later stories). For this story, "tests" are:
- File existence assertions (per AC checklist) executed via a verification script or shell checks
- Boot smoke test: `npm install && npm run dev` produces 200 from `http://localhost:3000`

**Boring-tech notes:**
- npm only (PRD lock)
- No Prettier (deferred)
- No `.env` for v1

## Dev Agent Record

### Implementation Plan

1. Scaffold Next.js v16 in `/tmp/nextjs-scaffold` via `npx create-next-app@latest` with the architecture-specified flags (`--typescript --tailwind --eslint --app --src-dir --turbopack --import-alias "@/*" --use-npm --skip-install --yes`).
2. Copy scaffold artifacts into the repo root, skipping files that conflict with existing repo content (`README.md`, `.gitignore`) and skipping `CLAUDE.md` (treated as local-only by existing `.gitignore`).
3. Remove empty `docs/` directory.
4. Hand-merge `.gitignore` to keep existing entries and add the story-required additions (`data/*.sqlite`, `data/*.sqlite-journal`, `_bmad-output/capstone/[0-9]*/`, `playwright-report/`, `test-results/`, `next-env.d.ts`, `*.tsbuildinfo`, `.vercel`).
5. Edit `package.json`: rename to `bmad_demo` and add `engines.node >=20`.
6. Add `.nvmrc` with `20`.
7. Verify `tsconfig.json` strict + `@/*` alias and `next.config.ts` has no React Compiler flag (left as-is from scaffold).
8. Run `npm install`, smoke-test `npm run dev` against `http://localhost:3000`, confirm HTTP 200, shut down.

### Debug Log

- `npm install`: 360 packages installed; 2 moderate-severity audit findings (deferred — `npm run audit` enforcement lands in Epic 5, not Story 1.1).
- `npm run dev` cold-start: ready in 199 ms (Turbopack).
- `curl -s -o /dev/null -w "HTTP %{http_code}" http://localhost:3000/` → `HTTP 200`.

### Completion Notes

**Deviations from story ACs (and why):**

1. **No `tailwind.config.ts` file.** AC6 lists `tailwind.config.ts` as one of the wiring signals. Next.js v16 + Tailwind v4 (the architecture-locked stack) **does not generate** `tailwind.config.ts` — Tailwind v4 wires through `postcss.config.mjs` (`@tailwindcss/postcss` plugin) plus `@import "tailwindcss"` in `src/app/globals.css`. This matches the architecture doc's "Tailwind CSS — utility-first" intent; the AC text was written against pre-v4 expectations. **Tailwind IS wired correctly** — proof: utility classes resolve and the dev server compiled the default page (which uses Tailwind utilities) without error.

2. **`CLAUDE.md` not copied from scaffold.** create-next-app v16 emits a one-line `CLAUDE.md` (`@AGENTS.md`). The existing repo `.gitignore` explicitly treats `CLAUDE.md` and `.claude/` as local-only AI-assistant artifacts ("Team-shared agent context (AGENTS.md, .github/copilot-instructions.md) is committed"). Skipping the file keeps the convention intact; AGENTS.md is the team-shared surface and is committed.

3. **`package.json` name** changed from default `nextjs-scaffold` to `bmad_demo` (matches `_bmad/bmm/config.yaml` `project_name`).

**Validation summary (against ACs):**
- AC1 — Existing artifacts preserved: `_bmad/`, `_bmad-output/`, `training/`, `LICENSE`, `README.md` all present and untouched (mtime unchanged on README/LICENSE). Scaffold artifacts present: `src/`, `next.config.ts`, `tsconfig.json`, `package.json`, `eslint.config.mjs`, `postcss.config.mjs`, `AGENTS.md`. Empty `docs/` removed. `.gitignore` merged.
- AC2 — `npm install && npm run dev` boots Next.js 16.2.6 on Turbopack at `localhost:3000`; HTTP 200 confirmed.
- AC3 — `engines.node >=20`, scripts `dev/build/start/lint` present, `next@16.2.6`, `react@19.2.4`, `react-dom@19.2.4`.
- AC4 — `strict: true` and `paths."@/*": ["./src/*"]` confirmed in `tsconfig.json`.
- AC5 — `.nvmrc` contains `20`.
- AC6 — Tailwind v4 wired (postcss + globals.css import); `eslint.config.mjs` flat config present; `next.config.ts` empty `NextConfig` (no React Compiler flag).
- AC7 — `AGENTS.md` present (placeholder content from scaffold; customization deferred to Epic 6 per AC).

**Test approach note:** Story 1.1 introduces no application code beyond the scaffold; the boot smoke test (`npm install && npm run dev` → HTTP 200) is the meaningful verification at this layer. Vitest/Playwright frameworks land in later stories per the architecture's Test Strategy section. Once those frameworks land, this story's ACs become candidates for guardrail tests (file-existence checks, repo-shape assertions, boot smoke).

## File List

**New files (from scaffold copy):**
- `AGENTS.md`
- `eslint.config.mjs`
- `next.config.ts`
- `next-env.d.ts` (auto-generated; gitignored per merged `.gitignore`)
- `package.json`
- `package-lock.json`
- `postcss.config.mjs`
- `tsconfig.json`
- `public/file.svg`
- `public/globe.svg`
- `public/next.svg`
- `public/vercel.svg`
- `public/window.svg`
- `src/app/favicon.ico`
- `src/app/globals.css`
- `src/app/layout.tsx`
- `src/app/page.tsx`

**New files (story-authored):**
- `.nvmrc`
- `tailwind.config.ts` (added during code-review resolution)
- `_bmad-output/implementation-artifacts/1-1-scaffold-nextjs-app.md` (this file)
- `_bmad-output/implementation-artifacts/deferred-work.md` (created by code-review skill)

**Modified files:**
- `.gitignore` (merged scaffold additions and story extras into existing repo `.gitignore`; code-review patch moved `*.pem` to a Secrets section and added `*.key`)
- `package.json` (renamed to `bmad_demo`; added `engines.node >=20`; code-review patch added `--turbopack` to `dev` script)
- `src/app/globals.css` (code-review resolution added `@config "../../tailwind.config.ts";`)

**Deleted files/directories:**
- `docs/` (empty; removed per AC1)

## Change Log

- 2026-05-07 — Story file authored from epics.md §Epic 1 / Story 1.1
- 2026-05-07 — Implementation completed; status set to `review`
- 2026-05-07 — Code review run: 1 decision-needed resolved (Option 1 — generated `tailwind.config.ts`, wired via `@config` in `globals.css`); 3 patches applied (`--turbopack` in dev script, `*.pem` reclassified, story Task 1 wording reconciled); 7 items deferred to `deferred-work.md`; 7 dismissed. Re-smoke: HTTP 200. Status set to `done`.

