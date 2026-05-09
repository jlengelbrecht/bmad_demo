# Story 5.5: `github-copilot` adapter (plain-text streaming variant)

**Epic:** 5 — Capstone Runtime Foundation
**Story Key:** 5-5-github-copilot-adapter
**Status:** done — PARTIALLY SUPERSEDED (2026-05-09)

> **⚠ Adapter / bootstrap reshape from the PTY pivot (commit `d677123`).** The 2026-05-09 PTY pivot reshaped the surfaces this story shipped — the chat phases and the bootstrap now drive the AI tool / bmad-method install via an interactive xterm.js PTY rather than a non-interactive subprocess + parsed event stream + portal-mirrored wizard. Manifest + install/auth detection from this story remain load-bearing for the tool-pick page. See architecture.md editHistory `2026-05-09 — PTY pivot` for the full rationale.

## Story

As the developer landing the third concrete `ToolAdapter` (and the variant that stresses the abstraction by emitting plain-text instead of structured JSONL — per Q-Tech-2 research line 134),
I want `src/lib/capstone/adapters/github-copilot.ts` to fully implement the `ToolAdapter` interface against `copilot --prompt <msg> -C <CHOSEN_DIR> --resume <session>` with plain-text stream parsing,
So that the abstraction handles BOTH structured JSONL streaming (claude-code, codex) and plain-text streaming (Copilot) with the same `ChatStreamEvent` discriminated union — and the adapter's `parseStreamChunk` collapses to a single `message-delta` event per stdout line, gracefully degrading the chat UI's tool-call cards (FR-3.17) into raw text the trainee can still parse.

## Acceptance Criteria

**AC1 — `github-copilot.ts` replaces the Story-5.2 stub with a real default-exported `ToolAdapter`**
- Manifest unchanged from Story 5.2 (or `minVersion` tightened based on observed `copilot --version`; Q-Tech-2 evidence is from `1.0.42+`).
- All five imperative methods implemented per AC2-AC6 below.
- Story-5.2 stub-error import test for `github-copilot` removed.

**AC2 — `detectInstalled()` returns a real boolean**
- Spawns `copilot --version` via `runStreaming` with `cwd: os.homedir()`.
- Returns `true` iff: exit 0 AND stdout contains `/copilot\s+\d+\.\d+\.\d+/i` (or however the binary self-identifies; the test asserts against the exact banner the integration test observes).
- Returns `false` on ENOENT, non-zero exit, missing banner, or below `manifest.minVersion`.

**AC3 — `detectAuthenticated()` runs the dual probe**
Per Q-Tech-2 lines 153-156: Copilot CLI requires BOTH `gh auth status` returning authed AND an active Copilot subscription. AC3 implements both:
- Probe 1: spawns `gh auth status --hostname github.com` via `runStreaming`. Returns `false` immediately if exit ≠ 0 or stdout/stderr lacks the `/Logged in to github.com/i` pattern.
- Probe 2: spawns `gh api user/copilot_billing` via `runStreaming` with `cwd: os.homedir()` and a 10-second timeout. Returns `true` iff exit 0 AND stdout JSON parses with a `{"business":{"copilot_business_seat":{...}}}`-or-equivalent shape (any field whose key includes `copilot` and whose value indicates an active seat is acceptable). Implementation: parse stdout as JSON; recursively walk for any key matching `/copilot/i` whose nearest sibling field looks like a status. Returns `false` on parse failure or no copilot-related fields.
- **The exact `gh api user/copilot_billing` schema is not perfectly stable** — Q-Tech-2 line 156 flagged this as a "spike needed." The adapter takes the conservative stance: any successful 200 from `user/copilot_billing` plus the presence of the word `copilot` in the response is accepted. False-positives (a valid `gh` token without an active Copilot subscription that nonetheless gets a 200) are caught at first-message time when `copilot --prompt ...` errors with a documented subscription-required message — which surfaces as a chat-side error rather than blocking the wizard. The trade-off (lenient auth probe + clean runtime error) is documented in the file header.
- 15-second total timeout across both probes.

**AC4 — `buildSpawnArgs(opts: ChatSpawnOpts)` produces the Q-Tech-2 invocation**
- Returns:
  ```ts
  {
    cmd: 'copilot',
    args: [
      '--prompt', opts.userMessage,
      '-C', opts.chosenDir,
      ...(opts.sessionId ? ['--resume', opts.sessionId] : []),
      // primer + cross-phase context handled via custom-instructions file (see AC7)
    ],
    env: {
      ...process.env,
      // GH_TOKEN expected from the trainee's gh auth; not synthesized.
    },
  }
  ```
- **Important deviation from claude-code/codex pattern:** Copilot's `--prompt` flag takes the user message as a positional argv entry, not via stdin. Story 5.7's Route Handler does NOT write to stdin for this adapter; the user message is in argv. The adapter exposes this via `formatUserMessage` returning `''` (empty string — no stdin write needed).
- The conditional `--resume <sessionId>` works the same as claude-code's `--resume`.
- Pure function.

**AC5 — `parseStreamChunk(raw: string)` decodes Copilot's plain-text stream**
- Per Q-Tech-2 line 134: Copilot's `-p`/`--prompt` mode streams plain text to stdout (no JSONL by default at v1; `--acp` is deferred to v1.1).
- Each input line maps to: `[{ kind: 'message-delta', text: <line> + '\n' }]`. Story 5.1's `runStreaming` already strips ANSI server-side, so the adapter sees clean text.
- A heuristic surfaces tool-call status: lines matching `/^\s*(▶|→|>>|\[tool\]|\[exec\])/i` are mapped to `[{ kind: 'tool-call', description: <line trimmed> }]` instead of `message-delta`. The patterns are conservative (Copilot's actual tool-call rendering may differ); the adapter integration test in AC9 captures real output and the test fixture pins what the adapter sees. Mismatches degrade gracefully — the line still reaches the chat surface as `message-delta` text, just without the tool-call card.
- `session-init` events: Copilot's plain-text mode does NOT emit a session-init line. The adapter captures the session id from `copilot`'s exit-message line (Q-Tech-2 line 130: `--name` / `--continue` are the session affordances; the binary writes the session name on first invocation). If a line matches `/Session:\s*(\S+)/i`, return `[{ kind: 'session-init', sessionId: <captured> }, { kind: 'message-delta', text: <line> + '\n' }]` (yields BOTH the session-init event AND the line as message-delta so the chat surface still shows what the trainee sees).
- `message-end`: Copilot does not emit an explicit end marker; Story 5.7's Route Handler synthesizes a `message-end` event after the subprocess `exit` event from `runStreaming`. The adapter's `parseStreamChunk` does NOT emit `message-end` itself — documented in code-comment.
- Malformed input: not applicable (plain text always parses). Empty lines map to `[]`.

**AC6 — `formatUserMessage(text: string)` returns empty (argv-driven)**
- Returns `''`.
- Story 5.7's Route Handler skips the stdin write when the adapter is `github-copilot` AND `formatUserMessage` returned empty. Documented contract: an empty string from `formatUserMessage` means "user message is in argv; do not write to stdin."
- Header comment in `github-copilot.ts` explains the divergence from claude-code/codex: Copilot consumes the user message via `--prompt`, not stdin. This is the FIRST place in the codebase where the adapter abstraction's "stdin-driven" assumption needs an opt-out; Story 5.5 introduces the empty-string convention deliberately so Story 5.7's Route Handler has a clean branch.

**AC7 — `buildPrimer(phase)` reads the same primer files but writes them to a custom-instructions file**
- Per Q-Tech-2 line 134/164: Copilot's primer mechanism is **file-based custom instructions** (Q-Tech-2 line 158 references "file-based 'custom instructions'").
- `buildPrimer(phase)` returns the placeholder primer content from `src/lib/capstone/primers/<phase>.md` — same as claude-code and codex. The *delivery* differs:
  - Story 5.7's Route Handler, on first turn for a Copilot session, writes the primer content to `<CHOSEN_DIR>/.github/copilot-instructions.md` (overwriting any prior version that bootstrap may have planted). Copilot reads this file automatically at session start.
  - On resume turns, the file already exists from the prior turn; no re-write.
- The adapter's `buildPrimer` itself is identical to Stories 5.3/5.4 (read-and-return string). The Route Handler differentiates delivery by adapter id.
- **Rule-of-three trigger:** Stories 5.3/5.4/5.5 now all duplicate the same `buildPrimer` body. Story 5.5's task list includes "promote `buildPrimer` to `src/lib/capstone/primers/load.ts` shared helper" — the rule-of-three threshold is hit.

**AC8 — Vitest unit coverage at `src/lib/capstone/adapters/github-copilot.test.ts`**
Cases:
- `detectInstalled` true on stubbed exit-0 + version banner; false on ENOENT/exit-1/banner-absent/below-min.
- `detectAuthenticated`:
  - Both probes succeed → true.
  - `gh auth status` not authed → false (probe 2 not invoked; spy verifies).
  - `gh auth status` authed but `gh api user/copilot_billing` returns non-200 → false.
  - Both probes succeed but JSON parse fails → false (lenient parse, but unparseable JSON is a hard fail).
  - Both probes succeed and JSON contains some `copilot`-keyed field → true.
  - Timeout in probe 2 → false.
- `buildSpawnArgs` produces argv with `--prompt <msg>`, `-C <chosenDir>`, no `--resume` on first turn, `--resume <id>` on resume.
- `parseStreamChunk`:
  - Plain line → single `message-delta` event with `text + '\n'`.
  - Tool-call-prefixed line (e.g., `'▶ reading brief.md'`) → single `tool-call` event with the line trimmed.
  - Session-marker line (e.g., `'Session: my-capstone-12345'`) → BOTH a `session-init` event AND a `message-delta` event.
  - Empty line → `[]`.
- `formatUserMessage` returns empty string regardless of input.
- `buildPrimer` returns the placeholder content for each of the six phases.

**AC9 — Adapter integration test at `src/lib/capstone/adapters/github-copilot.integration.test.ts`**
- Gated by `RUN_ADAPTER_INTEGRATION=1`.
- Tests: `detectInstalled` (true), `detectAuthenticated` (true if `GH_TOKEN` + active Copilot subscription, clean false otherwise), and a "say hi" smoke producing one or more `message-delta` events.
- Important: the integration test captures REAL Copilot stdout and validates `parseStreamChunk`'s tool-call heuristic against actual output. If the heuristic mis-classifies real tool-call lines as `message-delta`, the test is a soft warning (logged) but not a hard fail (graceful degradation per AC5). The test logs the first 10 stdout lines so a developer running the integration suite can spot-check.
- Cleanup: tmp dir + tracked-children reset.

**AC10 — Lint, typecheck, quad gate; CI mirror; promote `buildPrimer` to shared helper**
- All five npm-script gates clean.
- `src/lib/capstone/primers/load.ts` exports `loadPrimer(phase: CapstonePhase): string`. All three adapters (claude-code, codex, github-copilot) import and use it.
- The previous duplicated `buildPrimer` bodies are replaced with `buildPrimer = (phase) => loadPrimer(phase)`.
- Two unit-test files updated (claude-code.test.ts and codex.test.ts) to verify the import; github-copilot's tests use the shared helper from the start.
- `.vela.yml` + `.github/workflows/ci.yml` extend the adapter-integration matrix to include `github-copilot`. Maintenance invariant honored.

## Tasks/Subtasks

- [ ] **Task 1 — Promote stub (AC1)** — replace stubs in `github-copilot.ts`.

- [ ] **Task 2 — `detectInstalled` (AC2)** — `copilot --version` probe; semver-compare; warn on drift.

- [ ] **Task 3 — Dual auth probe (AC3)** — sequenced `gh auth status` → `gh api user/copilot_billing`; lenient JSON parse with conservative-true logic; 15s total timeout.

- [ ] **Task 4 — `buildSpawnArgs` (AC4)** — argv with `--prompt` + `-C` + conditional `--resume`. Document the "argv carries user message; no stdin" deviation in the function's JSDoc.

- [ ] **Task 5 — `parseStreamChunk` (AC5)** — line-by-line plain-text mapping; tool-call heuristic; session-marker capture; empty-line swallow.

- [ ] **Task 6 — `formatUserMessage` (AC6)** — return `''`. Header comment in the file explains the empty-string convention so Story 5.7's reviewer sees the contract.

- [ ] **Task 7 — `buildPrimer` (AC7)** — initial implementation duplicates Stories 5.3/5.4; Task 9 promotes it.

- [ ] **Task 8 — Unit Vitest spec (AC8)** — implement the 13 cases.

- [ ] **Task 9 — Promote `buildPrimer` to `src/lib/capstone/primers/load.ts` (AC10)** — extract; update all three adapters to import; update Stories 5.3/5.4 unit-test fixtures so they test the integrated path. Single commit (or paired patches) so the adapter unit tests don't temporarily fail.

- [ ] **Task 10 — Integration Vitest spec (AC9)** — env-gated; logs first 10 stdout lines for manual spot-check; soft-warns on tool-call heuristic mismatch.

- [ ] **Task 11 — CI matrix extension (AC10)** — extend the adapter-integration matrix in `.vela.yml` + `.github/workflows/ci.yml` for `github-copilot`. Note that GH Copilot CLI requires a paid subscription — the CI matrix entry MUST be conditioned on a CI secret (e.g., `GH_TOKEN_WITH_COPILOT`) being present; the job is skipped (not failed) when the secret is absent. Document this in `branch-protection-notes.md` so adopting forks know how to enable the job (or accept that their fork's CI doesn't validate this adapter against a real binary).

- [ ] **Task 12 — Quad gate clean (AC10)** — run all five gates; integration spec validated locally with `RUN_ADAPTER_INTEGRATION=1` against dev box's `copilot` (presumes the dev has a Copilot subscription).

### Review Findings

_To be populated by code review after implementation._

## Dev Notes

**Architecture references:**
- §"v1 Supported Tools" line 269 — github-copilot manifest highlights and per-tool implementation notes verbatim.
- §"AI Tool Abstraction Layer" line 259 — the interface accommodates plain-text streaming alongside structured JSONL; Story 5.5 IS that proof.
- §"Capstone Threat Model" TM-1 line 308 — Copilot's `-C` + trusted-directories model is the native sandbox surface (per Q-Tech-2 line 130).

**PRD references:**
- FR-3.25 line 562 — github-copilot is the third v1 tool.
- FR-3.4/3.5 lines 520-521 — wizard badge + auth gate.
- FR-3.17 line 542 — anti-magic chat (tool calls visible). Copilot's plain-text streaming degrades this — trainees see Copilot's narration but not typed tool-call cards. Documented limitation; not a regression because the chat-bubble shape still works.

**Brainstorm references:**
- "2 adapters at v1, not 1" line 543 — Story 5.5 is the third proof; the abstraction is real, not aspirational.
- F-CRIT-1 line 232 — sandboxing via `-C` (Copilot's trusted-directories model is the native primitive).

**Research references:**
- Q-Tech-2 lines 122-134 — full Copilot CLI evidence: `--prompt`/`-p` for one-shot, plain-text streaming (no JSONL by default), `--resume`/`--continue`/`--name` for session continuity, `-C` for cwd, requires Copilot subscription + GH_TOKEN.
- Q-Tech-2 lines 149-158 — implementation notes verbatim: subprocess shape, session-id persistence, dir scoping, dual-auth requirement, output parsing, ACP deferral.
- Q-Tech research's "lose typed event UIs for Copilot but the chat-bubble shape works" framing (line 147) — AC5 implements this gracefully.

**Why the dual auth probe is conservative-true:**

Q-Tech-2 line 156 explicitly flagged the Copilot subscription probe as "spike needed." Without an authoritative API for "is this token's Copilot subscription active?", the adapter takes the lenient stance: a successful 200 from `user/copilot_billing` plus a `copilot`-keyed field is accepted as authed. False-positives surface as runtime errors at first-message time with documented stderr from `copilot --prompt`. The trade-off is honest about the uncertainty and avoids gating Phase 1 on a probe that can flap.

**Why the empty-string `formatUserMessage` convention:**

Stories 5.3 (claude-code) and 5.4 (codex) both write the user message to stdin. Copilot consumes it as argv. Without the empty-string opt-out, Story 5.7's Route Handler would have to special-case Copilot — which couples the Route Handler to a specific adapter id and breaks the abstraction. The empty-string convention keeps the contract polymorphic: `if (formatted) child.stdin.write(formatted)`. Documented in github-copilot.ts header + Story 5.7's spec.

**Why promote `buildPrimer` only at Story 5.5 and not 5.3 or 5.4:**

Rule of three. Story 5.3 had one usage; Story 5.4 had two; Story 5.5 hits three. Promoting earlier would be premature abstraction. Promoting later (e.g., when Stories 7a/7b need the same helper) is fine but needlessly delays the cleanup. Story 5.5 is the natural cutpoint.

**Defensible deviations:**

- AC5's tool-call heuristic is best-effort and logged-on-mismatch rather than asserted. The brainstorm's anti-magic stance (Prod-1) prefers seeing tool calls; for Copilot, the trainee sees them as plain text either way — just without typed cards. Acceptable degradation; documented.
- AC6's empty-string `formatUserMessage` is a clean opt-out from the stdin-driven contract. Adding a dedicated `chatTransport: 'stdin' | 'argv'` enum field on the manifest was considered and rejected — three adapters with one outlier doesn't justify the type-system surface.
- AC11's CI-secret-gated matrix entry differs from Story 5.3/5.4's adapter-integration jobs (which only need `ANTHROPIC_API_KEY`/`OPENAI_API_KEY`). Documented in `branch-protection-notes.md` so forks know.

**No-egress / runtime-fs sanity:**

- Unit tests: no network. NFR-S1 holds.
- AC7's primer-delivery via `<CHOSEN_DIR>/.github/copilot-instructions.md` is a write inside CHOSEN_DIR (NOT the portal repo). Within scope per FR-3.15 (chat surface proxies the AI tool, with file writes landing in CHOSEN_DIR).
- Integration tests: spawned `copilot` makes GitHub API calls under the trainee's auth (NFR-S1 explicit out-of-scope).

**Architecture-doc drift check:**

- The architecture's `ToolAdapter` interface at line 259 includes `formatUserMessage(text: string): string`. AC6 returns `''` for a non-empty input, which technically deviates from the spirit ("format the user message") even though the type contract is satisfied. Document in this file's Dev Notes; consider an architecture-doc edit AFTER Story 5.5 lands to clarify the empty-string semantic. Not a blocker.
- The Story-5.2 widening to `{ cmd, args, env? }` continues to apply.

## Dev Agent Record

### Implementation Plan

_To be filled in by the dev agent at implementation time._

### Debug Log

_To be filled in by the dev agent during implementation._

### Completion Notes

_To be filled in by the dev agent after the quad gate is clean._

## File List

**Expected new files:**
- `src/lib/capstone/adapters/github-copilot.test.ts`
- `src/lib/capstone/adapters/github-copilot.integration.test.ts`
- `src/lib/capstone/primers/load.ts` (rule-of-three promotion)
- `src/lib/capstone/primers/load.test.ts`
- `_bmad-output/implementation-artifacts/5-5-github-copilot-adapter.md` (this file)

**Expected modified files:**
- `src/lib/capstone/adapters/github-copilot.ts` (Story-5.2 stub → real implementation)
- `src/lib/capstone/adapters/claude-code.ts` (use `loadPrimer`)
- `src/lib/capstone/adapters/codex.ts` (use `loadPrimer`)
- `src/lib/capstone/adapters/index.test.ts` (remove the github-copilot stub-error case)
- `.vela.yml` (extend adapter-integration matrix; document CI-secret gating)
- `.github/workflows/ci.yml` (mirror)
- `.github/branch-protection-notes.md` (document the GH_TOKEN_WITH_COPILOT secret)

## Change Log

- 2026-05-08 — Story file authored from session-state-2026-05-08-rebuild-planning.md + Q-Tech-2 (lines 122-158) + architecture line 269.
