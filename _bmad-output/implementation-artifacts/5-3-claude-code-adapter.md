# Story 5.3: `claude-code` reference adapter

**Epic:** 5 — Capstone Runtime Foundation
**Story Key:** 5-3-claude-code-adapter
**Status:** ready-for-dev

## Story

As the developer landing the first concrete `ToolAdapter` (the gold-standard reference per architecture's v1 Supported Tools matrix and Q-Tech-1 research),
I want `src/lib/capstone/adapters/claude-code.ts` to fully implement the `ToolAdapter` interface from Story 5.2 — replacing the stubs with a working adapter that drives `claude` via `--print --input-format stream-json --output-format stream-json --resume <id> --add-dir <CHOSEN_DIR> --bare`,
So that the chat-stream Route Handler (Story 5.7) and the setup wizard (Epic 6) can drive Claude Code end-to-end against a real binary, validating the abstraction's first proof and giving Stories 5.4 and 5.5 a working reference for their parsing/spawn/auth-probe patterns.

## Acceptance Criteria

**AC1 — `claude-code.ts` replaces the Story-5.2 stub with a real default-exported `ToolAdapter`**
- The adapter's `manifest` matches the Story-5.2 stub values (or tightens `minVersion` based on the actual `claude --version` observed in dev) and is otherwise unchanged.
- All five imperative methods are implemented per AC2–AC6 below.
- The Story-5.2 stub-error message is removed from this file. `index.test.ts`'s "stubs throw" case for claude-code is removed/updated; the new test in Story 5.3 covers the real behavior.

**AC2 — `detectInstalled()` returns a real boolean**
- Spawns `claude --version` via Story 5.1's `runStreaming` with `cwd: os.homedir()`, no AbortSignal, no sessionLogPath.
- Returns `true` iff:
  - The exit code is 0; AND
  - The stdout contains a recognizable claude-version banner: regex `/claude\s+\d+\.\d+\.\d+/i` matches at least one stdout line.
- Returns `false` on:
  - `ENOENT` from spawn (cliBinary not on PATH) — caught and converted to `false`.
  - Non-zero exit code.
  - No version banner match.
- A `manifest.minVersion` semver-range comparison is included: if the parsed version is OUTSIDE the range (TM-6 — tool-version drift), `detectInstalled` returns `false` AND a one-line `console.warn` records the parsed version + range so the wizard's diagnostic surface (Epic 6) can later read this from a sibling helper. v1's wizard renders only the boolean; the warn is a debug aid.
- Implementation uses `semver` from `package.json` (already a Next/SWC dep transitively; promote to a direct dep if not already). If `semver` is unavailable, falls back to a small inline compare on the `>=X.Y.Z` shape (which is all our manifests use).

**AC3 — `detectAuthenticated()` returns a real boolean**
- Spawns `claude --print --input-format text --output-format stream-json --max-budget-usd 0.001 --bare 'say hi in one word'` with `cwd: os.homedir()`. The `--max-budget-usd 0.001` cap means even if the call somehow goes through, it costs effectively nothing.
- Returns `true` iff:
  - Exit code 0; AND
  - At least one stream-json event of type `system/init` AND at least one `assistant/message_start` event were observed in stdout. (A successful auth + connection produces both; a missing `ANTHROPIC_API_KEY` produces an error event before the assistant turn starts.)
- Returns `false` on:
  - `ENOENT`, non-zero exit, missing required events, or any thrown error during parsing.
- A 15-second timeout is enforced via an internal `AbortController` whose signal is passed to `runStreaming`. On timeout, the adapter SIGTERMs the child and returns `false`. Documented in code as: "auth probe must be cheap; 15s is a generous ceiling — real auth completes in 1-3s."
- **Open follow-up flagged in Dev Notes:** if Anthropic publishes a documented auth-probe-only flag (e.g., `claude auth status --json`), prefer it over the cost-bounded chat probe. Until then, the chat probe is the documented behavior surface.

**AC4 — `buildSpawnArgs(opts: ChatSpawnOpts)` produces the verbatim Q-Tech-1 invocation**
- Returns:
  ```ts
  {
    cmd: 'claude',
    args: [
      '--print',
      '--input-format', 'stream-json',
      '--output-format', 'stream-json',
      '--include-partial-messages',
      '--system-prompt-file', opts.primerPath,
      ...(opts.sessionId ? ['--resume', opts.sessionId] : []),
      '--add-dir', opts.chosenDir,
      '--bare',
    ],
    env: {
      ...process.env,
      // ANTHROPIC_API_KEY is expected to already exist in process.env;
      // we don't synthesize, mutate, or store it — the trainee owns auth.
    },
  }
  ```
- The `--session-id <uuid>` flag from Q-Tech-1 is **not** passed here; we let Claude Code generate the session-id and capture it from the `system/init` event in the stream (per `parseStreamChunk` AC5). The ChatSpawnOpts.sessionId is the *resume* target, not a *create* directive — its absence on first turn is correct.
- The function is pure (no I/O); called by Story 5.7's Route Handler immediately before passing to `runStreaming`.

**AC5 — `parseStreamChunk(raw: string)` decodes Claude Code's stream-json**
- Input: a single newline-stripped line of stream-json output from `claude --output-format stream-json`. (Story 5.1's `runStreaming` already handles newline buffering and ANSI stripping; the adapter sees one whole JSON line per call.)
- Each line is parsed as JSON. On parse failure, returns `[{ kind: 'error', message: 'malformed stream-json line: <first 80 chars>' }]` and does NOT throw — graceful degradation.
- The function maps stream-json event types to the `ChatStreamEvent` discriminated union (per Story 5.2 AC1):
  - `system/init` (or `system/start`) → `[{ kind: 'session-init', sessionId: <session_id from event> }]`. The session id is captured from the event payload's `session_id` field.
  - `assistant/content_block_delta` (or partial-message events when `--include-partial-messages` is on) → `[{ kind: 'message-delta', text: <text-delta value> }]`.
  - `assistant/tool_use_start` (or analogous tool-call event) → `[{ kind: 'tool-call', description: <"▶ " + tool_name + " " + condensed-input> }]`. The condensed-input is a one-line summary (first 80 chars of the rendered input JSON).
  - `assistant/message_stop` (or message-end signal) → `[{ kind: 'message-end' }]`.
  - Anything else → `[]` (return empty, do not pollute the chat surface with adapter-internal noise).
- The mapping table is pinned in a `STREAM_JSON_EVENT_MAP` constant at module scope so future drift can be audited diff-by-diff. Each mapped event includes a one-line code comment with the verbatim Q-Tech-1 reference.

**AC6 — `formatUserMessage(text: string)` produces stream-json input**
- Returns a single newline-terminated JSON-line of the shape:
  ```json
  {"type":"user","message":{"role":"user","content":[{"type":"text","text":"<text>"}]}}\n
  ```
- The text is JSON-encoded (newlines, quotes, backslashes escaped); the adapter does not modify the content beyond JSON escaping.
- Story 5.7's Route Handler writes the result to the child's stdin via `child.stdin.write(formatted); child.stdin.end()` per turn (spawn-per-message pattern, per Q-Tech-5 + architecture line 260).
- **Note: this format may need adjustment based on real `claude` behavior.** The Q-Tech-1 research observed the *output* stream-json schema but the *input* schema is officially undocumented per Q-Tech-5. The format above is the best-current-knowledge input shape derived from Anthropic SDK examples and the [stream-json input issue](https://github.com/anthropics/claude-code/issues/24594). Story 5.3's adapter integration test (AC9) will validate end-to-end; if the format proves wrong, the fix is local to this method and the test catches the regression.

**AC7 — `buildPrimer(phase)` returns per-phase BMAD primer markdown**
- Returns a string of markdown content tailored to the phase. v1 implementation:
  - Each phase's primer is loaded from `src/lib/capstone/primers/<phase>.md` via `fs.readFileSync` at call time. (The primer files themselves land in Epic 7+ stories; Story 5.3 ships *placeholder* primers — one paragraph per file that names the phase, references the cross-phase context loading instruction (FR-3.16), and instructs the agent to read prior artifacts from CHOSEN_DIR.)
  - Returns the file contents verbatim. The adapter does NOT inject template variables at v1 — the primer files are static markdown.
  - On missing file: throws `Error('Primer not found for phase <phase>: <path>')`. The throw is intentional; a missing primer is a deployment defect, not a runtime-recoverable error.
- The placeholder primers Story 5.3 ships live at `src/lib/capstone/primers/{brief,prd,architecture,epics-and-stories,adr,dev-story-1.1}.md`. Each is ~50-100 words. **Epic 7+ stories rewrite these in full**; Story 5.3 ships them only to make `buildPrimer` functional for the Story-5.7 integration test.

**AC8 — Vitest unit coverage at `src/lib/capstone/adapters/claude-code.test.ts`**
Cases (no real `claude` binary required — the unit tests stub `runStreaming`):
- `detectInstalled` returns `true` on a stubbed exit-0 + version-banner stdout; `false` on exit-1; `false` on `ENOENT` thrown from spawn; `false` on banner-absent stdout.
- `detectInstalled` returns `false` and warns when version is below `manifest.minVersion`.
- `detectAuthenticated` returns `true` when stubbed events include `system/init` + `assistant/message_start`; `false` when missing one or both; `false` on timeout (stub never yields exit).
- `buildSpawnArgs` produces argv with `--print`, `--input-format stream-json`, `--output-format stream-json`, `--include-partial-messages`, `--system-prompt-file <path>`, `--add-dir <CHOSEN_DIR>`, `--bare`. With `sessionId === ''`, no `--resume` is present; with `sessionId === 'abc-123'`, `--resume abc-123` is present.
- `buildSpawnArgs.env` includes `process.env` keys but does not synthesize new keys.
- `parseStreamChunk` round-trips each of the five `ChatStreamEvent` variants from canonical stream-json fixtures committed to the test file (one fixture per variant, copy-pasted from Q-Tech-1 evidence).
- `parseStreamChunk` on malformed JSON returns a single `{ kind: 'error', message: 'malformed stream-json line: …' }` event without throwing.
- `parseStreamChunk` on an unrecognized event type returns `[]`.
- `formatUserMessage` JSON-escapes embedded quotes, newlines, and backslashes; result is parseable as JSON; result ends in `\n`.
- `buildPrimer` returns the full content of `src/lib/capstone/primers/<phase>.md` for each of the six phases; throws when called with a phase whose primer file is missing (test removes one primer file in a setup/teardown pair).

**AC9 — Adapter integration test at `src/lib/capstone/adapters/claude-code.integration.test.ts`**
Per architecture's Test Strategy line 337: each adapter has an integration spec that runs against the actual tool binary in CI.
- The spec is gated by `process.env.RUN_ADAPTER_INTEGRATION === '1'` (env-var-gated so dev machines without `claude` installed don't fail unit-test runs). The CI pipelines (`.vela.yml` + `.github/workflows/ci.yml`) set this env-var only on a separate `adapter-integration` job, not the main `npm run test:unit` job.
- When skipped: the `describe.skip(...)` block is rendered with a pointer to "set RUN_ADAPTER_INTEGRATION=1 to run."
- When live, the spec runs:
  - `detectInstalled()` against the real binary — expects `true`.
  - `detectAuthenticated()` against the real binary — expects `true` if `ANTHROPIC_API_KEY` is set, otherwise asserts `false` cleanly (auth-not-set is a valid CI scenario for forks without secrets).
  - A round-trip "say hi" smoke: `buildSpawnArgs` + `runStreaming` + `parseStreamChunk` against the real `claude` process; expects at least one `session-init` event, one or more `message-delta` events, and one `message-end` event.
  - The smoke writes outputs to a tmp directory + a per-test `subprocess.log` to validate the full Story-5.1+5.2 chain.
- Test cleanup: the tmp dir is `rm -rf`'d in `afterAll`; any tracked subprocesses are SIGTERM'd via `__resetForTests`.

**AC10 — Lint, typecheck, quad gate**
- `npm run lint` clean.
- `tsc --noEmit` clean (strict mode).
- `npm run test:unit` 100% green (existing tests + the new claude-code unit specs; integration spec is skipped by default).
- `npm run test:e2e` continues to pass.
- `npm run lint:links` clean.
- The integration spec (when run with `RUN_ADAPTER_INTEGRATION=1` in dev) passes against the dev box's `claude` binary at the version pinned in CI.

## Tasks/Subtasks

- [ ] **Task 1 — Promote Story-5.2 stub to working module (AC1)** — replace the throwing stubs with real implementations. Keep the manifest values (or tighten minVersion based on `claude --version` observed in dev). Remove the Story-5.2 stub-error import test from `index.test.ts`.

- [ ] **Task 2 — `detectInstalled` (AC2)** — wire `runStreaming({ cmd: 'claude', args: ['--version'], cwd: os.homedir() })`; collect stdout lines; regex-match version banner; semver-compare against `manifest.minVersion`. Add the inline `>=X.Y.Z` semver fallback if `semver` is not promoted to a direct dep.

- [ ] **Task 3 — `detectAuthenticated` (AC3)** — wire the `claude --print --bare 'say hi in one word' --max-budget-usd 0.001 --output-format stream-json` spawn with a 15s `AbortController`. Parse events incrementally; return as soon as `system/init` + `assistant/message_start` both observed (early-out). Document the open follow-up about preferring a future `claude auth status` if Anthropic publishes one.

- [ ] **Task 4 — `buildSpawnArgs` (AC4)** — pure function. Argv assembly per AC4's verbatim list. Include the `'…sessionId ? ['--resume', sessionId] : []'` pattern for first-turn vs. resume.

- [ ] **Task 5 — `parseStreamChunk` (AC5)** — JSON-parse each line; map event types to `ChatStreamEvent` variants per the `STREAM_JSON_EVENT_MAP` constant. Add fixtures (one canonical event payload per variant) to the test file, copy-pasted from Q-Tech-1 evidence in the research doc.

- [ ] **Task 6 — `formatUserMessage` (AC6)** — JSON-encode the text into the documented input shape. End with `\n`.

- [ ] **Task 7 — `buildPrimer` + placeholder primer files (AC7)** — write six placeholder primer files at `src/lib/capstone/primers/{brief,prd,architecture,epics-and-stories,adr,dev-story-1.1}.md`. Each is ~50-100 words: names the phase, references "read prior artifacts from CHOSEN_DIR (FR-3.16)", and is explicitly labelled "PLACEHOLDER — full primer lands in Epic 7+ Story 7a-N / 7b-N." `buildPrimer(phase)` reads via `fs.readFileSync(path.join(__dirname, '..', 'primers', `${phase}.md`), 'utf8')`.

- [ ] **Task 8 — Unit Vitest spec (AC8)** — implement the 11 cases in AC8 with `runStreaming` stubbed. Use `vi.mock('../subprocess/run-streaming', ...)` to inject a fake async iterable that yields canned events.

- [ ] **Task 9 — Integration Vitest spec (AC9)** — implement the env-var-gated integration spec at `claude-code.integration.test.ts`. Documented `RUN_ADAPTER_INTEGRATION=1` invocation in the test file's header comment + in `package.json` as `npm run test:adapter-integration` script.

- [ ] **Task 10 — CI hook for adapter-integration (AC9, AC10)** — add a `test:adapter-integration` script to `package.json`. Add a paired job in `.vela.yml` and `.github/workflows/ci.yml` that runs ONLY when `claude` (and the corresponding env-var auth) is available — gated on a CI matrix entry that sets `RUN_ADAPTER_INTEGRATION=1` for that job. The main `npm run test:unit` job continues to skip integration specs by default. **Maintain the maintenance invariant from architecture line 322: both pipeline files MUST stay in sync on what they check.**

- [ ] **Task 11 — Quad gate clean (AC10)** — run lint, typecheck, test:unit, test:e2e, lint:links. Run the new claude-code unit spec 10× to confirm no flake (the `vi.mock` fake-iterable patterns can be racey if not awaited carefully). Land the adapter-integration job in a separate verification step on the dev box.

### Review Findings

_To be populated by code review after implementation._

## Dev Notes

**Architecture references** (`_bmad-output/planning-artifacts/architecture.md`):
- §"Capstone Runtime → v1 Supported Tools" line 267 — claude-code's manifest highlights and per-tool implementation notes verbatim. AC4's argv list lifts directly.
- §"Capstone Runtime → AI Tool Abstraction Layer" line 260 — session model: spawn-per-message + `--resume <session-id>`. AC4's "no `--resume` on first turn" is the corollary.
- §"Test Strategy" line 337 — adapter integration tests run against the real binary; CI pins the version. AC9 implements this.

**PRD references** (`_bmad-output/planning-artifacts/prd.md`):
- FR-3.25 (v1 supported tools) line 562 — claude-code is one of three; AC1 honors.
- FR-3.4 (curated v1 list with detection badges) line 520 — `detectInstalled` returning a boolean drives the wizard's ✓ badge.
- FR-3.5 (auth pre-check) line 521 — `detectAuthenticated` is the surface; the wizard gates Phase 1 on a green result.
- NFR-S5 (AI tool sandboxing) line 630 — `--add-dir <CHOSEN_DIR>` in `buildSpawnArgs` (AC4) is the native-primitive sandbox per architecture line 308 (TM-1).

**Brainstorm references** (`_bmad-output/brainstorming/brainstorming-session-2026-05-08-1953.md`):
- Phase-3 Irreducible #1 ("tool selection + adapter — claude-code AND codex") line 396 — claude-code is the gold-standard reference.
- F-CRIT-1 (adapter sandboxing) lines 232-235 — `--add-dir` is the native-primitive realization for claude-code.
- F-DEF-9 (always-explicit cwd) — the `cwd: os.homedir()` for `detectInstalled` is intentional: probing the binary's existence has nothing to do with CHOSEN_DIR (which doesn't exist yet at Phase 0).

**Research references** (`_bmad-output/research/q-tech-decisions-2026-05-08.md`):
- Q-Tech-1 lines 9-66 — full evidence dump on `claude`'s programmatic invocation surface (`--print`, `--input-format stream-json`, `--output-format stream-json`, `--include-partial-messages`, `--system-prompt-file`, `--session-id`, `--resume`, `--add-dir`, `--bare`, `--max-budget-usd`). AC4 lifts the argv list verbatim.
- Q-Tech-5 lines 192-213 — spawn-per-message + `--resume`; AC4's "no `--session-id` flag, capture from `system/init`" follows.
- Q-Tech-1 closing note about `--debug-file` — flagged here as a v1.1 candidate for richer per-session debug logs beyond `subprocess.log`.

**Why the auth probe spawns a real (cost-bounded) chat call:**

Claude Code does not (as of 2026-05-08) expose a documented "is this auth-only valid?" flag. The cost-bounded chat probe (`--max-budget-usd 0.001`) is the cheapest way to confirm both `ANTHROPIC_API_KEY` is valid AND the network is reachable. The 15-second timeout cuts off pathologically slow auth attempts. Trade-off accepted: 1-3 seconds per Phase 0.5 visit + ~$0.001 of model spend (which trainees may bear). v1.1 swaps in a documented auth-status flag if Anthropic ships one.

**Why placeholder primers in Story 5.3:**

Story 5.7 (chat-stream Route Handler) needs `buildPrimer` to return *something* when its integration smoke runs. The full primer content is Epic-7+ work. Shipping placeholders here keeps Stories 5.7 / 7a / 7b cleanly sequenced: 5.3 makes `buildPrimer` work; 7a/7b replace the placeholders with real BMAD-skill markdown.

**Why `detectInstalled` warns on version drift but still returns `false`:**

TM-6 (tool-version drift) requires we surface the drift, not paper over it. The boolean return drives the wizard's ✓/✗ display; the `console.warn` lands the parsed-version-vs-range mismatch in the dev terminal where a developer can see it. Epic 6's wizard story will surface the warning's content in the UI; here we keep the side-channel warn so Story 5.3 doesn't depend on UI surface.

**Defensible deviations from research/architecture verbatim:**

- The architecture's `buildSpawnArgs(opts: ChatSpawnOpts): string[]` returned argv only; Story 5.2's interface widening to `{ cmd, args, env? }` is honored here. Story 5.3's argv matches the architecture exactly except for the env wrapping.
- Q-Tech-1 lists `--debug-file <path>` as a follow-up; Story 5.3 does NOT include it (NFR-S4 invariant 7 — `subprocess.log` — is owned by `runStreaming`, which the adapter calls into). v1.1 may add `--debug-file` to capture Claude Code's own internal logs.

**Test approach:**

- Unit tests stub `runStreaming` via `vi.mock` — no real `claude` invocation in `npm run test:unit`. Keeps unit tests deterministic and ENOENT-resilient on machines without claude installed.
- Integration tests gated by `RUN_ADAPTER_INTEGRATION=1`. Documented in test file headers + `package.json` script. CI runs them on a separate matrix job per Task 10.
- The integration smoke uses Story 5.1's `runStreaming` end-to-end, validating the Story 5.1 + 5.2 + 5.3 chain.

**No-egress / runtime-fs sanity:**

- Unit tests: no network, no filesystem beyond test fixtures. NFR-S1 invariant holds.
- Integration test: spawns `claude` which itself makes Anthropic API calls under the trainee's own auth (per NFR-S1's explicit out-of-scope clause for subprocess remote calls). Portal makes zero portal-originated calls.

**Architecture-doc drift check:**

- The architecture's `buildSpawnArgs` signature mismatch with Story 5.2's widened interface is the only doc-drift; tracked as a Story-5.2 follow-up. Story 5.3 doesn't introduce new drift.
- AC2's semver check is consistent with TM-6 (tool-version drift) lines 313 — no new architectural surface.

## Dev Agent Record

### Implementation Plan

_To be filled in by the dev agent at implementation time._

### Debug Log

_To be filled in by the dev agent during implementation._

### Completion Notes

_To be filled in by the dev agent after the quad gate is clean._

## File List

**Expected new files:**
- `src/lib/capstone/adapters/claude-code.test.ts` (unit spec; existing `claude-code.ts` from Story 5.2 is rewritten in place — see modified)
- `src/lib/capstone/adapters/claude-code.integration.test.ts` (env-gated integration spec)
- `src/lib/capstone/primers/brief.md` (placeholder)
- `src/lib/capstone/primers/prd.md` (placeholder)
- `src/lib/capstone/primers/architecture.md` (placeholder)
- `src/lib/capstone/primers/epics-and-stories.md` (placeholder)
- `src/lib/capstone/primers/adr.md` (placeholder)
- `src/lib/capstone/primers/dev-story-1.1.md` (placeholder)
- `_bmad-output/implementation-artifacts/5-3-claude-code-adapter.md` (this file)

**Expected modified files:**
- `src/lib/capstone/adapters/claude-code.ts` (Story-5.2 stub → real implementation)
- `src/lib/capstone/adapters/index.test.ts` (remove the "claude-code stub throws" case; the real adapter now works)
- `package.json` (add `test:adapter-integration` script; possibly promote `semver` to a direct dep)
- `.vela.yml` (add adapter-integration matrix job)
- `.github/workflows/ci.yml` (mirror the adapter-integration matrix job — maintain pipeline parity per architecture line 322)

## Change Log

- 2026-05-08 — Story file authored from session-state-2026-05-08-rebuild-planning.md §"Epic structure to author" + Q-Tech-1 verbatim + architecture §"Capstone Runtime → v1 Supported Tools" lines 266-267.
