# Copilot Instructions — bmad_trainer (AI Contribution Framework)

> **Companion to [`AGENTS.md`](../AGENTS.md).** Both files MUST stay in sync on every load-bearing constraint. Drift between them is a defect — when you change one, change the other in the same PR.

This is a Next.js + Express + SQLite training portal that teaches teams to adopt **BMAD** (a spec-driven AI development framework) and govern AI-assisted contributions via GitHub-native controls.

## Load-bearing constraints

- **Every change ships against a story file** at `_bmad-output/implementation-artifacts/<epic>-<n>-<slug>.md`. The user-story and acceptance criteria are immutable from the agent's side; agents update only the Dev Agent Record, tasks, file list, change log, and status.
- **Plain markdown only** for curriculum content under `training/`. No MDX. No React in lessons.
- **No egress.** Zero outbound network calls from portal-owned code. The trainee's AI tool makes model calls; the portal does not.
- **No auth surface.** Local-first, single-user. No login screens. No identity sessions.
- **Paired-CI invariant.** `.vela.yml` and `.github/workflows/ci.yml` run the same npm scripts. Drift is a defect.
- **Quad gate before merge:** `npm run test:unit` + `npm run test:e2e` + `npm run lint` + `npm run lint:links` all green.
- **No emojis in committed code, story files, or commit messages** unless explicitly requested. Curriculum prose may use them sparingly.
- **No AI attribution** in commits, PRs, or docs.

## Tech stack

- Node >= 20, Next.js 16 (Turbopack dev), TypeScript, ESLint
- better-sqlite3 (DB), Zod (validation), Tailwind + Typography (style)
- unified + remark-* + rehype-* + rehype-pretty-code (markdown pipeline)
- Vitest (unit), Playwright (e2e)
- node-pty + xterm (interactive PTY for capstone phase chat)
- BMAD installed under `_bmad/` and `.claude/skills/bmad-*` (version is whatever `npx bmad-method@latest install` resolved at install time)

## Canonical npm scripts

- `npm run dev` — local dev server (http://localhost:3000)
- `npm run build` / `npm run start` — production
- `npm run lint` / `npm run lint:links` — ESLint and link-integrity scan
- `npm run test:unit` / `npm run test:e2e` — Vitest, Playwright
- `npm run reset-progress` — wipe local SQLite progress DB
- `npm run seed-chat-test-session` — seed capstone session for e2e/dev

## Conventions

- **Server components by default.** Client components need `"use client"` and must NOT import `src/lib/db/*`.
- **Validation at boundaries.** Route Handlers validate request bodies with Zod and reject malformed input with 400 + flattened details.
- **Subprocess discipline.** All spawns go through `src/lib/capstone/run-streaming.ts` (tracked-children registry). Never call `child_process.spawn` directly.
- **Tests live next to source.** `foo.ts` + `foo.test.ts`. E2E specs in `tests/e2e/`.
- **DB path** is configurable via `BMAD_DATABASE_PATH`; default `./data/progress.sqlite`.

## No-go zones

Do not modify without explicit story authorization:

- `_bmad/` — installed by `bmad-method install`; re-install only.
- `.claude/skills/bmad-*` — installed BMAD skills; same.
- `.github/CODEOWNERS` — governance decision; needs a story.

## Curriculum content rules

When editing under `training/`:

- Coding-skill-neutral framing (no "as an engineer..." prose)
- Self-reference: cite this repo's `_bmad-output/`, `.claude/skills/bmad-*` etc. as worked examples
- Tool names capitalized in prose ("Claude Code", "GitHub Copilot"), lowercase in IDs (`claude-code`)
- Consistent terminology: "artifact chain", "story-as-contract", "lead-approval gate", "five recovery loops"
- Every relative link must resolve under `npm run lint:links`

## When unsure

1. Read the story file you're working against.
2. Read [`_bmad-output/planning-artifacts/architecture.md`](../_bmad-output/planning-artifacts/architecture.md).
3. Re-read [`AGENTS.md`](../AGENTS.md) (this file's longer companion).
4. Surface the ambiguity in the story or PR — that's Recovery Loop #2.
