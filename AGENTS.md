# AGENTS.md — bmad_demo

This file is the **shared contract** for any AI tool (Claude Code, Codex, OpenCode, or others reading the AGENTS.md cross-tool standard) opening this repo. The Copilot-specific companion is at [`.github/copilot-instructions.md`](./.github/copilot-instructions.md) — **the two files MUST stay in sync on every load-bearing constraint below; drift is a defect.**

> **What this repo is.** A Next.js + Express + SQLite training portal that teaches engineering teams to adopt **BMAD** as a team and govern AI-assisted contributions via GitHub-native controls (CODEOWNERS + branch protection). The curriculum is self-referential: lessons walk this repo's own BMAD planning artifacts. See [`README.md`](./README.md) and [`_bmad-output/planning-artifacts/product-brief-bmad_demo.md`](./_bmad-output/planning-artifacts/product-brief-bmad_demo.md) for the full framing.

---

## Load-bearing constraints (do not violate)

These constraints are the contract this repo promises. Violating them is a defect, not a stylistic choice.

1. **Story-as-contract.** Every change ships against a story file at `_bmad-output/implementation-artifacts/<epic>-<n>-<slug>.md`. The story's user-story and acceptance criteria are immutable from the dev agent's side; the agent updates only the Dev Agent Record, tasks/subtasks, file list, change log, and status. See [`training/story-template.md`](./training/story-template.md).

2. **Plain-markdown curriculum (no MDX, no React in lessons).** Lesson and lab content under `training/` is plain markdown rendered through the pipeline at `src/lib/markdown/`. Do not introduce MDX or component-based authoring. Lesson links to repo files use relative paths and are validated by `npm run lint:links`.

3. **No egress (NFR-S1).** The portal makes zero outbound network calls of its own. Every model call goes through the trainee's AI tool's process, under the trainee's auth, on the trainee's machine. Do not introduce code that calls external APIs from any portal-owned route handler, server component, or background script.

4. **No auth surface (FR-2.6).** No login screens, no user accounts, no sessions tied to identity. The portal is local-first, single-user. Trainee progress is keyed by SQLite rows, not by user. If you find yourself adding auth, stop and re-read the architecture.

5. **Paired-CI invariant.** Every CI obligation runs in BOTH `.vela.yml` (primary) and `.github/workflows/ci.yml` (mirror). The same npm scripts, the same versions, the same gates. Drift between the two is a defect (see Story 5.7).

6. **Quad-gate cleanliness before merge.** `npm run test:unit` + `npm run test:e2e` + `npm run lint` + `npm run lint:links` must all be green for a story to be `done`. Do not mark a story complete on red tests.

7. **No emojis in committed source unless explicitly requested.** Curriculum content is allowed to use emoji where the trainee-facing prose calls for it (e.g., the "🎉" on the handoff page); core source code, story files, comments, and commit messages are emoji-free.

8. **No AI attribution in commits, PRs, code, or docs in this repo.** Commits do not carry "Co-Authored-By: Claude" or equivalent. The work is the team's, not the tool's.

9. **Single-tool-of-record per session.** Story files note the tool used to implement only as an optional retrospective field (see story template). Day-to-day, the chosen tool does not constrain reviewers from any other tool.

---

## Tech stack

| Layer | Tool | Version pin |
|---|---|---|
| Runtime | Node | >= 20 |
| Framework | Next.js | 16.x — **breaking changes vs. your training data; heed deprecations** |
| Build | Turbopack (dev), Next build (prod) | per `next` |
| API surface | Express (mounted) + Next Route Handlers | per `next` |
| Database | better-sqlite3 | per `package.json` |
| Validation | Zod | runtime + types |
| Markdown | unified + remark-parse + remark-gfm + remark-rehype + rehype-* + rehype-pretty-code | server-side, request-time |
| Tests (unit) | Vitest | invoked via `npm run test:unit` |
| Tests (e2e) | Playwright | invoked via `npm run test:e2e` |
| Lint | ESLint (`eslint-config-next`) | invoked via `npm run lint` |
| Link integrity | custom tsx script | invoked via `npm run lint:links` |
| TypeScript | tsc | type-checked in CI |
| Style | Tailwind CSS + `@tailwindcss/typography` | per project |
| PTY (interactive terminals) | node-pty + xterm | for capstone phase chat |
| BMAD | `_bmad/` + `.claude/skills/bmad-*` | pinned to v6.6.0 |

---

## Canonical npm scripts

| Script | Purpose |
|---|---|
| `npm run dev` | Local dev server (Turbopack), http://localhost:3000 |
| `npm run build` | Production build |
| `npm run start` | Production server |
| `npm run lint` | ESLint |
| `npm run lint:links` | Static markdown link-integrity scan over `training/` |
| `npm run test:unit` | Vitest unit tests |
| `npm run test:e2e` | Playwright e2e tests |
| `npm run reset-progress` | Wipe the local SQLite progress DB |
| `npm run seed-chat-test-session` | Seed a capstone session for e2e drives (test/dev only) |

When asked to "run the quad gate," run `test:unit`, `test:e2e`, `lint`, `lint:links` in that order.

---

## Repository layout

```
src/
  app/                    Next.js App Router routes (server-component-first)
    api/                  Route Handlers (Next.js APIs)
    capstone/             The trainee-facing capstone harness
    lessons/              Lesson route ([slug]-based)
    labs/                 Lab routes
  lib/
    capstone/             Capstone domain logic (adapters, phases, runtime)
    db/                   SQLite progress store
    markdown/             Markdown pipeline
    lessons/              Lesson sequence + path helpers
training/                 The curriculum content (markdown + checklists)
  lessons/
  labs/
_bmad/                    Installed BMAD methodology source (v6.6.0)
_bmad-output/
  planning-artifacts/     brief / PRD / architecture / epics / research /
  implementation-artifacts/   per-story files + retros + session-state docs
.claude/skills/           BMAD skills (42 skills installed)
scripts/                  tsx CLIs (check-links, reset-progress, seed-...)
tests/
  e2e/                    Playwright specs
  fixtures/               PTY fixture scripts for chat-phase e2e
.github/                  CODEOWNERS, copilot-instructions, workflows
```

No-go zones (do not modify without explicit story authorization):

- `_bmad/` — generated by `bmad-method install`. Modify only via re-install.
- `.claude/skills/bmad-*` — same; these are installed BMAD skills.
- `.github/CODEOWNERS` — modifying ownership is a governance decision; bring a story.

---

## Conventions

### Database access

- All SQLite reads/writes go through `src/lib/db/` modules. Do not import `better-sqlite3` directly elsewhere.
- The DB path is configurable via `BMAD_DATABASE_PATH` env var; default is `./data/progress.sqlite`.
- Test runs use `./data/e2e-progress.sqlite` (set via `playwright.config.ts` webServer.env).

### Server vs. client components

- Default to **server components.** Client components require `"use client"` at the top of the file.
- Client components must NOT import `src/lib/db/*` (compile-time error). Server-side data flows through props.
- Route Handlers under `src/app/api/` are server-only; they handle mutation flows.

### Validation

- All Route Handler request bodies are validated with Zod schemas at the handler boundary. Reject malformed input with 400 + Zod-flattened `details`.

### Subprocess discipline

- All subprocess spawns go through `src/lib/capstone/run-streaming.ts` (the tracked-children registry). Do not call `child_process.spawn` directly.
- Subprocesses are tracked, abortable, and logged per the architecture's NFR-S4 invariants.

### Tests

- Unit tests live next to source: `foo.ts` + `foo.test.ts`.
- E2E specs live under `tests/e2e/`.
- Both must pass before a story is `done` — no exceptions.

---

## Curriculum content rules

When editing files under `training/`:

- **Coding-skill-neutral framing** (FR-5.7). No "as an engineer..." prose; examples include both engineer- and non-engineer-facing scenarios.
- **Self-reference** (FR-5.2). Lessons cite specific files in this repo (`_bmad-output/planning-artifacts/...`, `.claude/skills/bmad-*`) by relative path as concrete instances.
- **Voice consistency.** Tool names capitalized in prose: "Claude Code", "Codex", "GitHub Copilot". Internal IDs lowercased: `claude-code`, `codex`, `github-copilot`.
- **Terminology.** "Artifact chain", "story-as-contract", "lead-approval gate", "five recovery loops" — use these phrases consistently. Don't synonym-cycle.
- **Link integrity.** Every relative link must resolve. `npm run lint:links` runs in CI and over every story's quad gate.

---

## What to do if you're unsure

1. Read the story file you're working against. The contract is there.
2. Read [`_bmad-output/planning-artifacts/architecture.md`](./_bmad-output/planning-artifacts/architecture.md) for repo-wide design decisions.
3. Read this file again — most ambiguities resolve here.
4. If the question is about BMAD itself (a skill's behavior, the framework's structure), see [`_bmad-output/planning-artifacts/research/bmad-mechanics.md`](./_bmad-output/planning-artifacts/research/bmad-mechanics.md).
5. If still unsure, surface the ambiguity in the story file or PR description rather than guessing — that's Loop #2 from the curriculum's recovery loops.

---

<!-- BEGIN:nextjs-agent-rules -->
## Next.js — heads up

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->
