---
title: Tools reference — Claude Code / Codex / GitHub Copilot / OpenCode
verifiedVersions: 'Claude Code 2.1.x · Codex 0.130.x · GitHub Copilot CLI 1.0.44 · OpenCode 0.x'
reviewedAt: '2026-05-09'
---

# Tools reference

> **What this is.** Per-tool friction notes for the four AI tools this curriculum supports. Pin a copy in your team's repo so adopting teammates have the install + auth + common-issues notes at hand.

> **Maintenance cadence.** This file is reviewed **quarterly** by the curriculum maintainer. Each review updates the `verifiedVersions` and `reviewedAt` frontmatter above. If the frontmatter's `reviewedAt` is more than 120 days old, the portal's staleness banner surfaces above this content automatically. If you are reading this and the banner is showing, the content may be out-of-date — open an issue or consult the upstream tool docs.

> **Scope of this file.** Tool-specific install steps, auth steps, and pitfalls each tool's CLI has hit in our experience. Conceptual material (when to use which tool, the tool-agnostic-contract claim) lives in the lessons; this file is the operational reference.

---

## Claude Code

**Verified version (at last review):** 2.1.x

### Install

```bash
# macOS / Linux
curl -fsSL https://claude.ai/install.sh | bash
```

Or via your platform's package manager if available. See the [official install guide](https://docs.claude.com/en/docs/claude-code) for the up-to-date install command.

### Authentication

```bash
claude auth status            # Check current state
claude /login                 # Authenticate (opens browser)
```

Authentication can use either an Anthropic API key or a Claude.ai subscription. The `claude auth status` command reports both paths.

### Capstone-relevant launch shape

The portal launches Claude Code with:

```
claude --dangerously-skip-permissions "/bmad-product-brief"
```

The `--dangerously-skip-permissions` flag skips per-tool-use approval prompts for the capstone (which would otherwise fire dozens of times during a normal workflow). Outside the capstone, leaving the flag off is the safer default.

### Common pitfalls

- **`AGENTS.md` vs `CLAUDE.md`.** Claude Code reads `CLAUDE.md` natively. To honor the `AGENTS.md` cross-tool standard, many teams symlink: `ln -s AGENTS.md CLAUDE.md`. Verify the symlink works on your platform before relying on it.
- **Auth timeout.** Long-running capstone sessions can outlast the auth token. If you see "auth required" mid-session, run `claude /login` and continue — your work is saved.
- **The skill registry.** Skills under `.claude/skills/<skill-name>/` are discovered automatically when Claude Code runs from the directory containing them. If `/bmad-product-brief` isn't recognized, confirm you're running from the bootstrapped repo's root.

---

## Codex (OpenAI CLI)

**Verified version (at last review):** 0.130.x

### Install

```bash
npm install -g @openai/codex
```

Or follow [developers.openai.com/codex/cli](https://developers.openai.com/codex/cli) for the platform-specific install.

### Authentication

```bash
codex login status            # Check current state
codex login                   # Authenticate (interactive)
```

Authentication paths:

- **ChatGPT subscription** (Plus / Team / Enterprise) — sign in with your ChatGPT account.
- **OpenAI API key** — `export OPENAI_API_KEY=sk-...` in your shell.

The `codex login status` command reports which path is active.

### Capstone-relevant launch shape

```
codex --dangerously-bypass-approvals-and-sandbox "/bmad-product-brief"
```

The bypass flag skips approval prompts and the sandbox; required for capstone-style flows where the tool is doing many file modifications. Outside the capstone, the safer default is to leave the bypass off and approve actions individually.

### Common pitfalls

- **`/skills` listing.** `codex exec --skip-git-repo-check "/skills"` lists installed BMAD skills — useful for confirming auto-discovery works.
- **Auth-status probe vs. real call.** The portal's auth probe used to spawn `codex exec --json "reply with the single word OK"` which charged a real API call per page-load. The current probe uses `codex login status` (free, accurate). If you see slow setup-page loads in older portal versions, this is why.
- **Subscription auth + agent-message vocabulary.** Earlier Codex versions returned event types the portal's probe didn't match for ChatGPT-subscription auth. The `codex login status` switch resolved this. If you see "sign in needed" but `codex login status` reports authenticated, file an issue.

---

## GitHub Copilot CLI

**Verified version (at last review):** 1.0.44

### Install

```bash
gh auth login                          # Authenticate to GitHub
gh extension install github/gh-copilot # Install the Copilot CLI extension
copilot --version                      # Verify install
```

Or follow [docs.github.com/copilot/concepts/agents/about-copilot-cli](https://docs.github.com/en/copilot/concepts/agents/about-copilot-cli) for the up-to-date instructions.

### Authentication

```bash
copilot login                 # Browser-based OAuth (preferred)
# OR rely on the existing gh auth token if you've authenticated via gh
```

The portal's auth probe reads `~/.copilot/config.json::lastLoggedInUser.login` (JSONC-aware — it strips `// ...` line comments before parsing). If you see "sign in needed" but `~/.copilot/config.json` shows your login, the JSONC parse may be failing on an unfamiliar variant; file an issue.

### Capstone-relevant launch shape

```
copilot --allow-all-tools -i "/bmad-product-brief"
```

`-i` is documented as "Start interactive mode and automatically execute this prompt." `--allow-all-tools` is required for non-interactive auto-action; outside the capstone, drop it for explicit per-action prompting.

### Common pitfalls

- **`gh api user/copilot_billing` 404.** Earlier portal versions probed this endpoint to check Copilot auth; it returns 404 regardless of auth state because it's not a valid REST endpoint for that purpose. Current probe reads `~/.copilot/config.json` directly.
- **Subscription required.** Copilot CLI requires a GitHub Copilot subscription (individual or business). The auth probe will succeed with a stale token; the actual run will fail mid-flow if the subscription has lapsed.
- **`-p` vs `-i`.** `-p` is non-interactive (prints output and exits); `-i` is interactive (drops you into a chat session with the prompt pre-executed). The capstone uses `-i`.

---

## OpenCode

**Verified version (at last review):** 0.x (pre-1.0; rapid-release; check upstream)

OpenCode is the newest of the four tools at the time of this curriculum's authoring. The capstone runtime in this portal does not currently launch OpenCode (only Claude Code, Codex, and GitHub Copilot are wired). However:

- **OpenCode reads `AGENTS.md`** natively — the dual-role pattern in Lesson 5 applies.
- The conceptual material in this curriculum (artifact chain, story-as-contract, recovery loops) is framework-level and applies regardless of which AI tool the team uses.
- A team adopting OpenCode can run the lessons + labs without modification; the capstone would need to be run with a different tool initially, with OpenCode brought in for day-to-day BMAD work afterward.

### Install + auth

See [opencode.ai](https://opencode.ai) for the current install + auth instructions. The CLI is updating rapidly; refer to the upstream for current state.

### Common pitfalls

(Add as your team's experience accumulates. The curriculum maintainer would welcome a PR to this section.)

---

## When a tool's behavior surprises you

Three steps before assuming the tool is broken:

1. **Confirm version.** Run `<tool> --version` and compare to the verified versions in this file's frontmatter. If your version is significantly newer or older, behavior may differ from what's documented.
2. **Confirm auth.** Run the tool's auth-status command (Claude Code: `claude auth status`; Codex: `codex login status`; Copilot: check `~/.copilot/config.json`). Auth-status mismatches account for the majority of "the tool is broken" reports.
3. **Confirm `AGENTS.md` and `.github/copilot-instructions.md` exist** at the repo root and carry the load-bearing constraints. Tools that don't see those files will improvise.

If all three check out and the tool still surprises you, file an issue (in your team's repo if internal; in this curriculum's repo if cross-team) with the version, the auth path, and the exact prompt that surprised you.

---

## Maintenance

To re-verify this file:

1. Install or update each tool to current.
2. Walk the capstone for at least one tool, end-to-end.
3. Update `verifiedVersions` and `reviewedAt` in this file's frontmatter.
4. Update any "Verified version" lines per section.
5. Add new pitfalls for anything that surprised you.
6. Commit. The PR routes through CODEOWNERS (curriculum maintainer + leads).

The cadence is **quarterly.** Setting a calendar reminder is the cheapest way to keep this honest.

---

## See also

- [Lesson 1 — What is BMAD](lessons/1-what-is-bmad.md) — when each of these tools matters in the chain
- [Lesson 5 — Working as a team](lessons/5-working-as-a-team.md) — the dual-role `AGENTS.md` + `.github/copilot-instructions.md` pattern these tools rely on
- [Facilitator guide](facilitator-guide.md) — what to send attendees a few days before a workshop
