# AI Contribution Framework

A runnable training resource that teaches teams how to govern AI-assisted contributions in a shared codebase. The framework uses **BMAD** as its reference implementation — a spec-driven development methodology with AI agents — but the underlying principles (spec-as-contract, CODEOWNERS-gated review, cross-tool propagation, AI-and-non-AI contribution paths) apply regardless of which framework or tooling a team adopts. The portal teaches by example, using *this repo's own* artifacts: its PRD, architecture document, story specs, `CODEOWNERS`, and `CONTRIBUTING.md` are the lesson material.

## Maintainer

Curriculum maintainer: **Joshua Engelbrecht** ([@JoshuaEngelbrecht](https://github.com/JoshuaEngelbrecht)). Open an issue on this repo for questions, bugs, or content suggestions.

> **Bus-factor disclosure (v1):** this repo currently has a single curriculum maintainer. That is a known v1 limitation. The v1.1 maintainer-succession plan — co-maintainer onboarding, a documented hand-off ritual, and a contributor ladder — is a deliberate post-v1 follow-up tracked outside this README.

## Quickstart

Two paths. Pick whichever matches your machine.

### Native install (Linux, macOS)

Requires **Node 20+** and **npm**.

> **macOS users:** the native install path requires **Xcode Command Line Tools** because `node-pty` and `better-sqlite3` compile native modules during `npm install`. If you don't have them, run `xcode-select --install` first — `npm install` will otherwise fail with a `node-gyp` build error. **If you'd rather skip the native-build setup entirely, use the [devcontainer path below](#run-in-a-devcontainer-linux-macos-windows)** — it bakes the toolchain inside a Linux container so your host doesn't need it.

```bash
git clone https://git.cglcloud.com/JoshuaEngelbrecht/bmad_trainer.git
cd bmad_trainer
npm install
npm run dev
```

The dev server starts on `http://localhost:3000` (Next.js falls back to the next free port if 3000 is taken — check the terminal output). No account, no signup, no remote services — open the URL and pick a path.

You'll also need at least one of the supported AI-tool CLIs installed and authenticated on your host: **Claude Code**, **Codex**, or **GitHub Copilot CLI**. Per-tool install + auth notes live in [`training/tools-reference.md`](training/tools-reference.md).

### Run in a devcontainer (Linux, macOS, Windows)

> **Recommended for macOS and Windows trainees.** Devcontainer is the lowest-friction path on these OSes because it skips the native-build toolchain setup (Xcode CLT on Mac, Visual Studio Build Tools on Windows). Linux users can still pick whichever path they prefer.

The portal ships a devcontainer config (`.devcontainer/Dockerfile` + `.devcontainer/devcontainer.json`) that produces a Linux dev environment with Node 22, the native-build toolchain (`build-essential`, `python3` — what `node-pty` and `better-sqlite3` need), `git`, `gh`, `sqlite3`, and the **Claude Code + Codex** CLIs pre-installed. Use this if you're on Windows, or if you want to skip per-OS native-module pain on macOS.

**Prerequisites:**

- Docker Desktop, OrbStack, or Podman
- One of:
  - **VS Code** with the [Dev Containers extension](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-containers)
  - **GitHub Codespaces** (the repo's `.devcontainer/` is honored automatically)
  - **JetBrains Gateway**
  - The standalone [devcontainer CLI](https://github.com/devcontainers/cli) (no editor required)

**Open the repo in a container:**

VS Code:

1. Open the repo folder in VS Code.
2. Cmd/Ctrl-Shift-P → "Dev Containers: Reopen in Container". First build is ~2–3 min; subsequent opens are seconds.
3. The editor forwards port 3000 and shows a notification with the URL.
4. In the container's integrated terminal, run `npm run dev`.

Standalone CLI (no editor):

```bash
# Build + start the container (one-time)
devcontainer up --workspace-folder .

# Run the dev server inside the container
devcontainer exec --workspace-folder . npm run dev
```

The repo bind-mounts at `/workspaces/bmad_trainer` inside the container; edits on your host show up immediately, and vice versa.

**Authenticate your AI tool inside the container on first use:**

```bash
# Claude Code
claude /login

# Codex
codex login

# GitHub Copilot CLI (gh auth must come BEFORE the extension install)
gh auth login
gh extension install github/gh-copilot
```

Tokens land under `~/.claude/`, `~/.codex/`, `~/.config/gh/` inside the container's home directory, which the devcontainer convention persists across container restarts — sign in once, rebuild the image without losing auth.

**Rebuilding after Dockerfile changes:**

If you edit `.devcontainer/Dockerfile` or `devcontainer.json`, rebuild the image so the change takes effect.

- VS Code: Cmd/Ctrl-Shift-P → "Dev Containers: Rebuild Container"
- CLI: `devcontainer up --workspace-folder . --remove-existing-container`

**Troubleshooting:**

- **Port 3000 already forwarded to another container.** Stop the other container or change the forwarded port in `.devcontainer/devcontainer.json` (`forwardPorts`).
- **`npm install` fails on `better-sqlite3` / `node-pty`.** This shouldn't happen in the container — the toolchain is baked in. If it does, rebuild the image (above).
- **Claude / Codex `command not found`.** The image installs them as the `node` user; PATH includes `/home/node/.local/bin`. Open a fresh shell in the container after install completes.
- **Capstone wants to write to a path on your host.** The trainee's chosen capstone directory must be a path **inside the container** (`/workspaces/...` or `/home/node/...`). Paths from your host won't be reachable.

**Why a devcontainer?** This is a training tool meant to work cross-OS. Native installs of `node-pty` and `better-sqlite3` surface platform-specific build pain (Xcode CLT on macOS, Visual Studio Build Tools on Windows). Pushing the runtime into a Linux container makes the install path uniform. Native install still works on Linux/macOS for developers who prefer it.

## Pick your path

The portal home page presents three audience-entry cards. You can also navigate by route or read the markdown sources directly:

- **Trainee — Start Here** · route `/start-here` · markdown [`training/00-start-here.md`](training/00-start-here.md) — six lessons, three labs, ~3 hours self-paced. Ends with a capstone that produces a real BMAD artifact set.
- **Stakeholder — 10-minute guided tour** · route `/stakeholder` — a six-panel interactive walkthrough designed for a screen-share demo. Each panel deep-links into THIS repo's real artifacts (PRD, architecture, story specs, CODEOWNERS, CONTRIBUTING.md) so stakeholders see what BMAD actually produces, not abstractions. The original markdown script lives at [`training/stakeholder-demo-script.md`](training/stakeholder-demo-script.md) for facilitators who want a read-aloud version.
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
bmad_trainer/
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

- **Operating systems:**
  - **Native install:** macOS and Linux.
  - **Devcontainer:** any OS with Docker — macOS, Linux, Windows (with or without WSL2).
- **Runtime floor:** Node **20+** (declared in `package.json` `engines.node` and `.nvmrc`). Node 22 LTS works without re-pinning. The devcontainer pins Node 22.
- **Package manager:** npm only for v1. Yarn / pnpm support is post-v1.

## What's NOT in v1

The AI Contribution Framework is intentionally narrow at v1 to keep the curriculum legible. The portal does **not** include:

- **Authentication or user accounts.** The local user is trusted. Progress will persist to a local SQLite file once Epic 3 wires the storage layer.
- **A SaaS deployment target.** The portal runs locally only — `npm run dev` for trainees, `npm run start` for production-mode local.
- **Remote services or telemetry.** No analytics, no error reporters, no font CDNs, no external APIs.

The full scope and non-capability list is the canonical concern of [`_bmad-output/planning-artifacts/prd.md`](_bmad-output/planning-artifacts/prd.md) — read that document if you are evaluating whether the framework fits a particular adoption context.

## License

MIT. See [`LICENSE`](LICENSE).
