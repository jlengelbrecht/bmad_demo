# BMAD Demo: Training Portal

A runnable training resource that teaches teams how to adopt **BMAD** — a framework for spec-driven software development with AI agents — and how to govern AI-assisted contributions in a shared codebase. The portal teaches BMAD using *this repo's own* artifacts: its PRD, architecture document, stories, and `CODEOWNERS` file are the lesson material.

## Maintainer

Curriculum maintainer: **Devbox** ([@jlengelbrecht](https://github.com/jlengelbrecht)). Open an issue on this repo for questions, bugs, or content suggestions.

> **Bus-factor disclosure (v1):** this repo currently has a single curriculum maintainer. That is a known v1 limitation. The v1.1 maintainer-succession plan — co-maintainer onboarding, a documented hand-off ritual, and a contributor ladder — is a deliberate post-v1 follow-up tracked outside this README.

## Quickstart

Requires **Node 20+** and **npm**.

```bash
git clone https://github.com/jlengelbrecht/bmad_demo.git
cd bmad_demo
npm install
npm run dev
```

The dev server starts on `http://localhost:3000` (Next.js falls back to the next free port if 3000 is taken — check the terminal output). No account, no signup, no remote services — open the URL and pick a path.

## Pick your path

The portal home page presents three audience-entry cards. You can also navigate by route or read the markdown sources directly:

- **Trainee — Start Here** · route `/start-here` · markdown [`training/00-start-here.md`](training/00-start-here.md) — six lessons, three labs, ~3 hours self-paced. Ends with a capstone that produces a real BMAD artifact set.
- **Stakeholder — 15-minute Demo** · route `/stakeholder` · markdown `training/stakeholder-demo-script.md` *(coming in a future release)* — a timed walkthrough of what BMAD looks like in practice and the trade-offs it makes, with explicit objections and answers.
- **Facilitator — Workshop Guide** · route `/facilitator` · markdown `training/facilitator-guide.md` *(coming in a future release)* — timing, prompts, and rituals to run a half-day or full-day BMAD workshop with your team.

## Supported AI tooling

The curriculum and labs target four AI coding tools commonly used on product teams:

- **Claude Code**
- **GitHub Copilot**
- **OpenAI Codex** (CLI and ChatGPT agent)
- **OpenCode**

A team can mix tools across engineers — Lesson 5 covers how to keep BMAD coherent when team members use different agents. Per-tool setup notes will live in `training/tools-reference.md` once Epic 6 authors them.

## Repo structure

```
bmad_demo/
├── src/                                Next.js App Router source (pages, components)
├── public/                             Static assets vendored locally
├── training/                           Curriculum markdown (lessons, labs, audience guides)
├── _bmad/                              Installed BMAD framework (skills, scripts, configs)
├── _bmad-output/
│   ├── planning-artifacts/             PRD, product brief, architecture, epic breakdown
│   └── implementation-artifacts/       Per-story specs, code-review records, deferred work
├── AGENTS.md                           Shared agent context for AI tooling
├── eslint.config.mjs                   ESLint flat config
├── next.config.ts                      Next.js config (intentionally minimal)
├── tsconfig.json                       TypeScript strict mode + @/* alias
├── tailwind.config.ts                  Tailwind v4 content scan + theme inline in globals.css
└── LICENSE                             MIT
```

The planning artifacts in `_bmad-output/planning-artifacts/` are the actual output of running BMAD on this project — they are the curriculum's reference examples and the contracts the implementation follows.

## Platforms and constraints

- **Operating systems:** macOS, Linux, and Windows via WSL2.
- **Runtime floor:** Node **20+** (declared in `package.json` `engines.node` and `.nvmrc`). Node 22 LTS works without re-pinning.
- **Package manager:** npm only for v1. Yarn / pnpm support is post-v1.

## What's NOT in v1

bmad_demo is intentionally narrow at v1 to keep the curriculum legible. The portal does **not** include:

- **Authentication or user accounts.** The local user is trusted. Progress will persist to a local SQLite file once Epic 3 wires the storage layer.
- **A SaaS deployment target.** The portal runs locally only — `npm run dev` for trainees, `npm run start` for production-mode local.
- **Remote services or telemetry.** No analytics, no error reporters, no font CDNs, no external APIs.

The full scope and non-capability list is the canonical concern of [`_bmad-output/planning-artifacts/prd.md`](_bmad-output/planning-artifacts/prd.md) — read that document if you are evaluating whether bmad_demo fits a particular adoption context.

## License

MIT. See [`LICENSE`](LICENSE).
