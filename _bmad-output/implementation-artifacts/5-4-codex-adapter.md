# Story 5.4: `codex` adapter

**Epic:** 5 — Capstone Runtime Foundation
**Story Key:** 5-4-codex-adapter
**Status:** done — PARTIALLY SUPERSEDED (2026-05-09)

> **⚠ Adapter / bootstrap reshape from the PTY pivot (commit `d677123`).** The 2026-05-09 PTY pivot reshaped the surfaces this story shipped — the chat phases and the bootstrap now drive the AI tool / bmad-method install via an interactive xterm.js PTY rather than a non-interactive subprocess + parsed event stream + portal-mirrored wizard. Manifest + install/auth detection from this story remain load-bearing for the tool-pick page. See architecture.md editHistory `2026-05-09 — PTY pivot` for the full rationale.

## Story

As the developer landing the second concrete `ToolAdapter` (the brainstorm-mandated proof that the abstraction is real, not aspirational — see brainstorm line 543: "2 adapters at v1, not 1"),
I want `src/lib/capstone/adapters/codex.ts` to fully implement the `ToolAdapter` interface — replacing the Story-5.2 stub with a working adapter that drives `codex exec --json -C <CHOSEN_DIR> --add-dir <CHOSEN_DIR> resume <session>` and carries the BMAD primer as a leading user message (since Codex has no `--system-prompt` flag, per Q-Tech-2 research),
So that the chat-stream Route Handler (Story 5.7) can drive Codex end-to-end and the abstraction's second proof exposes any claude-code-isms baked into Story 5.3's interface usage.

## Acceptance Criteria

**AC1 — `codex.ts` replaces the Story-5.2 stub with a real default-exported `ToolAdapter`**
- Manifest unchanged from Story 5.2 (or `minVersion` tightened based on observed `codex --version`).
- All five imperative methods implemented per AC2-AC6 below.
- The Story-5.2 stub-error import test for `codex` is removed from `index.test.ts`.

**AC2 — `detectInstalled()` returns a real boolean**
- Spawns `codex --version` via `runStreaming` with `cwd: os.homedir()`.
- Returns `true` iff: exit 0 AND stdout contains `/codex(-cli)?\s+\d+\.\d+\.\d+/i`.
- Returns `false` on `ENOENT`, non-zero exit, missing version banner, or version below `manifest.minVersion` (with `console.warn` per TM-6).

**AC3 — `detectAuthenticated()` returns a real boolean**
- Spawns `codex exec --json --skip-git-repo-check 'reply with the single word OK'` with `cwd: os.homedir()`, 15-second `AbortController` timeout.
- Returns `true` iff: exit 0 AND at least one stdout JSONL event of type `agent_message` (or `assistant_message`) is observed in stdout. Codex emits its result envelope on success; missing `OPENAI_API_KEY` produces an error envelope before the agent message.
- Returns `false` on ENOENT, non-zero exit, timeout, or missing agent-message event.
- **Open follow-up:** if OpenAI publishes a `codex auth status` flag, prefer it. Until then, the cheap exec probe is the documented surface.

**AC4 — `buildSpawnArgs(opts: ChatSpawnOpts)` produces the Q-Tech-2 invocation**
- Returns:
  ```ts
  {
    cmd: 'codex',
    args: [
      'exec',
      '--json',
      '-C', opts.chosenDir,
      '--add-dir', opts.chosenDir,
      '--sandbox', 'workspace-write',
      ...(opts.sessionId ? ['resume', opts.sessionId] : []),
      // primer + user message arrive via stdin (formatUserMessage); no positional prompt arg
    ],
    env: {
      ...process.env,
      // OPENAI_API_KEY expected to be set by the trainee; adapter does not synthesize.
    },
  }
  ```
- The `--sandbox workspace-write` flag is the Codex-native sandbox primitive (per Q-Tech-2 evidence). Combined with `-C` and `--add-dir`, all three constrain Codex to CHOSEN_DIR (TM-1).
- First-turn vs. resume: `resume <session-id>` is a *positional* subcommand for Codex (not a flag), so the conditional spread inserts it before stdin starts.
- Pure function; no I/O.

**AC5 — `parseStreamChunk(raw: string)` decodes Codex's JSONL**
- Parses each newline-stripped line as JSON. Malformed JSON → `[{ kind: 'error', message: 'malformed JSONL line: <first 80 chars>' }]`, no throw.
- Maps Codex's JSONL event types to `ChatStreamEvent`:
  - `task_started` (or analogous session-init event) → `[{ kind: 'session-init', sessionId: <session id from event> }]`. Codex's session id is captured from the first envelope's `id` or `session_id` field.
  - `agent_message_delta` → `[{ kind: 'message-delta', text: <delta> }]`.
  - `agent_reasoning_delta` → `[]` (Codex emits a reasoning stream that the chat surface does NOT render at v1; trainees see the public message stream only). Documented inline; v1.1 may surface reasoning as a collapsible panel.
  - `tool_use` (or `function_call`) → `[{ kind: 'tool-call', description: '▶ ' + tool_name + ' ' + condensed-input }]`.
  - `task_complete` (or `agent_message_end`) → `[{ kind: 'message-end' }]`.
  - Anything else → `[]`.
- The mapping table is pinned in `CODEX_EVENT_MAP` at module scope with one-line code comments referencing Q-Tech-2's evidence.

**AC6 — `formatUserMessage(text: string)` carries the leading-primer pattern**
- Q-Tech-2 line 86 lock: Codex has no `--system-prompt` flag; the primer must be carried as a leading user message OR via a config snippet. Decision (per Q-Tech-2 research recommendation): **leading user message** at v1, written to stdin BEFORE the trainee's actual message on the first turn only.
- The adapter's per-turn write is just the user's text, terminated with `\n`. The PRIMER injection is a Story-5.7 (Route Handler) concern: on the first turn (when `opts.sessionId === ''`), the Route Handler writes the primer first (using `buildPrimer(phase)`), then writes the user message via `formatUserMessage`. On subsequent turns (resume), only `formatUserMessage` is written — the primer was carried in the prior session's history that `resume` rehydrates.
- `formatUserMessage(text)` returns `text + '\n'`. The Route Handler closes stdin after the write (`child.stdin.end()`).
- **Note:** this differs from claude-code's stream-json input format. Codex's `codex exec` reads plain-text from stdin (per Q-Tech-2 line 80: `codex exec -` for prompt-from-stdin). The simpler shape is correct here; the adapter does not synthesize JSON envelopes.

**AC7 — `buildPrimer(phase)` reads the same primer files Story 5.3 placed**
- Identical implementation to Story 5.3's `buildPrimer`: reads `src/lib/capstone/primers/<phase>.md` via `fs.readFileSync`. Same six placeholder files (Story 5.3 already ships them; Story 5.4 consumes).
- Throws on missing file with `Error('Primer not found for phase <phase>: <path>')`.

**AC8 — Vitest unit coverage at `src/lib/capstone/adapters/codex.test.ts`**
Cases (with `runStreaming` stubbed):
- `detectInstalled` true on stubbed exit-0 + version banner; false on exit-1; false on ENOENT; false on banner-absent; false + warn on below-minVersion.
- `detectAuthenticated` true when stubbed events include `agent_message`; false when missing; false on timeout.
- `buildSpawnArgs` produces `['exec','--json','-C',chosenDir,'--add-dir',chosenDir,'--sandbox','workspace-write']` with no resume on first turn; with `resume <sessionId>` appended on resume.
- `buildSpawnArgs.env` includes `process.env`; does not synthesize.
- `parseStreamChunk` round-trips each `ChatStreamEvent` variant from canonical JSONL fixtures (one per variant, payloads from Q-Tech-2 evidence).
- `parseStreamChunk` returns `[]` for `agent_reasoning_delta` events (deliberate v1 swallow; v1.1 may surface).
- `parseStreamChunk` on malformed JSON returns the error event without throwing.
- `formatUserMessage` returns `text + '\n'`; preserves the trainee's text verbatim including newlines and unicode.
- `buildPrimer` returns the placeholder primer for each of the six phases; throws on missing file.

**AC9 — Adapter integration test at `src/lib/capstone/adapters/codex.integration.test.ts`**
Same shape as Story 5.3's integration spec:
- Gated by `RUN_ADAPTER_INTEGRATION=1`.
- Tests: `detectInstalled` (true), `detectAuthenticated` (true if `OPENAI_API_KEY` set, clean false otherwise), and a "say OK" round-trip producing at least one `session-init`, one or more `message-delta`, one `message-end`.
- Cleanup: tmp dir + tracked-children reset.

**AC10 — Lint, typecheck, quad gate; CI mirror**
- `npm run lint` + `tsc --noEmit` + `npm run test:unit` + `npm run test:e2e` + `npm run lint:links` clean.
- The adapter-integration job in `.vela.yml` + `.github/workflows/ci.yml` (Story 5.3 added the matrix entry; Story 5.4 may extend the matrix or add a sibling matrix value for codex). Maintenance invariant: both pipeline files MUST stay synchronized.

## Tasks/Subtasks

- [ ] **Task 1 — Promote stub (AC1)** — replace `codex.ts` Story-5.2 stubs with real implementations.

- [ ] **Task 2 — `detectInstalled` (AC2)** — `codex --version` probe; semver-compare; `console.warn` on drift.

- [ ] **Task 3 — `detectAuthenticated` (AC3)** — `codex exec --json --skip-git-repo-check 'reply OK'` with 15s timeout; parse for `agent_message` event.

- [ ] **Task 4 — `buildSpawnArgs` (AC4)** — pure function; argv per AC4 verbatim; `resume <id>` positional on resume turns.

- [ ] **Task 5 — `parseStreamChunk` (AC5)** — JSON-parse + `CODEX_EVENT_MAP` dispatch; explicit `[]` return for `agent_reasoning_delta` with code-comment rationale.

- [ ] **Task 6 — `formatUserMessage` (AC6)** — minimal `text + '\n'`. Document the primer-on-first-turn-via-Route-Handler convention in a header comment so Story 5.7's reviewer sees the contract.

- [ ] **Task 7 — `buildPrimer` (AC7)** — identical to Story 5.3's implementation. Refactor opportunity flagged: if Story 5.5 adds a third identical implementation, promote `buildPrimer` to a shared `src/lib/capstone/primers/load.ts` helper (rule of three). Story 5.4 keeps the duplication.

- [ ] **Task 8 — Unit Vitest spec (AC8)** — implement the 9 cases with `vi.mock('../subprocess/run-streaming', ...)`.

- [ ] **Task 9 — Integration Vitest spec (AC9)** — env-gated; mirrors Story 5.3's shape.

- [ ] **Task 10 — CI matrix extension (AC10)** — extend the Story-5.3 adapter-integration job's tool-version matrix to include codex. Both pipeline files updated in the same commit.

- [ ] **Task 11 — Quad gate clean (AC10)** — run all gates; integration spec validated locally with `RUN_ADAPTER_INTEGRATION=1` against dev box's `codex`.

### Review Findings

_To be populated by code review after implementation._

## Dev Notes

**Architecture references:**
- §"Capstone Runtime → v1 Supported Tools" line 268 — codex's manifest highlights and per-tool implementation notes verbatim.
- §"AI Tool Abstraction Layer" line 260 — spawn-per-message + tool-native resume is locked.
- §"Capstone Threat Model" TM-1 line 308 — `--add-dir` + `--sandbox workspace-write` is the codex-native sandbox primitive (preferred over adapter-layer interception).

**PRD references:**
- FR-3.25 line 562 — codex is one of three v1 tools.
- FR-3.4/3.5 lines 520-521 — `detectInstalled`/`detectAuthenticated` drive the wizard's badge + auth gate.
- NFR-S5 line 630 — sandbox via `-C`/`--add-dir`/`--sandbox`.

**Brainstorm references:**
- Phase-3 Irreducible #1 line 396 — codex paired with claude-code as the v1 abstraction proof.
- "2 adapters at v1, not 1" creative breakthrough line 543 — Story 5.4 IS this proof.

**Research references:**
- Q-Tech-2 lines 73-87 — Codex's CLI surface verbatim: `codex exec` (alias `codex e`), `--json` for JSONL, `-C`/`--add-dir`/`--sandbox` for scoping, `codex exec resume [SESSION_ID]` for continuity, no `--system-prompt` flag (workaround: leading user message OR config snippet — AC6 picks leading-message).
- Q-Tech-2 lines 162-165 — codex v1 implementation notes verbatim. AC4's argv list lifts.

**Why `agent_reasoning_delta` is swallowed at v1:**

Codex emits a separate reasoning stream alongside the public message stream. Showing both inline doubles the chat-surface text and confuses trainees ("which one is the real answer?"). The brainstorm's anti-magic-pedagogy stance (Prod-1, line 132) is about *tool calls* being visible, not *internal reasoning*. v1.1 may add a collapsible "▼ Reasoning" panel; v1 omits.

**Why primer-as-leading-user-message instead of config snippet:**

Q-Tech-2 line 162 evaluates both options. Config-snippet would mutate the trainee's `~/.codex/config.toml` globally (or require per-session config dir + `XDG_CONFIG_HOME` override) — both invasive. Leading-user-message is per-session-bounded and per-turn-resilient (Codex's `resume` rehydrates the conversation, including the leading message). The Route-Handler-injects-primer pattern is documented in AC6 + the file's header comment so Story 5.7's reviewer doesn't have to re-derive it.

**Defensible deviations:**

- AC4 includes `--sandbox workspace-write` even though Story 5.3's claude-code adapter doesn't need a sandbox flag (claude-code uses `--add-dir` only). Codex's docs treat `--sandbox` as a separate primitive layered on top of `--add-dir`; including it explicitly is the conservative choice and matches the per-tool implementation note in architecture line 268.
- The "primer is injected by the Route Handler, not the adapter" split is a deliberate seam: it keeps `formatUserMessage` per-turn-pure for ALL adapters and makes Story 5.7 the single owner of "first turn vs. resume" branching. Documented in this file's Dev Notes + Story 5.5/5.7's headers.

**No-egress / runtime-fs sanity:**

- Unit tests: no network. NFR-S1 invariant holds.
- Integration tests: spawned `codex` makes OpenAI API calls under the trainee's auth (NFR-S1 explicit out-of-scope). Portal originates zero calls.

**Architecture-doc drift check:**

- No new drift introduced. Same `buildSpawnArgs` widening as Story 5.3.

## Dev Agent Record

### Implementation Plan

_To be filled in by the dev agent at implementation time._

### Debug Log

_To be filled in by the dev agent during implementation._

### Completion Notes

_To be filled in by the dev agent after the quad gate is clean._

## File List

**Expected new files:**
- `src/lib/capstone/adapters/codex.test.ts`
- `src/lib/capstone/adapters/codex.integration.test.ts`
- `_bmad-output/implementation-artifacts/5-4-codex-adapter.md` (this file)

**Expected modified files:**
- `src/lib/capstone/adapters/codex.ts` (Story-5.2 stub → real implementation)
- `src/lib/capstone/adapters/index.test.ts` (remove the codex stub-error case)
- `.vela.yml` (extend adapter-integration matrix)
- `.github/workflows/ci.yml` (mirror)

## Change Log

- 2026-05-08 — Story file authored from session-state-2026-05-08-rebuild-planning.md + Q-Tech-2 verbatim + architecture line 268.
