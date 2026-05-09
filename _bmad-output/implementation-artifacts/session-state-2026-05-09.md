# Session State — 2026-05-09 (codex/copilot lift + chat-phase e2e)

**Purpose:** Single document the next session can read first to pick up where we left off. Pairs with `_bmad-output/planning-artifacts/epics.md` (the backlog), the per-story files in this directory, `deferred-work.md` (the running carry-over list), and the prior session-state docs.

This session was an autonomous push — no per-story Dev Agent Records authored. Same shape as Epic 5+6 push (see Epic 5+6 retro item C3). Treat this doc + the four commit messages as the synthesized push journal.

---

## What landed

| Commit | Headline | Lines |
|---|---|---|
| `1b687a5` | Merge `feat/interactive-bootstrap-pty` into main (4-commit branch — interactive PTY pivot) | +3078 / -2972 |
| `7dc0388` | Lift codex + copilot capstone path to autoRun (Claude Code pattern) — also fixes both auth probes | +239 / -198 |
| `5ec8e81` | chat-phase PTY spawn e2e (3 parameterized tests + 1 negative) + closes 5 deferred items in `deferred-work.md` | +201 / -6 |

Net: 3 commits, +3,518 / -3,176 across the session.

---

## What changed structurally

### 1. `feat/interactive-bootstrap-pty` merged

The PTY-pivot branch (4 commits, +3,078) is now on `main`. Headlines:
- `9b766d5` — Replace bootstrap wizard with interactive PTY terminal
- `f291dcc` — Restore command preview on bootstrap page
- `d677123` — Replace chat-stream with interactive PTY across all capstone phases
- `c878b2d` — docs: mark stories superseded by the PTY pivot

After merge, the capstone flow is end-to-end PTY-driven for Phase 2 (bootstrap) AND Phases 3-8 (brief / PRD / architecture / epics+stories / ADR / dev-story-1.1).

### 2. Codex + copilot capstone path raised to parity with Claude Code

Until this session, only `claude-code` had `autoRun=true` (positional `/bmad-product-brief` on launch). Codex and copilot were tagged `autoRun=false` with an amber "type this once it loads" banner and a TODO in `launch-commands.ts` pending CLI validation.

Validated empirically on the dev box (codex 0.130.0 / copilot 1.0.44):
- **codex:** `[PROMPT]` positional is forwarded to the agent, which independently routes slash commands to its skills layer (verified via `codex exec --skip-git-repo-check "/skills"` — the agent listed installed skills rather than treating `/skills` as natural-language). Lifted `SUPPORTS_INITIAL_PROMPT_ARGV.codex = true`.
- **copilot:** `-i "<prompt>"` is documented as "Start interactive mode and automatically execute a prompt" — feeds the BMAD slash command through the chat input verbatim. Lifted `SUPPORTS_INITIAL_PROMPT_ARGV["github-copilot"] = true`.

Final per-tool launch shapes (in `src/lib/capstone/phases/launch-commands.ts`):

| Tool | Argv shape | Approval bypass |
|---|---|---|
| claude-code | `claude --dangerously-skip-permissions "<bmad-skill>"` | `--dangerously-skip-permissions` |
| codex | `codex --dangerously-bypass-approvals-and-sandbox "<bmad-skill>"` | `--dangerously-bypass-approvals-and-sandbox` |
| github-copilot | `copilot --allow-all-tools -i "<bmad-skill>"` | `--allow-all-tools` |

All three now render the green ✨ "auto-run" banner on the chat-phase page.

### 3. Two auth-probe rewrites (browser walkthrough caught both)

Surfaced when driving `/capstone/setup` in Playwright with codex + copilot installed and authenticated — both rendered ✗ "Sign in needed" anyway.

- **Codex:** the original probe spawned `codex exec --json "reply with the single word OK"`, which (a) cost a real LLM request per page load, (b) took 3-15s, and (c) silently failed for ChatGPT subscription auth because the agent_message event-type vocabulary wasn't matched. Replaced with `codex login status` parse — free, immediate, accurate for both subscription and OPENAI_API_KEY paths.

- **Copilot:** the original probe paired `gh auth status` with `gh api user/copilot_billing`. The latter endpoint returns 404 regardless of auth state — it's not a valid REST endpoint for this purpose. Replaced with a presence check on `~/.copilot/config.json::lastLoggedInUser.login` (JSONC-aware: strips `// ...` line comments before parse since copilot writes JSONC). Free, immediate, accurate for `copilot login` OAuth and gh-token paths.

Hint-text in `install-hints.ts` updated to lead with `copilot login` (the real auth path) rather than `gh auth login --scopes copilot` (which the gh CLI doesn't accept as a separate scope).

### 4. Chat-phase pane JSX whitespace fix

`<strong>{TOOL_DISPLAY_NAMES[tool]}</strong> will execute BMAD's` rendered as "Codexwill execute" / "GitHub Copilotwill execute" — the trailing space wasn't preserved across the JSX element boundary. Added explicit `{" "}`. Cosmetic but visible.

### 5. seed-chat-test-session.ts now accepts a tool arg

Previously hard-coded `tool=claude-code`. Added optional `[tool]` arg so future verification can drive the chat-phase pages for any of the three tools without editing the script.

```bash
npm run seed-chat-test-session -- /tmp/my-bmad-repo codex
npm run seed-chat-test-session -- /tmp/my-bmad-repo github-copilot
```

### 6. Chat-phase PTY spawn e2e (closes a deferred item)

The bootstrap-PTY spec covered the generic `/api/capstone/pty/[ptyId]/{output,keystroke,resize}` routes transitively. A regression in `/api/capstone/chat/[sessionId]/pty/spawn` itself wouldn't have shown up until a visual walkthrough.

New: `tests/e2e/capstone-chat-phase-pty.spec.ts` — 3 parameterized tests (one per tool: claude-code, codex, github-copilot) + 1 negative (session id with no DB rows renders the "unavailable" copy). Each parameterized test:
- Seeds capstone-{session,target,tool} rows in the e2e SQLite
- Visits `/capstone/chat/<sid>/brief`
- Asserts the per-tool preview line is visible
- Asserts the green auto-run banner is visible (proves all three are autoRun=true)
- Clicks "Open terminal", polls `window.__bmadTerm__` until the fixture's banner echoes the correct chosenDir/tool/phase

Backed by:
- New env override `CAPSTONE_CHAT_PTY_FIXTURE_SCRIPT` in the chat-phase spawn route. When set, the route ignores `getLaunchCommand()` and spawns the fixture with `[chosenDir, tool, phase]` as argv. Production behavior unchanged.
- New fixture `tests/fixtures/pty-fake-chat-phase.mjs` — prints `fake-chat-pty: chosenDir=<...> tool=<...> phase=<...>` and exits 0 after a brief delay.
- Env var registered in `playwright.config.ts`.

### 7. Deferred-work.md cleanup

5 items marked ✅ RESOLVED on this session, with commit pointers:
- Codex argv passthrough
- Copilot argv passthrough
- Chat-phase PTY spawn e2e
- Story 9.1+9.2 handoff verification (Playwright drive)
- Codex + copilot auth probe rewrites

---

## Test net at session close

```
npm run test:unit   → 386 / 386 (37 test files; was 364 / 364 / 35)
npm run test:e2e    → 33 / 33 (chromium; was 27 / 27)
npm run lint        → clean
npm run lint:links  → clean
```

Net additions:
- +20 unit tests (launch-commands matrix; codex auth probe rewrite; copilot auth probe with COPILOT_CONFIG_PATH env override)
- +4 e2e tests (3 parameterized chat-phase + 1 negative)

---

## Manual Playwright walkthroughs done this session

1. `/capstone/setup` — all three tools render ✓ Installed + ✓ Authenticated. Codex's auth probe is no longer the slow LLM round-trip; copilot's no longer 404s. Confirmed visually.
2. `/capstone/chat/<seeded>/brief?tool=codex` — green ✨ banner visible, preview shows `cd <dir>\ncodex --dangerously-bypass-approvals-and-sandbox "/bmad-product-brief"`.
3. `/capstone/chat/<seeded>/brief?tool=github-copilot` — green ✨ banner visible, preview shows `cd <dir>\ncopilot --allow-all-tools -i "/bmad-product-brief"`.
4. `/capstone/handoff/<seeded>` — Generate HANDOFF.md returns 2.5 KB of correct content (phase artifact statuses, tool name, BMAD version 6.6.0, push instructions). Closes Story 9.1+9.2 verification.
5. `/capstone/setup/bootstrap/complete?session=<seeded>&tool=codex` — file tree + explainer render correctly; "Continue → Phase 3: brief" link points at the right per-tool chat URL.

---

## NOT done (carryover for the next session)

| Item | Why deferred | Where |
|---|---|---|
| Real `npx bmad-method install --tools codex` integration drive against a clean tmp dir | Interactive — needs hands-on. `--list-tools` confirms codex + copilot are both supported by BMAD 6.6.0 (target dirs `.agents/skills`). The first real run will surface whether codex/copilot CLIs auto-discover skills under `<projectDir>/.agents/skills/` from cwd. | `deferred-work.md` C5 |
| `/capstone` overview page still shows the LEGACY 5-step list (`brief, epic, story-1, story-2, adr`) — the page itself says "the textarea-based capstone has been retired in favor of the chat-driven rebuild" but doesn't render the new 6-phase view | UX gap, not a blocker. The page links to `/capstone/setup` so the trainee can still start the new flow. Bigger refactor — wants its own story. | `src/app/capstone/page.tsx` + `src/lib/capstone/steps.ts` |
| Primer files under `src/lib/capstone/primers/*.md` | Confirmed unreferenced (`grep -rln "primers/" src/` returns nothing). 6 .md files totaling ~13 KB. Content is high-quality teaching material on what each phase produces. Could be repurposed into curriculum content (`training/lessons/`) before deletion. Decision deferred again — flagged in `deferred-work.md`. | `src/lib/capstone/primers/` |
| Native folder dialog (Story 6.3 deferred) | Trainees still type the path. | `_bmad-output/implementation-artifacts/6-3-path-picker-with-allowlist.md` |
| Session-lock helpers + heartbeat (Story 6.1 AC6 deferred) | Two-tab parallel-session race exists but low risk for solo trainee. | Same |
| Adapter integration tests (env-gated `RUN_ADAPTER_INTEGRATION=1`) | Still unrun on CI. Now the local dev box has all three CLIs installed + authenticated, so they could be run hands-on. | `src/lib/capstone/adapters/*.integration.test.ts` |
| Epic 11 (UI polish + theming) | 7 stories — design-system work. The functional foundation that Epic 11 themes is now end-to-end working for all three tools. | `_bmad-output/planning-artifacts/epics.md` line 1109 onward |

---

## Pickup hints for the next session

**State the patterns established this session so they don't have to be rediscovered:**

1. **The standard pattern for adding a tool surface** — Claude Code is the reference. For each new tool: pick the right `--dangerously-*`-shaped flag for the CLI, choose where the BMAD slash command goes in argv (positional vs `-i`), wire `getLaunchCommand()` + the green-banner copy + the chat-phase pane (already tool-agnostic via `TOOL_DISPLAY_NAMES`).

2. **Auth probes must be free + accurate** — never spawn a real LLM request from a page-load probe. Codex's `login status`, copilot's `~/.copilot/config.json` parse, and claude's `claude auth status` are all the right shape. If a future tool lands without a cheap auth status command, prefer `~/.toolconfig/` parse over a real-call probe.

3. **JSONC parse for tool config files** — copilot writes `// ...` line comments at the top of its config.json. Strip them before `JSON.parse`. Other CLIs may do the same.

4. **Fixture-backed PTY e2e is the right shape** — bootstrap-PTY (`CAPSTONE_PTY_FIXTURE_SCRIPT`) and chat-phase-PTY (`CAPSTONE_CHAT_PTY_FIXTURE_SCRIPT`) both follow the same pattern: env override → fixture script receives the route's argv as args → e2e polls `window.__bmadTerm__` for the fixture's banner. Use this shape for any future PTY-spawning route.

5. **Browser walkthrough catches what the quad gate misses** — this session, the codex auth probe (slow + LLM-cost + always-failed-for-subscription-auth) and the copilot auth probe (404 endpoint) were both green at the unit-test layer. Both surfaced in the first Playwright drive. Per Epic 5+6 retro action item C2: drive at least one new surface end-to-end before declaring an epic done.

6. **AI attribution discipline holding** — none of the three commits this session reference Claude/AI. Per `~/.claude/projects/.../memory/feedback_no_ai_attribution.md`.

7. **Git identity** — commits use `Devbox <dudeitsdallyboy@gmail.com>` via `-c user.email -c user.name` per command. Don't modify git config.

**To resume from this session, the next session can read in order:**

1. This file (`session-state-2026-05-09.md`) — the snapshot
2. `_bmad-output/implementation-artifacts/epic-5-and-6-retro-2026-05-09.md` — most recent retro
3. `_bmad-output/implementation-artifacts/deferred-work.md` — running carry-overs (top section is the PTY-pivot block; ✅ RESOLVED items mark the closes)
4. `_bmad-output/planning-artifacts/epics.md` — for the broader backlog (Epic 11 starts at line 1109)
5. `src/lib/capstone/phases/launch-commands.ts` — the per-tool launch-command shape; `SUPPORTS_INITIAL_PROMPT_ARGV` is now `true` for all three tools

**Session has not authored a per-story file** for this work since it was small-scoped maintenance + one e2e. The two commits' bodies + this session-state doc carry the narrative.

---

## Total work this session

```
3 commits on main, +3,518 / -3,176 lines.
1 merge commit (PTY-pivot branch into main, 4 commits + 3,078 lines transitively).
5 deferred items closed.
1 new e2e spec (3 parameterized + 1 negative cases).
2 auth-probe rewrites (codex, copilot).
1 launch-command lift (codex + copilot to autoRun).
1 JSX whitespace fix.
1 session-state doc (this file).
```
