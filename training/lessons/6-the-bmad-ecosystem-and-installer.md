---
title: The BMAD ecosystem and installer
---

# Lesson 6 — The BMAD ecosystem and installer

> **Reading time:** ~15 minutes. **Prerequisites:** Lessons 1–5.

## What you'll learn

- The **modules** BMAD ships beyond the BMad Method itself — what each one does, when to install it.
- The **AI tools** BMAD knows how to wire — the four well-supported ones plus ~38 others you may have heard of.
- The **prompts** the installer asks during `npx bmad-method install`, and what each option gives you.
- **Community modules + custom sources** — how the ecosystem extends beyond what BMAD ships, and the trade-off of using third-party content.
- A practical **decision frame** for picking modules + tools the first time your team installs.

This lesson sits right before the capstone for a reason: in a few minutes you'll be answering BMAD's installer prompts for real. The capstone runs a lean install (BMM core + your AI tool), but knowing what *else* is on the menu matters when you bring BMAD home to your team afterward.

---

## What BMAD installs: the modules

BMAD is **modular**. The framework's published documentation at [docs.bmad-method.org](https://docs.bmad-method.org/) catalogs five top-level modules. Two are always present; three are opt-in.

| Module | Code | What it does | When to install |
|---|---|---|---|
| BMad Core | `core` | Shared scripts (the `resolve_customization.py` resolver, manifest tooling), the agent activation contract, the customization-overlay mechanism. | **Always** — required by every other module. |
| BMad Method | `bmm` | The four-phase methodology pipeline: `1-analysis` → `2-plan-workflows` → `3-solutioning` → `4-implementation`. Produces the artifact chain (brief → PRD → architecture → epics → stories → dev story). | **Always for spec-driven workflows.** This is what most people mean when they say "BMAD." |
| BMad Builder | `bmb` | Meta-module for *authoring your own* BMAD agents, skills, and publishable modules. | Pick this when your team plans to extend BMAD with custom skills or share modules across teams. |
| Test Architect | `tea` | Risk-based test strategy and automation skills — generating test plans, e2e specs, evaluating coverage gaps. | Pick this when your team has a meaningful test discipline (or wants one). |
| Game Dev Studio | `bmgd` | Unity / Unreal / Godot game-dev workflows — sprite pipelines, shader-shop conventions, etc. | Pick this only if you're shipping a game. |
| Creative Intelligence Suite | `cis` | Innovation, brainstorming, design-thinking facilitation skills (separate from BMM's analysis-phase skills). | Pick this if your team wants structured creative-discovery workflows that aren't tied to a product brief. |

You select modules at install time with `--modules <comma-separated>`. The capstone in this portal installs only `core` + `bmm` because that's what the artifact chain needs. After the capstone, your team can re-run `npx bmad-method install` against the same repo with additional modules — BMAD merges into the existing install rather than replacing it.

### A decision frame

If you don't know what to pick the first time, this is the default that works:

- **Always install:** `core` + `bmm`. They're the methodology.
- **Add `bmb`** if anyone on the team will build custom skills or agents. (Most teams won't, the first six months.)
- **Add `tea`** if your team takes testing seriously and wants risk-based test planning to live next to the artifact chain.
- **Skip `bmgd` and `cis`** unless they obviously apply.

You can always add modules later. Skipping today doesn't lock you in.

---

## Compatible AI tools

When BMAD installs, it asks which AI tool(s) you'll use it with — and copies skills + agents into the directory each tool expects. Run `npx bmad-method install --list-tools` to see the full list (~42 tools at the time of this curriculum's authoring). They group into roughly four buckets:

### The three the portal capstone supports

| Tool | Skills land at | Notes |
|---|---|---|
| **Claude Code** | `.claude/skills/` | Anthropic's CLI. The reference implementation BMAD's documentation tracks first. |
| **Codex (OpenAI CLI)** | `.agents/skills/` | OpenAI's CLI. Works well with BMAD; uses the cross-tool `.agents/skills/` convention. |
| **GitHub Copilot CLI** | `.agents/skills/` | Note: Copilot in the IDE reads `.github/copilot-instructions.md` instead — see Lesson 5 on the dual-role pattern. |

These three have each been validated end-to-end against the BMAD artifact chain. BMAD's installer supports many more (see the next section); these three are the portal's first-class set.

### Cross-tool standard tools (`.agents/skills/`)

A growing set of CLI agents agreed to read skills from `.agents/skills/` (the convention the [Agentic AI Foundation](https://agents.md/) is converging on). BMAD knows how to install for any of these — most teams won't use all of them, but if your developer is on one of the lesser-known ones, BMAD likely already supports it:

> AdaL (`.adal/skills/`) · Auggie · Block Goose · Cline (`.cline/skills/`) · CodeBuddy (`.codebuddy/skills/`) · Command Code · Crush · Factory Droid (`.factory/skills/`) · Firebender (`.firebender/skills/`) · Gemini CLI · Google Antigravity (`.agent/skills/`) · IBM Bob (`.bob/skills/`) · iFlow (`.iflow/skills/`) · Junie (`.junie/skills/`) · KiloCoder · Kimi Code · Kiro (`.kiro/skills/`) · Kode (`.kode/skills/`) · Mistral Vibe · Mux · Neovate (`.neovate/skills/`) · Ona (`.ona/skills/`) · OpenClaw · OpenCode · OpenHands · Pi · Pochi · Qoder (`.qoder/skills/`) · QwenCoder (`.qwen/skills/`) · Replit Agent · Roo Code · Rovo Dev · Snowflake Cortex Code (`.cortex/skills/`) · Sourcegraph Amp · Trae (`.trae/skills/`) · Warp (`.warp/skills/`) · Windsurf (`.windsurf/skills/`) · Zencoder (`.zencoder/skills/`)

You don't need to memorize this list. The point is: **if your team uses an AI CLI, BMAD probably already knows where to install for it.** Run `--list-tools` to confirm.

### Why this matters

When two engineers on the same team use different tools, the *contract* between them is the per-story file (Lesson 3). What BMAD's installer ensures is that **both tools see the same skill set** — they read from different directories on disk, but the skills themselves are bit-identical copies. Mira on Claude Code and Jordan on Codex both run `/bmad-create-story` and get identical workflow guidance.

---

## What the installer asks you

When you run `npx bmad-method install` (which the capstone runs for you), BMAD walks an interactive prompt sequence. Knowing the prompts in advance means you can answer them deliberately rather than scrolling for documentation mid-install.

The major prompts:

### Path-related

- **Installation directory** (`--directory <path>`) — *where* BMAD installs. Default: current directory. The capstone's setup wizard collects this from you in advance and passes it via `--directory`.
- **Project name** (`--user-name` overrides the OS username; project name comes from the directory). Used in artifact frontmatter and the capstone's `product-brief-<project_name>.md` filename.
- **Output folder** — where BMAD writes generated artifacts. Default: `_bmad-output/`. Lesson 4's CODEOWNERS rules will reference this path, so picking a non-default name (e.g. `bmad-artifacts/`) means the CODEOWNERS file your team adopts post-capstone needs the matching path.

### Module + tool selection

- **Modules** (`--modules <ids>`) — comma-separated list of module codes. See the table earlier in this lesson.
- **Tools** (`--tools <ids>`) — comma-separated list of AI tool ids. Pick more than one if your team is mixed-tool.

### Conventions + style

- **User name** — your name, used in agent greetings ("Hi Mira"). Default: your OS username.
- **Communication language** — the language agents speak in. Default: English.
- **Document output language** — the language artifacts are written in (can differ from communication). Default: English.
- **User skill level** — `beginner` / `intermediate` / `advanced`. Affects how chatty agents are; `beginner` includes more handholding, `advanced` strips it out. Default: `intermediate`.

### Channel + version pinning

- **Channel** — `--channel stable` (the latest tagged release) vs. `--channel next` (main HEAD). Stable is the default and right for production teams. `next` is for trying unreleased features.
- **Pin** — `--pin <module>=<tag>` lets you freeze a specific module to a known version while letting others float to latest. Useful if a `next`-channel module has a known regression.

### Custom sources (community plugins)

- **Custom source** (`--custom-source <git-url>`) — install a module from outside the official BMAD distribution. Repeatable for multiple sources.

The portal's capstone runs `npx bmad-method@latest install --directory <yourPath> --tools <yourTool>` — the rest of the prompts run interactively for you to answer.

---

## Community modules and custom sources

BMAD's official modules are maintained by [bmad-code-org](https://github.com/bmad-code-org/BMAD-METHOD). The framework also supports **custom modules** — third-party packages installable from any git URL via `--custom-source`.

The community ecosystem is small but real:

- A team can publish their internal BMAD-flavored skills (e.g. company-specific code-review conventions) to a private git repo and install via `--custom-source`.
- Open-source community modules exist for specific stacks — though the supply varies and many haven't been audited.

**The trade-off:** custom modules execute the same way official modules do (skills get loaded by your AI tool; `customize.toml` overrides apply). A malicious custom skill could, in theory, instruct your tool to do something you didn't intend. Treat `--custom-source` URLs the way you'd treat a `package.json` dependency — pin to a known commit, audit the source, prefer modules from organizations you trust.

For your team's first BMAD adoption, **stick to official modules.** Add custom sources only when there's a specific need that the official catalog doesn't cover.

---

## Putting it together: a default install

For a typical engineering team adopting BMAD for the first time, this is the install command you'd run (or, equivalently, what to answer when the interactive installer prompts you):

```bash
npx bmad-method@latest install \
  --directory /path/to/your/repo \
  --modules core,bmm \
  --tools claude-code,codex,github-copilot \
  --channel stable
```

The capstone in this portal runs a leaner version (`--tools <one>` only, since you pick one tool) — but the shape is the same. Once you've completed the capstone, this is the command you'll copy-paste into your team's actual repo on Day 2.

---

## What's next

You now have the full conceptual picture (Lessons 1–5) and the installer's option-space (this lesson). **Lesson 7** frames the capstone — the 90–120 minute synthesis exercise where you'll experience the artifact chain by running it on a fresh repo through your own AI tool.

When you bring BMAD home to your team after the capstone, this lesson is the one you'll come back to. The install command at the bottom of this page is the cheat-sheet for Day 2.
