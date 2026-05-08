---
stepsCompleted: [1, 2, 3, 4]
inputDocuments: ['_bmad-output/implementation-artifacts/4-1-capstone-schema.md', '_bmad-output/implementation-artifacts/4-2-capstone-save-handler.md', '_bmad-output/implementation-artifacts/4-3-capstone-overview.md', '_bmad-output/implementation-artifacts/4-4-capstone-step-page.md', '_bmad-output/planning-artifacts/architecture.md', '_bmad-output/planning-artifacts/prd.md']
session_topic: 'Capstone rebuild: tool-portable BMAD bootstrapping experience that hooks the portal UI into the trainee local AI coding tool, runs npx bmad-method install against a trainee-chosen path, then walks the trainee through artifact production via chat-proxy.'
session_goals: 'Surface hard unknowns (per-tool chat-proxy mechanics; tool detection; graceful degradation); pin setup-phase UX (path picker, existing-dir handling, question shape); clarify pedagogy beats (portal-driven vs tool-driven moments); pin threat-model expansion (subprocess + arbitrary path writes); minimize Epic 4 throwaway.'
selected_approach: 'ai-recommended'
techniques_used: ['Question Storming', 'Reverse Brainstorming', 'First Principles Thinking']
ideas_generated: 104
context_file: ''
session_active: false
workflow_completed: true
---

# Brainstorming Session Results

**Facilitator:** Devbox
**Date:** 2026-05-08

## Session Overview

**Topic:** Capstone rebuild — tool-portable, localhost-only BMAD bootstrapping experience that hooks the portal UI into the trainee's local AI coding tool, runs `npx bmad-method install` against a trainee-chosen path, then walks the trainee through artifact production via a chat-proxy.

**Goals:**

1. Surface hard unknowns — per-tool chat-proxy mechanics (which of the 30+ supported tools have programmatic chat-piping? Claude Code, Codex, GitHub Copilot, Cursor, OpenCode each are different), tool detection (sniff PATH vs. ask), graceful degradation for tools with no chat-piping interface.
2. Pin setup-phase UX — path picker, "existing dir conflicts" handling, question shape (single form vs. multi-step wizard), defaults strategy, validation.
3. Clarify pedagogy beats — moment-to-moment trainee experience; portal-driving vs. tool-driving boundary; "I'm done, now what?" handoff moment.
4. Pin threat-model expansion — portal now writes outside its own tree and spawns subprocesses against trainee-chosen paths. Confirmation, sandboxing, "are you sure" gates.
5. Minimize Epic 4 throwaway — what reuses cleanly vs. what's structurally incompatible.

### Context Guidance

Heterogeneous problem surface: technical (subprocess + chat-piping per tool), UX (setup wizard, path picker, error states), pedagogical (when is the portal driving vs. the trainee's tool driving), risk (writing outside the training repo, spawning AI processes). Brainstorm should generate ideas across all of these without collapsing prematurely into one frame.

Hard constraints carrying in:
- NO external cloud calls from the portal (NFR-S1).
- Chat is a proxy to a trainee-local AI tool (Claude Code, Codex, Copilot, OpenCode, etc.). Portal is the orchestrator + UI.
- 30+ tools supported by `npx bmad-method install --tools`; not all of them have CLI/IPC surfaces a portal can pipe.
- Architecture's "two POST endpoints, period" lock will break — that's fine, but the new endpoint set must be intentional.
- Existing Epic 4 stays at HEAD during planning; this brainstorm informs the rebuild.

### Session Setup

Approach: AI-Recommended Techniques.

## Technique Selection

**Approach:** AI-Recommended Techniques
**Analysis Context:** capstone rebuild — defensive + exploratory first, visionary already known.

**Recommended Techniques:**

- **Phase 1 — Question Storming** *(deep, ~20 min)*: enumerate questions across the 5 goals before any answers. Output: question inventory that becomes the spec for what later phases (and the architecture doc) need to address.
- **Phase 2 — Reverse Brainstorming** *(creative, ~15-20 min)*: how could the rebuilt capstone fail spectacularly? Generate failure modes across subprocess, install, chat-protocol, path-write, threat-model. Output: failure inventory that informs the threat-model expansion.
- **Phase 3 — First Principles Thinking** *(creative, ~15 min)*: strip back; given questions + failures, what does the capstone fundamentally need to do, in v1? What's irreducible vs. theatre vs. v1.1 deferral. Output: spec-shaped artifact for the PRD-edit step.

**AI Rationale:** the success state is already crisp from the user's feedback (trainee finishes with a working team repo). What's missing is rigor about unknowns (Phase 1), failure modes (Phase 2), and minimum viable shape (Phase 3). Defensive + exploratory before visionary.

## Technique Execution Results

### Phase 1: Question Storming

**Format:** questions surfaced + design positions that emerged from confirm/push-back facilitation. Where positions are firm, the brainstorm has effectively answered the question; where they're "🤔" they're starting points for the architecture/PRD work.

**The vision (load-bearing sentence for the architecture doc):**

> The portal includes an "AI Tool Abstraction Layer" that runs the trainee's local AI tool as a background subprocess (terminal-style). The portal UI renders that subprocess's chat as if it were native, captures the trainee's typed messages and forwards them to the subprocess, and additionally invokes shell commands (npx, git, mkdir) on behalf of the trainee in response to their answers during setup. The abstraction is per-tool (Claude Code / Codex / OpenCode / etc.) with a uniform contract upward to the portal. Mac + Linux first; WSL2/Windows out of scope for v1.

#### Cluster 1: Per-tool chat-proxy mechanics (technical research items — pursued in architecture step)

- **[Q-Tech-1]:** Does Claude Code expose a programmatic / non-interactive invocation surface? (CLI flag for primer prompt, IPC socket, file-based protocol?) — *answer determines whether `claude` is pipe-able*.
- **[Q-Tech-2]:** Same question for Codex, OpenCode, gemini-cli.
- **[Q-Tech-3]:** Which tools are IDE-only (Cursor, GitHub Copilot in VS Code) and CAN'T be piped from a separate UI without an extension? — *answer determines our v1-supported tool list*.
- **[Q-Tech-4]:** Does `node-pty` work cleanly on Mac + Linux? Performance per session?
- **[Q-Tech-5]:** Long-running subprocess vs. spawn-per-message — what's the right pattern?
- **[Q-Tech-6]:** Streaming protocol portal-to-browser — SSE, WebSocket, or Next.js `Response` streaming?
- **[Q-Tech-7]:** Bootstrap commands (npx install, git init) — same subprocess infra or separate "shell runner"?
- **[Q-Tech-8]:** Adapter format — TS module? YAML manifest? Hybrid?
- **[Q-Tech-9]:** Per-tool primer prompt translation — does Claude Code accept the same BMAD skill text as Codex, or does each need format-specific massaging?
- **[Q-Tech-10]:** ANSI escape code / TUI-output handling — strip? render via xterm.js?

#### Cluster 2: Setup-phase — questions + design positions

**[Setup-1]: Pre-flight check** (Phase 0)
*Concept*: Before tool selection even loads, the portal probes node, git, npx versions and shows green/red status with actionable hints. Fails fast.
*Novelty*: The current capstone has zero environment validation; bugs surface mid-bootstrap. Pre-flight inverts that.

**[Setup-2]: Tool-auth check** (Phase 0.5)
*Concept*: After tool selection, run a tool-specific probe (e.g., `claude auth status`) before the path picker. Don't proceed unless green. Subprocess invocation; same abstraction pattern as everything else.
*Novelty*: Current Epic 4 has no auth concept at all; this surface is new.

**[Setup-3]: Tool selection comes FIRST**
*Concept*: First wizard step. Drives adapter, --tools flag, auth-check shape, primer-prompt translation. Path / project-name come after.
*Novelty*: Inverted from a "fill out one form" pattern; tool is the load-bearing decision and surfaces FIRST.

**[Setup-4]: Multi-step wizard, not single form**
*Concept*: Each step validates before proceeding. Per-step back is non-destructive — install runs only at the END, after preview-confirm.
*Novelty*: One-form-with-30-fields invites cascading failures the trainee can't diagnose; the wizard makes each failure local.

**[Setup-5]: Curated v1 tool list with detection badges**
*Concept*: Show ONLY tools we have adapters for. Add a "✓ detected on your system" badge via $PATH sniff per tool. Don't surface all 30+ from `bmad-method install --list-tools`.
*Novelty*: Honest about what works rather than letting trainees pick something we can't drive. Detection adds polish without paternalism.

**[Setup-6]: Hard-stop on missing tool, not auto-install**
*Concept*: If the picked tool isn't on PATH, hard-stop with link to install instructions. Portal doesn't auto-install third-party AI tools. Reload-page-when-ready flow.
*Novelty*: Auto-install would be an invasive, security-sensitive, trust-eroding move. Hard-stop respects the trainee's machine.

**[Setup-7]: 4-path existing-dir handling**
*Concept*: doesn't exist → offer to create. exists empty → proceed. exists with random files → hard warn + typed confirmation. exists git repo OR exists with `_bmad/` → block with two distinct messages.
*Novelty*: Current Epic 4 writes blindly (no path conflict handling at all).

**[Setup-8]: Hard refuse on existing real git repo**
*Concept*: If picked path is already a git repo, block. Force a fresh path. Their own repo is sacred.
*Novelty*: Avoids any risk of corrupting trainee's existing work.

**[Setup-9]: Show literal install command in preview**
*Concept*: Before confirm, render the exact `npx bmad-method install --directory <path> --modules bmm --tools claude-code --set core.project_name=<name> ...` command. Pedagogy: trainees see what they could have run themselves.
*Novelty*: Reinforces "BMAD is just npm + a CLI" mental model.

**[Setup-10]: Path picker = text input + native dialog button**
*Concept*: Text input with live validation; "Browse" button shells out to `osascript -e 'choose folder'` (Mac) or `zenity --file-selection --directory` (Linux). v1 simple.
*Novelty*: Avoids browser File System Access API limits; uses subprocess pattern we're already committed to.

**[Setup-11]: Post-install pause is pedagogical**
*Concept*: After bootstrap, NOT auto-jump to Phase 2. Show "✓ repo bootstrapped" + file tree + git log + collapsible "▼ what just happened" with verbatim npx output. Trainee clicks Next.
*Novelty*: The pause IS the lesson — they see what BMAD just gave them before talking to it.

#### Cluster 3: Artifact-production-phase — questions + design positions

**[Prod-1]: Show full agent output (tool calls included)**
*Concept*: Don't sanitize the chat. Tool-call traces ("▶ reading brief.md...") are visible. The agent isn't a black box; trainees see how BMAD-with-your-tool actually feels.
*Novelty*: Anti-magic pedagogy. The current Epic 4 has no chat at all; this position carves the new shape.

**[Prod-2]: Distinctly portal-ish chrome (NOT a clone of trainee's tool)**
*Concept*: Different framing from native tool chrome. Trainees know they're in training rails; their day-2 invocation through the tool's native UX will feel different (and that's fine).
*Novelty*: Avoids the confusion of "is this BMAD or is this my IDE?"

**[Prod-3]: Each phase = separate conversation; cross-phase context = artifacts on disk**
*Concept*: Phase 4 (PRD) starts a fresh chat; the agent loads brief.md from the new repo as part of the primer. Visible "▼ Loading prior artifacts: brief.md (1.2KB)..." panel.
*Novelty*: This IS the lesson. BMAD's artifact-chain is the protocol. One long conversation across phases would teach "AI keeps everything in memory" — wrong message.

**[Prod-4]: Show BMAD primer per phase (collapsible)**
*Concept*: Each phase has a "▼ BMAD primer loaded for this phase" panel showing the actual skill markdown. Trainees see what BMAD's instructions look like — empowers them to author their own.
*Novelty*: Reinforces "BMAD is portable markdown + a CLI" — not magic.

**[Prod-5]: Inline diff/file-write preview in chat**
*Concept*: When the agent writes/modifies a file, render the diff inline in the chat stream. End-of-phase: small "files changed in this phase" tree.
*Novelty*: Closure moments. Trainees see what landed.

**[Prod-6]: Don't fight side-channel access**
*Concept*: Trainee can `cd` into the new repo from their own terminal at any time. The agent picks up their changes on the next turn. Document as a feature.
*Novelty*: Anti-lockdown stance. Files are the contract; the agent isn't a black box.

**[Prod-7]: Phase-done = trainee click (not agent magic marker)**
*Concept*: Each phase has a "Done with brief" button. Disabled until the expected artifact file exists. Reliable across tools; gives the trainee a "yes I read what BMAD produced" beat.
*Novelty*: Magic markers from the agent are brittle (different tools format differently); the click is robust + pedagogically valuable.

**[Prod-8]: NO skip-phase button**
*Concept*: Trainees walk the chain. If they want a stub, they ask the agent ("give me a placeholder ADR"). Skipping breaks pedagogy.
*Novelty*: Resists the "make it skippable" UX reflex.

**[Prod-9]: Streaming chat with inline tool-call status + cancel**
*Concept*: Token-by-token streaming. Inline "▶ reading brief.md..." for tool calls. Cancel button always present (sometimes agents wander).
*Novelty*: Standard chat UX, applied to the agent-output-not-LLM-output context.

**[Prod-10]: Don't-like-it = re-prompt within chat + hidden hand-edit escape**
*Concept*: The affordance to revise an artifact is "talk to the agent about it." Hidden hand-edit affordance for emergencies. NO "try again" button.
*Novelty*: Misframing the agent as a slot machine ("regenerate") would teach the wrong mental model. Talking-to-the-agent is BMAD-native.

**[Prod-11]: Chat transcripts saved into the repo**
*Concept*: Each phase ends writing `.bmad/transcripts/<phase>.md` into the new repo. Committed.
*Novelty*: Trainees take their conversation home as evidence + reference. Plus: future BMAD users can review what worked.

#### Cluster 4: Failure / recovery — questions + design positions

**[Fail-1]: Resume = show state, trainee chooses**
*Concept*: On reopen, show "you were on Phase 4, last message was '...'. Artifacts so far: [...]. [Resume here] [Start over]". No auto-resume — kicking off an AI call without consent is hostile.
*Novelty*: Trust > seamlessness in pedagogy.

**[Fail-2]: Tool-switch mid-capstone = restart**
*Concept*: Picking a different tool mid-capstone is a hard restart. Engineering cost of supporting hot-swap is way higher than the ergonomic cost of restart.
*Novelty*: Sometimes "no" is the right product answer.

**[Fail-3]: Real errors, not friendly stubs**
*Concept*: Install fails → show actual stderr + retry/abort. AI tool crashes → show exit code + last 20 lines of output. No "something went wrong" generic strings.
*Novelty*: Trainees are adults. Technical errors empower them to debug or copy-paste to community.

**[Fail-4]: Re-spawn cold on resume (don't replay chat history)**
*Concept*: On phase resume, spawn a fresh agent process; it loads artifacts on disk as primer context. Don't try to replay prior chat history into the agent.
*Novelty*: Conflating "session" with "conversation" is the bug. Files are the contract; prior chat is for the trainee, not the agent.

**[Fail-5]: Half-install detection + recovery options**
*Concept*: On resume, if `_bmad/` exists but manifest is partial, offer "reset and retry" (rm -rf + re-run) or "continue from here" (idempotent re-run). Trainee chooses.
*Novelty*: Acknowledges Ctrl-C is a real exit pattern.

**[Fail-6]: No session timeout in v1**
*Concept*: Hostile and not needed. Trainees thinking IS the lesson. Subprocess can idle.
*Novelty*: Resists the "timeout to save resources" reflex.

**[Fail-7]: Surface tool-side errors verbatim, including auth/rate-limit**
*Concept*: API expired / rate-limited / quota → surface the error string the tool emitted. We don't manage their auth.
*Novelty*: Anti-paternalistic. Bonus: justifies the no-cloud-proxy stance — we never have their API key.

#### Cluster 5: End-of-capstone — questions + design positions

**[End-1]: Push to remote = optional homework**
*Concept*: NOT part of the capstone proper. After completion, optional helper: "want help pushing? [Guide me] [I'll do it myself]". Guide gives the literal git commands.
*Novelty*: Pushing is a TEAM action, not a training action. Their team's org might not be set up yet.

**[End-2]: CODEOWNERS taught with placeholder usernames**
*Concept*: During capstone, generate a `.github/CODEOWNERS` with placeholder lines + commit comments showing how to fill in. Don't ask for real teammate handles (privacy-hostile).
*Novelty*: Teaches without being invasive.

**[End-3]: Generate a "share with my team" one-pager**
*Concept*: Final artifact written to the new repo: `BMAD_HANDOFF.md` summarizing what was produced, why, and what their team needs to do to adopt. Closes the value loop.
*Novelty*: Without this, trainees walk away with a directory; with it, they walk into Monday standup with a story.

**[End-4]: Final phase = DEV a sample story**
*Concept*: After ADR, a Phase 8 where the agent implements story 1.1 end-to-end. Real code lands. Tests optionally. The repo finishes with one working feature, not just plans.
*Novelty*: BIGGEST shift from current Epic 4. Pedagogy: "BMAD ends with code, not docs." Single most important addition; alone justifies the rebuild.

**[End-5]: Phase shape revised**
*Concept*: 0=preflight, 0.5=tool+auth, 1=wizard, 2=bootstrap, 3=brief, 4=PRD, 5=arch, 6=epics+stories, 7=ADR, 8=DEV story 1.1, 9=handoff doc + push helper.
*Novelty*: 10 phases (vs. current Epic 4's 5 textareas). Heavier surface, real-er value.

### Phase 2: Reverse Brainstorming — failure mode triage

**Format:** 66 failure modes generated across 9 surfaces, then triaged into action-bearing categories. The triage IS the output: it tells the architecture step what to defend, the PRD what to constrain, the implementation what to test, and the deferred-work doc what to acknowledge.

#### Critical Design Changes (architecture-anchoring)

**[F-CRIT-1]: Adapter sandboxes agent filesystem to CHOSEN_DIR**
*Concept*: The agent runs with trainee privileges; without sandboxing it can read ~/.aws/credentials, write to /etc/hosts, exfiltrate secrets into transcripts. The adapter intercepts the agent's tool calls (file reads, writes, shell commands) and rejects any path outside CHOSEN_DIR. Surfaces in chat as "tool tried to write outside the project — denied."
*Novelty*: This is the central security claim of the rebuild. Without it, the capstone is unsafe to run on a real machine. Covers failures #27 (prompt injection), #36 (agent writes outside dir), #40 (agent commits secrets), #62 (sensitive files in transcripts).

**[F-CRIT-2]: Path picker allowlist**
*Concept*: Hard-refuse paths that resolve at-or-under: portal's process.cwd(), ~/.ssh, ~/.aws, ~/Library, ~/.config, /etc, /usr, /var, /private, /System, ~ itself, dotfile-bearing dirs. Force trainees onto ~/projects/<name>/ or ~/code/<name>/ patterns.
*Novelty*: Critical specifically because of failure #18 — without this guard, a trainee picking the portal's own path would corrupt the training repo. Covers #18, #19.

**[F-CRIT-3]: Phase-done is artifact-existence + shape-validation gated**
*Concept*: Done button disabled until (a) expected artifact file exists in CHOSEN_DIR, (b) it parses as markdown with the BMAD template shape (required H1, required sections per phase). Anti-hallucination, anti-minimum-effort, anti-blind-clickthrough.
*Novelty*: Single gate that defends multiple failure modes. Covers #33, #34, #38, #51, #54, #66.

**[F-CRIT-4]: One active session per session-id (two-tab lock)**
*Concept*: API enforces session lock. Second tab on same session sees "another tab is active — close it or reload here to take over." Prevents two subprocesses racing over the same files.
*Novelty*: Cheap to implement (Lock at /api boundary), prevents a class of corruption. Covers #25, #58.

**[F-CRIT-5]: Subprocess lifecycle ownership**
*Concept*: Portal registers SIGINT/SIGTERM handlers that kill child subprocesses before exit. Periodic reaper sweeps zombies. Session→pid map persisted so portal restart can offer cleanup of orphans. v1 minimum: kill children on Ctrl-C.
*Novelty*: Without this, subprocesses leak across sessions, eventually exhausting pty count and degrading the trainee's machine. Covers #4, #29, #59.

**[F-CRIT-6]: Portal binds 127.0.0.1 only**
*Concept*: Architectural lock. Never 0.0.0.0. Verify in Next.js dev-server config + npm run start flag. Add to architecture's NFR-S1 surface as "no remote-reachable endpoints, ever."
*Novelty*: One config flag prevents a "anyone on coffee shop wifi can git init my home dir" disaster. Covers #60.

**[F-CRIT-7]: Phase 8 (dev story 1.1) requires green tests**
*Concept*: The "ends with code, not docs" promise is unkept if the code doesn't run. Phase-done gate runs the repo's test command (`npm test` or detected); refuses Done on red. Trainee leaves with a working feature.
*Novelty*: Without this, Phase 8 is just another markdown phase wearing code clothes. Covers #63.

#### Defended (engineering work)

**[F-DEF-1]: Heartbeat for agent-waiting-on-stdin**
*Concept*: No-output-for-N-seconds → surface "tool may be waiting; type or [cancel]". Distinguishes "thinking" from "stuck."
*Novelty*: Simple watchdog; covers #2, #8.

**[F-DEF-2]: Stream output cap + expandable**
*Concept*: 1MB hard cap on chat-rendered tool-call output. "Show full output" expandable for debug.
*Novelty*: Anti-OOM; covers #3.

**[F-DEF-3]: Stream-aware UTF-8 decoder**
*Concept*: TextDecoder with fatal:false; partial-codepoint buffering across chunks.
*Novelty*: Standard streaming-decode practice; covers #5.

**[F-DEF-4]: ANSI/TUI rendering**
*Concept*: xterm.js for full TUI fidelity, OR strip ANSI for plain-chat experience. Choice tied to Q-Tech-10.
*Novelty*: Open architectural decision in the architecture step; covers #6.

**[F-DEF-5]: SIGPIPE = early-exit flag**
*Concept*: Track expected-completion state; SIGPIPE without our consent flags as "exited unexpectedly."
*Novelty*: Differentiates clean exit from broken pipe; covers #7.

**[F-DEF-6]: Adapter ack queue**
*Concept*: Adapter-layer message queue with sequence/ack so fast successive messages don't race.
*Novelty*: Standard pattern; covers #9.

**[F-DEF-7]: Pre-filled install + stdin timeout**
*Concept*: All `--set` flags pre-filled at install time; `--yes` flag; no-stdin-input watchdog. If install opens an unexpected prompt, surface "install asked something we didn't expect: <output>" + abort.
*Novelty*: Anti-deadlock; covers #10.

**[F-DEF-8]: Half-install detection + recovery**
*Concept*: Manifest-presence check on resume. Offer rm-and-retry or continue. Documented but not silent.
*Novelty*: Acknowledges Ctrl-C is real; covers #11, #16.

**[F-DEF-9]: Always-explicit cwd in subprocess spawns**
*Concept*: Pass `--cwd` (Node spawn option) explicitly for every subprocess. Never trust ambient cwd.
*Novelty*: Covers #14; defensive against subprocess working-dir drift.

**[F-DEF-10]: Argv-style spawn, never shell strings**
*Concept*: Always pass paths and flags as separate argv entries, never as a shell-interpreted string. Node's spawn handles quoting per-OS correctly.
*Novelty*: Covers #21, #45.

**[F-DEF-11]: Tool re-check at phase 2 spawn**
*Concept*: If sniffer lied at setup, fail at spawn time with a clean error. Idempotent re-check.
*Novelty*: Covers #28.

**[F-DEF-12]: Stream re-subscribe on tab focus**
*Concept*: When tab regains focus, re-subscribe to the chat stream. If subscription dead, show "stale tab — [reload]".
*Novelty*: Covers #30.

**[F-DEF-13]: Trainee-message size cap**
*Concept*: 8k soft warning, 32k hard cap. Anti-context-blowout.
*Novelty*: Covers #31.

**[F-DEF-14]: Surface tool's safety-filter refusal verbatim**
*Concept*: Don't dress up the agent's refusal. Surface "your tool's safety filter rejected this; rephrase or contact tool support."
*Novelty*: Honest about what's happening; covers #32.

**[F-DEF-15]: Cancel button + tool-call iteration cap**
*Concept*: Always-present cancel; cap on consecutive tool-call iterations (e.g., 20) to prevent infinite loops.
*Novelty*: Anti-runaway-agent; covers #37.

**[F-DEF-16]: Detect 429 / rate-limit patterns**
*Concept*: Pattern-match the tool's rate-limit error in stream; surface "rate limited; retry?" with countdown if known.
*Novelty*: Covers #47.

**[F-DEF-17]: Subprocess timeout**
*Concept*: All long-running subprocesses (npx install, especially) have a max wall-clock timeout. Kill + surface error on hit.
*Novelty*: Covers #50.

#### Threat-Model items (architecture doc must call out)

**[F-TM-1]: Adapter sandboxing as security boundary** — formalizes F-CRIT-1 in the architecture's threat-model section.

**[F-TM-2]: Path-write allowlist** — formalizes F-CRIT-2.

**[F-TM-3]: Subprocess lifecycle ownership** — formalizes F-CRIT-5.

**[F-TM-4]: Localhost-binding lock (127.0.0.1 only)** — formalizes F-CRIT-6.

**[F-TM-5]: BMAD version pinning at install**
*Concept*: `npx bmad-method@<exact-version> install ...` not just `npx bmad-method install`. Drift between dev's tested version and trainee's runtime is a known known. Document upgrade path.
*Novelty*: Covers #15, #48.

**[F-TM-6]: Tool-version drift detection**
*Concept*: Adapter declares supported version range for its tool (e.g., claude-code@>=1.0.0). Runtime check at spawn; clean error if outside range. Surface "your <tool> version is X; v1 capstone tested with Y. <upgrade-link>"
*Novelty*: Covers #46.

#### Deferred-but-known

- iCloud-synced paths (#17) → warn if path under known sync dirs; document.
- NFS / network mount writes (#23) → surface fs errors verbatim.
- macOS Gatekeeper (#41) → rare; document workaround.
- Mac xattrs reset failure (#43) → rare; document.
- /tmp tmpfs full (#44) → very rare; surface error.
- AI tool's history file may capture answers (#61) → out of portal's control; document.
- 3-day resume agent-version drift (#65) → not a bug; document.
- Generic one-pager (#57) → Epic 6 curriculum iterates on the template.

#### Pedagogical defenses (UI contract)

**[Ped-1]: Review-the-artifact panel** — render the file before Done is clickable. Anti-clickthrough; covers #33, #51.

**[Ped-2]: "I've read this and it represents my work" checkbox** — gates Done. Covers #51, #54.

**[Ped-3]: HANDOFF.md "how to invoke BMAD in your tool natively" section** — bridges portal-chat to day-2 invocation. Covers #52, #53.

**[Ped-4]: HANDOFF.md checklist** — explicit "fill in CODEOWNERS placeholders before merging to main." Covers #56.

**[Ped-5]: Per-phase quality-checklist** — "the brief should include customer, problem, solution, success metric — does yours?" Anti-minimum-effort. Covers #38.

**[Ped-6]: "Have you completed the lessons?" gentle gate at Phase 0** — non-blocking but informative. Covers #55.

#### Phase 2 wrap-up

**Total failure modes:** 66
**Critical design changes:** 7
**Defended cases:** 17
**Threat-model items:** 6
**Deferred-known:** 8
**Pedagogical defenses:** 6

Phase 2 has produced a real threat-model spec. The architecture step now has 7 critical design changes that anchor decisions, 6 threat-model items that need explicit treatment, and 17 defended cases that become engineering tickets.

### Phase 3: First Principles Thinking — v1 scope spec

**Format:** strip back. Forget Epic 4. Forget the failure modes. If we had to ship the v1 capstone in one week with one core promise, what would it be? Then layer back.

#### Core promise (the load-bearing sentence for the PRD)

> "A trainee who finishes the capstone has **experienced BMAD by chatting through the full artifact chain with their AI tool**, and walks away with a fresh git repo at a path of their choosing — BMAD-installed, populated with brief.md + prd.md + architecture.md + epics.md + at least one story.md + an ADR + **working/tested code for story 1.1**, plus a HANDOFF.md they can show their team Monday morning."

The verb is non-negotiable. "Experienced by chatting" is the differentiator from the current textarea-form Epic 4. Locked.

#### Irreducible (v1 floor — must ship)

1. **Tool selection + adapter** — claude-code AND codex. Two adapters at v1 so the abstraction is real, not aspirational.
2. **Pre-flight check** (Phase 0) — node/git/npx versions.
3. **Tool-auth pre-check** (Phase 0.5) — log-in-to-tool gate. Cheap surface, prevents mid-stream Phase 3 disasters.
4. **Path picker with allowlist** — F-CRIT-2.
5. **`npx bmad-method install`** invocation — Phase 2 bootstrap.
6. **Install-command transparency** — exact command shown before Confirm. Pedagogy: trainee sees what they could have run themselves.
7. **Setup-bail = no persistence** — nothing on disk until Phase 2 completes. Setup answers live in browser session. Only post-install do we have a session record.
8. **"Abort & clean up" affordance during Phase 2** — kills subprocess AND removes partially-installed CHOSEN_DIR with typed confirmation.
9. **Adapter sandboxing** (F-CRIT-1) — agent file ops constrained to CHOSEN_DIR.
10. **Chat surface** that proxies the agent — basic streaming, message-in/out, cancel button.
11. **Phase-done gate** (F-CRIT-3) — artifact-existence + shape validation.
12. **Phases 3-7** — brief, PRD, architecture, epics+stories, ADR.
13. **Phase 8 dev story 1.1** with green-tests gate (F-CRIT-7).
14. **"What BMAD just did" explainer screen** between bootstrap and Phase 3 (Ped-7) — anti-jarring-transition.
15. **HANDOFF.md generation** — the "what's next" doc.
16. **Two-tab session lock** (F-CRIT-4).
17. **Subprocess cleanup** (F-CRIT-5, v1 minimum: kill children on Ctrl-C).
18. **Subprocess stderr logging** to `<session-dir>/subprocess.log` — debug trail. Without this, the 66 failure modes are unflyable.
19. **127.0.0.1 only** (F-CRIT-6) — security baseline.
20. **Reset-progress NFR-R3 carryover** — reset NEVER touches CHOSEN_DIR. New semantic: clears portal session record only. Architecture lock.
21. **Resume = show state, trainee chooses.**
22. **BMAD version pin = portal's own `_bmad/_config/manifest.yaml` version** (currently 6.6.0). Trainee's repo gets the same version the portal runs against.

#### Important-but-deferrable (v1.1)

1. Multiple additional tool adapters (opencode, etc.) — v1 ships claude-code + codex; v1.1 adds.
2. Quality-checklist per phase (Ped-5) — anti-minimum-effort. Useful but adds UI surface.
3. Inline diff/file-write preview in chat (Prod-5) — closure moment.
4. Chat transcripts saved to repo (Prod-11) — nice closure; not blocking.
5. Half-install recovery (F-DEF-8) — v1 errors out; v1.1 detects and offers options.
6. Persistent subprocess reaper across portal restarts.

#### Nice-to-have (v2)

1. Show BMAD primer per phase (Prod-4).
2. Native filesystem dialog button (subprocess `osascript`/`zenity`).
3. Push-to-remote helper (End-1) — instructions in HANDOFF.md is enough for v1.
4. Trainee can hand-edit files mid-capstone — works as side effect; explicitly featured later.
5. Smart CODEOWNERS placeholder logic — v1 has basic templated CODEOWNERS.
6. Reconsider chat protocol (HTTP/SSE vs WebSocket).

#### Theatre — DON'T BUILD

1. 30+ tool support at v1 — curate to 2.
2. Auto-installing the trainee's AI tool — never.
3. Skip-phase button — never. (Exception: hidden `--stub-phase` admin escape for OUR dev, env-var-gated, invisible to trainees.)
4. Cloud-LLM proxy — never.
5. Hot-swap tool mid-capstone — restart, not switch.
6. Native file picker in browser (no Electron rabbit hole).
7. Magic agent-emitted phase-done markers — brittle.
8. Friendly-error-message stubs — surface real errors.
9. Auto-resume with replay — re-spawn cold; files are the contract.
10. Lesson-completion enforcement — gentle nudge only.
11. Detect every weird filesystem (iCloud / NFS / FUSE) — surface fs errors verbatim.
12. Multi-trainee support — single-user local.
13. **AI agent picks the trainee's tool for them** — never. Always ask. Respect agency.

#### Epic structure (PLAN order, not DEV order)

- **Epic 5: Capstone runtime foundation** — adapter abstraction, subprocess management, sandboxing, chat-stream protocol, Phase 0 pre-flight.
- **Epic 6: Setup wizard + bootstrap** — Phase 0.5-2: tool selection, auth check, path picker, wizard, npx install with all flags, install-command transparency, abort affordance, "what BMAD just did" explainer.
- **Epic 7a: WHY phases** — brief + PRD. Open-ended Socratic chat shape.
- **Epic 7b: HOW phases** — architecture + epics+stories + ADR. Structured chat shape.
- **Epic 8: Phase 8 — dev story 1.1** — code-implementation chat + test-run gate. Closes the loop.
- **Epic 9: Handoff** — HANDOFF.md generation, push helper, end-of-capstone screen.
- **Epic 10: Migration** — delete current Epic 4 textarea form; preserve overview shell + session schema + reset-progress safety.

#### Dev sequence (different from PLAN order)

**First:** Epic 10 (migration) — clears the surface so we're not maintaining two capstones in parallel during the rebuild.
**Then:** Epic 5 → 6 → 7a → 7b → 8 → 9 in PLAN-numbering order.

#### Phase 3 wrap-up

**Output:** v1-floor scope spec — 22 irreducibles, 6 v1.1 deferrals, 6 v2 ideas, 13 theatre cuts, 7-epic structure with separate plan/dev orders.

This is the direct input for the PRD edit. Every PRD requirement should map to an irreducible item; every architecture decision should reference a Critical Design Change or Threat-Model item from Phase 2.

## Idea Organization and Prioritization

### Themes (six clusters that map to artifacts in the next workflow steps)

**Theme 1 — The Tool Abstraction Layer is the central architectural claim.**
*Spans:* the vision sentence, F-CRIT-1 (sandboxing), F-CRIT-5 (lifecycle), F-DEF-3/4/5 (stream parsing), all 10 Q-Tech research items, "claude-code + codex at v1" decision, Setup-2 (auth pre-check), F-DEF-9/10 (subprocess hygiene).
*Pattern:* every technical surface in the rebuild flows through this layer. → Architecture doc's central new section.

**Theme 2 — "Experience BMAD by chatting" is the pedagogy hill we die on.**
*Spans:* core promise verb, Prod-1 (show full agent output), Prod-2 (distinct chrome), Prod-3 (separate per-phase conversations + visible artifact loading), Prod-4 (show primer), Prod-6 (don't fight side-channel), Prod-7 (trainee-click phase done), Phase 8 (dev story 1.1), Ped-7 ("what BMAD just did" explainer).
*Pattern:* every UI/UX decision filters through "does this teach BMAD or hide it?" → PRD's FR-3 narrative anchor.

**Theme 3 — Files are the contract.**
*Spans:* Prod-3 (cross-phase context = artifacts), Prod-7 (artifact-existence gate), F-CRIT-3 (shape validation), Prod-11 (transcripts to repo), Fail-4 (resume cold, files re-loaded), F-CRIT-7 (Phase 8 = green tests).
*Pattern:* the rebuild teaches "BMAD works because files speak." → Architecture's data/state model.

**Theme 4 — Setup is the BMAD install, made visible.**
*Spans:* Phase 0 / 0.5 / 1 / 2 sequence, Setup-3 through Setup-11, install-command transparency, install version pinning (TM-5), abort-and-cleanup, "what BMAD just did" explainer.
*Pattern:* the trainee learns `npx bmad-method install` AS THEY DO IT. → Epic 6's whole arc.

**Theme 5 — Trust > seamlessness in failure modes.**
*Spans:* Fail-3 (real errors), F-DEF-7 (timeout + abort), F-DEF-13 (no friendly stubs), F-DEF-14 (verbatim refusals), Fail-1 (don't auto-resume), F-DEF-17 (subprocess timeouts), subprocess.log promotion to irreducible.
*Pattern:* portal is honest about what's happening. → Architecture's error-handling lock + threat-model-doc tone.

**Theme 6 — Security scope expansion is real and architectural.**
*Spans:* F-CRIT-1 (sandbox), F-CRIT-2 (path allowlist), F-CRIT-4 (session lock), F-CRIT-6 (127.0.0.1), TM-1 through TM-6, NFR-S1 carryover.
*Pattern:* the portal now writes outside its own tree and runs subprocesses against trainee paths. → Architecture must explicitly call out the threat-model expansion that introduces.

### Top 3 highest-leverage outputs

1. **The vision sentence** — load-bearing for the PRD intro of FR-3. *"Experienced BMAD by chatting through the full artifact chain with their AI tool."*
2. **The 7 Critical Design Changes (F-CRIT-1 through F-CRIT-7)** — these become anchor architectural decisions; each maps directly to a story-shape in Epic 5/6/7/8.
3. **The PLAN-vs-DEV order split** — Epic 10 (migration) is dev'd first to clear the surface; Epic 5 → 9 land in numbering order. Without this we maintain two capstones in parallel.

### Action plan — what comes next

**1. Edit PRD (`bmad-edit-prd`)** — rewrite FR-3 against:
- Core promise sentence (new FR-3 framing).
- 22 irreducibles → become numbered sub-requirements (FR-3.1 through FR-3.22).
- 6 v1.1 deferrals → flagged for v1.1.
- Theatre cuts → explicit non-capabilities.

**2. Edit/extend architecture (`bmad-create-architecture` — likely a major edit, whole new section):**
- "Capstone Runtime" section: AI Tool Abstraction Layer + adapter contract + subprocess lifecycle + sandbox.
- "Capstone Threat Model" section: TM-1 through TM-6 enumerated.
- Update §"API & Communication Patterns" to break the "two POST endpoints, period" lock with the new endpoint set (likely scaffold + chat-proxy + commit + status endpoints).
- Add §"Subprocess discipline": all-argv, explicit-cwd, subprocess.log, signal handlers.
- Update §"Data Architecture" reset semantic: `BMAD_CAPSTONE_DIR` reset only clears portal state, NEVER touches CHOSEN_DIR.

**3. New epic structure (`bmad-create-epics-and-stories`)** — Epics 5-10 per the structure agreed (PLAN order: 5→6→7a→7b→8→9→10; DEV order: 10 first, then 5→6→7a→7b→8→9).

**4. Run the Q-Tech-1 through Q-Tech-10 research items** — preferably in parallel with the PRD edit. Output: ADR-style decisions per question, feeding the architecture doc.

**5. Migration story (Epic 10)** — first dev work. Delete current Epic 4 textarea form; preserve overview shell + session schema + reset-progress safety.

## Session Summary and Insights

### Key Achievements

- **104 ideas across 3 techniques** in ~90 minutes of structured ideation.
- Identified **the central architectural claim** (AI Tool Abstraction Layer) — the rebuild's load-bearing technical sentence is now quotable.
- Generated **66 failure modes** with full triage into 7 critical design changes, 17 defended cases, 6 threat-model items, 8 deferred-known, 6 pedagogical defenses.
- Stripped to **22 irreducible v1 requirements** with clean v1.1 / v2 / theatre tiering.
- Identified **the "ends with code, not docs" pivot** (Phase 8 = dev story 1.1 with green-tests gate) as the single highest-impact change vs. current Epic 4.
- Produced **PLAN-vs-DEV epic ordering** — the migration-first dev sequence prevents two-capstone-maintenance hell.

### Creative Breakthroughs

- **Reframed core promise from artifact to experience.** "What they walk away WITH" became "what they walk away HAVING DONE." The verb (`experienced by chatting`) is non-negotiable.
- **2 adapters at v1, not 1.** Single adapter would bake claude-code-isms into the abstraction layer; second adapter is what makes it a real abstraction.
- **Subprocess.log promoted to irreducible.** Without a debuggable trail, the 66 failure modes become unflyable.
- **BMAD version pin = portal's own manifest.yaml version.** Trainees experience the same BMAD the portal is built on. Elegant.
- **The "what BMAD just did" explainer.** Pedagogy beat between bootstrap and chat-driven Phase 3 — anti-jarring-transition.
- **--stub-phase admin escape hatch.** Hidden from trainees, env-var-gated, saves the dev team hours when iterating on Phase 7.

### Session Reflections

- **Defensive-first sequencing worked.** Phase 1 (questions) → Phase 2 (failures) → Phase 3 (collapse) was the right shape for a rebuild where the success state was already clear but the unknowns were rich.
- **The user's gut + the AI's enumeration was a strong pairing.** User had product/pedagogy/UX answers cold; AI generated the technical-research questions and failure-mode taxonomies. Confirm/push-back at each step kept the design honest without either party being a bottleneck.
- **The brainstorm document IS the spec.** Subsequent workflow steps (PRD, architecture, epics) directly consume the irreducibles list, the threat-model items, and the F-CRIT design changes. This brainstorm doesn't need re-translation.
- **Theatre items matter as much as irreducible items.** Naming what NOT to build saved an entire UX expedition (auto-install, hot-swap, native picker, magic markers, friendly errors). Constraint by exclusion.

### Workflow Outcomes

✅ 104 ideas generated (target: 100+)
✅ All 5 session goals addressed; all 6 themes mapped to artifacts
✅ Three techniques completed in sequence (Question Storming → Reverse Brainstorming → First Principles)
✅ Action plan with 5 concrete next steps
✅ User confirmed completion ([C])







**Total ideas captured:** 38 (technical-research questions + design positions). Plus the 10 Q-Tech research items that the architecture step will run down.

**Themes that emerged repeatedly:**
1. **Anti-magic pedagogy** — show tool calls, show the primer, show the diff, show prior artifacts loading. Trainees see HOW BMAD works.
2. **Files are the contract** — cross-phase context is on disk, not in chat. Side-channel access is a feature. Transcripts saved to repo.
3. **Trust > seamlessness** — show real errors, real commands, real state. No friendly fakery.
4. **Anti-paternalism** — curate v1 tool list (honest about scope) but don't auto-install or sniff invasively.
5. **The capstone ends with code, not docs** — Phase 8 (dev story 1.1) is the biggest pedagogical addition.



