# Story 5.7: SSE chat-stream Route Handler shape

**Epic:** 5 — Capstone Runtime Foundation
**Story Key:** 5-7-sse-chat-stream-route-shape
**Status:** SUPERSEDED (2026-05-09)

> **⚠ Superseded by the PTY pivot (commit `d677123`).** The SSE chat-stream Route Handler this story shipped (`/api/capstone/chat/[sessionId]/stream/`) and the chat-thread bubble UI it fed have been deleted. The chat phases now spawn the AI tool interactively in a server-side PTY (`node-pty`) rendered via xterm.js — the trainee drives the tool the same way they would at their own terminal. New shape: `/api/capstone/chat/[sessionId]/pty/spawn` POST registers a PTY under `<sessionId>.<phase>` in the shared registry and the generic `/api/capstone/pty/[ptyId]/{output,keystroke,resize}` routes serve it. Driven by trainee feedback that the chat-bubble UI was less educational than seeing the tool's native UX. See architecture.md editHistory `2026-05-09 — PTY pivot` for the full rationale.

## Story

As the developer wiring the central chat-proxy surface (PRD §FR-3.15-3.20 / architecture §"Capstone Runtime → AI Tool Abstraction Layer"),
I want `GET /api/capstone/chat/[sessionId]/stream` to spawn the trainee's adapter as a subprocess via Story 5.1's `runStreaming`, write the user's message via the adapter's `formatUserMessage` (or skip stdin entirely for argv-driven Copilot), and stream the adapter's `parseStreamChunk`-decoded `ChatStreamEvent`s to the browser as Server-Sent Events,
So that Epics 7+ can build the per-phase chat UI on top of a working end-to-end pipe — and the spawn-per-message + `req.signal.abort` → SIGTERM lifecycle is validated against a stub adapter (deterministic) plus the three real adapters (integration-gated) before any user-facing chat surface lands.

## Acceptance Criteria

**AC1 — `GET /api/capstone/chat/[sessionId]/stream` Route Handler exists with the required runtime config**
- File: `src/app/api/capstone/chat/[sessionId]/stream/route.ts`.
- Exports `runtime = 'nodejs'` and `dynamic = 'force-dynamic'` (the architecture's verbatim requirements at line 261).
- Method: `GET` only (per architecture line 232 — the SSE stream endpoint is GET because EventSource doesn't support POST).
- Query parameters (read from `new URL(req.url).searchParams`):
  - `phase` — required; one of `brief|prd|architecture|epics-and-stories|adr|dev-story-1.1`.
  - `message` — required; the trainee's typed message; URL-encoded; max length enforced by Zod at 32_000 chars (matches F-DEF-13 from brainstorm).
  - `tool` — required; one of `claude-code|codex|github-copilot`.
  - `chosenDir` — required; absolute path to CHOSEN_DIR.
- Path parameter: `[sessionId]` — either an empty placeholder for first turn (`'new'` literal — see AC2) or a previously-captured tool-native session id (`/^[a-zA-Z0-9-_]+$/`).
- Response status `400` (with `Content-Type: application/json`) on Zod validation failure for any param. `200` on success with `Content-Type: text/event-stream`.

**AC2 — First-turn vs. resume distinction**
- The path segment `sessionId === 'new'` is the first-turn signal. The Route Handler:
  1. Builds the spawn opts with `sessionId: ''` (signaling the adapter's `buildSpawnArgs` to NOT include `--resume`).
  2. After the spawn, captures the first `ChatStreamEvent` of `kind: 'session-init'` from the adapter's `parseStreamChunk` output, persists `(sessionId, phase, capturedSessionId)` to SQLite via a new `progress-db` helper `recordCapstoneToolSessionId(<capstone-session-id>, phase, toolSessionId)`, and forwards the `session-init` SSE event to the browser so the client can update its URL.
- Any other `sessionId !== 'new'` is a resume turn: spawn opts include `sessionId: <captured>`. No `session-init` event expected (or if observed, it confirms the resume worked).
- The architecture's `progress` table extension adds a new `kind` value `'capstone-tool-session'` with `id = '<capstone-session-id>/<phase>'` and the captured tool-session-id stored in `completed_at` (per the column-overload pattern from architecture line 210). Story 5.7's task list includes the schema/Zod widening + a Vitest case parallel to Story 4.1's pattern.

**AC3 — Adapter-driven spawn**
- The handler resolves the adapter via `getAdapterRegistry().get(tool)` (Story 5.2 surface); throws 500 if absent (defensive — Zod should have caught an invalid tool id, but the lookup defends against registry corruption).
- Builds spawn opts via `adapter.buildSpawnArgs({ chosenDir, sessionId: '' or <captured>, primerPath: <abs-path-to-primer-for-phase>, userMessage: message, phase })`. The `primerPath` is `path.join(process.cwd(), 'src/lib/capstone/primers', `${phase}.md`)` for v1 (the placeholders Story 5.3 ships).
- For Copilot specifically (per Story 5.5 AC7): on first turn, the handler ALSO writes the primer content (from `loadPrimer(phase)` — Story 5.5's shared helper) to `path.join(chosenDir, '.github/copilot-instructions.md')`. The architecture's TM-2 path-write allowlist constrains writes to inside CHOSEN_DIR, which `.github/copilot-instructions.md` satisfies (it's under CHOSEN_DIR).
- Calls `runStreaming` with the spawn opts plus:
  - `cwd: chosenDir` (NFR-S4 invariant 5).
  - `signal: req.signal` (NFR-S4 invariant 3).
  - `sessionLogPath: path.join(<portal-session-dir>, 'subprocess.log')` where `<portal-session-dir>` is `data/capstone-sessions/<capstone-session-id>/` (NFR-S4 invariant 7 — per-session subprocess.log).

**AC4 — User-message stdin handling honoring the empty-string convention**
- After spawn, the handler calls `adapter.formatUserMessage(message)`.
- If the result is non-empty: `child.stdin.write(formatted); child.stdin.end()`. (claude-code, codex.)
- If the result is empty: skip the stdin write entirely. (github-copilot — message is in argv.)
- The adapter handle is exposed by `runStreaming` for the Route Handler to access stdin. **Story 5.1 deviation note:** the `runStreaming` function returns `AsyncIterable<ProcEvent>`, which doesn't expose the underlying child handle. Story 5.7 needs either:
  - **Option A:** Extend `runStreaming` to optionally accept a `onSpawn?: (child: ChildProcess) => void` callback that fires synchronously after `spawn()`. The Route Handler captures the child via this callback and writes to stdin. Story 5.7's task list adds this affordance to `runStreaming`. (Preferred — minimal interface widening.)
  - **Option B:** Add a separate `runStreamingWithStdin(opts, stdinPayload): AsyncIterable<ProcEvent>` overload. Rejected — adds a near-duplicate function that violates the "single primitive" spirit.
- AC4 commits to Option A. Story 5.1 is updated retroactively (Story 5.7's task list lands the Story-5.1 patch in the same commit).

**AC5 — Stream events to SSE per architecture line 261's wire format**
- For each `ProcEvent` of `kind: 'stdout-line'`, the handler calls `adapter.parseStreamChunk(text)` and forwards each resulting `ChatStreamEvent` as an SSE event:
  - `event: msg\ndata: {<JSON of ChatStreamEvent>}\n\n` for `message-delta`, `tool-call`, `session-init`, `error`.
  - `event: done\ndata: {<JSON of {kind:'message-end'} OR {kind:'exit', code, signal}>}\n\n` immediately followed by `controller.close()` for `message-end` (or terminal `exit` from the subprocess).
- For each `ProcEvent` of `kind: 'stderr-line'`: NOT forwarded to the browser (per the brainstorm's anti-leak stance — stderr is for `subprocess.log`, not the chat surface). The architecture's "show full agent output, including tool calls" stance (FR-3.17) applies to the agent's own structured/text output, not subprocess stderr (which is portal-side debug noise).
- For the terminal `ProcEvent` of `kind: 'exit'`: emit `event: done\ndata: {"kind":"exit","code":<n>,"signal":<s>}\n\n`, then close the stream.
- `Cache-Control: no-cache, no-transform`, `Connection: keep-alive`, `X-Accel-Buffering: no` headers per architecture lines 280-285.

**AC6 — `req.signal.abort` SIGTERMs the child (NFR-S4 invariant 3)**
- The handler does NOT add its own `req.signal` listener — `runStreaming` already honors `opts.signal` per Story 5.1. The handler just passes `req.signal` through.
- On tab close / navigation away / browser-side `EventSource.close()`: the SSE Response's underlying `Request.signal` aborts; `runStreaming`'s abort listener fires; the child receives SIGTERM (then SIGKILL after grace).
- Vitest case validates this: handler is invoked with a synthetic `Request` whose `signal` is aborted mid-stream; the spy on `child.kill` captures `SIGTERM`.

**AC7 — Stub adapter for deterministic E2E test**
- `src/lib/capstone/adapters/stub.ts` exists (test-only, NOT in the registry) — implements `ToolAdapter` with canned responses:
  - `detectInstalled` / `detectAuthenticated` always `true`.
  - `buildSpawnArgs` returns `{ cmd: 'node', args: ['-e', '<inline-script>'], env: process.env }` where the inline script writes a canned sequence of NDJSON lines to stdout simulating a chat turn:
    ```
    {"type":"system","subtype":"init","session_id":"stub-session-123"}
    {"type":"assistant","subtype":"content_block_delta","text":"Hello "}
    {"type":"assistant","subtype":"content_block_delta","text":"trainee."}
    {"type":"assistant","subtype":"message_stop"}
    ```
  - `parseStreamChunk` decodes the canned NDJSON to `ChatStreamEvent`s.
  - `formatUserMessage` returns `text + '\n'`.
  - `buildPrimer` returns `'# Stub primer\n'`.
- A getter `getStubAdapter(): ToolAdapter` is exported (NOT registered by `getAdapterRegistry`); used only in the chat-stream Route Handler tests + a Playwright smoke (AC9).

**AC8 — Vitest unit coverage at `src/app/api/capstone/chat/[sessionId]/stream/route.test.ts`**
Cases:
- Zod validation: missing `phase` → 400; invalid `phase` value → 400; missing `message` → 400; `message` >32k → 400; missing `tool` → 400; invalid `tool` → 400; missing `chosenDir` → 400; non-absolute `chosenDir` → 400; invalid `sessionId` path segment (`'..'` or other path-traversal-ish) → 400.
- Method: POST → 405.
- First turn (`sessionId === 'new'`): handler captures the `session-init` event from the (mocked) adapter and calls `recordCapstoneToolSessionId` once with the captured tool-session-id. The first SSE event the response yields is `event: msg\ndata: {"kind":"session-init",...}`.
- Resume (`sessionId === 'abc-123'`): handler does NOT call `recordCapstoneToolSessionId`. Spawn opts include the resume sessionId.
- Stub adapter end-to-end (using AC7's stub): handler returns a Response whose body is a ReadableStream; consuming all chunks yields the canned event sequence as SSE-formatted lines, terminated by `event: done`.
- Empty-string `formatUserMessage` (Copilot path): handler does NOT write to stdin (spy on `child.stdin.write` records 0 calls); handler DOES write `loadPrimer(phase)` content to `<chosenDir>/.github/copilot-instructions.md` on first turn (spy on `fs.writeFile`).
- Abort: synthetic `Request` with an `AbortController.signal` that fires after the first SSE chunk is consumed; the spy on `child.kill` records `SIGTERM`. The response stream ends within `SIGKILL_GRACE_MS + 500`.
- Subprocess.log: spy on `fs.createWriteStream` confirms the path is `path.join('data/capstone-sessions', '<capstone-session-id>', 'subprocess.log')`.
- Architecture-lock smoke: route file does NOT import `next/server`'s `NextRequest`/`NextResponse` (uses plain `Request` / `Response`); does NOT export anything other than `GET`, `runtime`, `dynamic`.

**AC9 — Playwright smoke at `tests/e2e/capstone-chat-stream.spec.ts`**
- Uses the stub adapter via a test-only env var `CAPSTONE_USE_STUB_ADAPTER=1`. The Route Handler reads this env var and substitutes `getStubAdapter()` for the registry lookup when set. **Without the env var, the env-var path is unreachable** — production code does not check for it (the substitution happens via a shim only loaded when the env var is set, gated at module-load time).
- The Playwright spec navigates to a synthetic test page (or directly to the SSE URL) and:
  - Asserts the SSE stream connects and produces the canned events.
  - Asserts `EventSource` reconnect works after a forced server-side close (validates the architecture's "auto-reconnect via Last-Event-ID" claim at line 261 — soft assertion since reconnect on close requires the Route Handler to honor `Last-Event-ID`, which v1 does NOT yet implement; AC9 logs a follow-up if reconnect doesn't work).
- Per architecture's no-React-component-tests-at-v1 lock: this is an E2E test driving HTTP directly, not rendering React. Acceptable.

**AC10 — Schema + Zod widening for `capstone-tool-session` kind**
- `src/db/schema.sql`'s `progress` table CHECK constraint (or its absence) accommodates the new kind value. Since the table uses a `kind` TEXT column without a SQL CHECK on `kind` values (per Story 4.1), no schema change is required; the kind enum is enforced at the Zod boundary only.
- `src/lib/db/schemas.ts`: extend `ProgressUpsertRequest`'s discriminated union with a fifth branch `capstone-tool-session`:
  - `id` matches `^\d{8}T\d{6}Z\/(brief|prd|architecture|epics-and-stories|adr|dev-story-1.1)$` (capstone-session-id slash phase name).
  - `completed_at` (storage column) carries the tool-native session id string.
- New helper `recordCapstoneToolSessionId(capstoneSessionId, phase, toolSessionId): void` in `progress-db.ts`. Vitest cases parallel Story 4.1's pattern.

**AC11 — `runStreaming` extended with `onSpawn` callback (AC4 dependency)**
- Story 5.1's `RunOptions` gains an optional `onSpawn?: (child: ChildProcess) => void` field. When set, called synchronously immediately after `spawn()` returns (before any `data` events). Used by the Route Handler to capture the child handle for stdin writes.
- Story 5.1's existing tests are updated to confirm: (a) `onSpawn` is called exactly once with the child as the argument; (b) absence of `onSpawn` does not regress any existing behavior. Both cases land in this story.

**AC12 — Lint, typecheck, quad gate**
- `npm run lint` + `tsc --noEmit` + `npm run test:unit` + `npm run test:e2e` (now includes capstone-chat-stream.spec.ts) + `npm run lint:links` clean.

## Tasks/Subtasks

- [ ] **Task 1 — Extend `runStreaming` with `onSpawn` callback (AC11)** — modify `src/lib/capstone/subprocess/run-streaming.ts` to accept the optional callback and invoke it once. Update `run-streaming.test.ts` with two new cases (callback called with child; no regression without callback). This is the Story-5.1 retroactive patch noted in AC4.

- [ ] **Task 2 — Stub adapter (AC7)** — implement `src/lib/capstone/adapters/stub.ts` with `getStubAdapter()`. NOT registered by `getAdapterRegistry`. Vitest case verifying the stub's `parseStreamChunk` decodes the canned NDJSON correctly.

- [ ] **Task 3 — Route Handler scaffold (AC1)** — create `src/app/api/capstone/chat/[sessionId]/stream/route.ts` with `runtime`/`dynamic` exports + Zod schema for query params + path-segment validation. Reject 400 on validation failure with `{ ok: false, error, details }`.

- [ ] **Task 4 — Spawn + adapter wiring (AC3, AC4)** — wire the adapter resolution → `buildSpawnArgs` → `runStreaming` (with `onSpawn` capturing the child + `cwd` + `signal` + `sessionLogPath`) → conditional stdin write. Copilot-specific primer-write to CHOSEN_DIR/.github/copilot-instructions.md.

- [ ] **Task 5 — SSE event formatting + stream control (AC5)** — for each adapter-decoded event, format the SSE frame and enqueue. Terminal events close the stream. Stderr events drop on the floor (subprocess.log captures them).

- [ ] **Task 6 — First-turn session-id capture (AC2, AC10)** — extend the Zod + storage layer with `capstone-tool-session` kind. `recordCapstoneToolSessionId` helper. Route Handler captures the first `session-init` event and persists.

- [ ] **Task 7 — Vitest unit coverage (AC8)** — implement the 11 cases. Use `vi.mock` for `runStreaming` AND for the `getAdapterRegistry` so the test can inject the stub.

- [ ] **Task 8 — Playwright e2e spec (AC9)** — `tests/e2e/capstone-chat-stream.spec.ts` driving the SSE URL with `CAPSTONE_USE_STUB_ADAPTER=1`. Asserts canned event sequence; soft-asserts EventSource reconnect.

- [ ] **Task 9 — Quad gate clean (AC12)** — run all five gates. Confirm `test:e2e` passes with the new spec. Confirm Story-5.1's existing run-streaming tests still pass with the `onSpawn` extension.

### Review Findings

_To be populated by code review after implementation._

## Dev Notes

**Architecture references:**
- §"API & Communication Patterns → Endpoints (v1)" line 232 — `GET /api/capstone/chat/[sessionId]/stream` verbatim: "spawn the trainee's AI tool subprocess with `--resume <session-id>`, write the user message to its stdin, stream the agent's stdout JSON-lines back as SSE events. `runtime='nodejs'`, `dynamic='force-dynamic'`. Single endpoint per turn; `req.signal.abort` kills the child on tab close."
- §"Capstone Runtime → Browser transport" line 261 — SSE wire format and reasoning.
- Lines 280-285 — verbatim Route Handler skeleton showing the SSE response shape, headers, abort listener pattern. AC5 mirrors.
- §"Capstone Runtime → AI Tool Abstraction Layer" line 260 — spawn-per-message + tool-native resume; AC2 implements first-turn vs resume.

**PRD references:**
- FR-3.15 line 540 — chat surface proxies the AI tool.
- FR-3.16 line 541 — cross-phase context = files on disk; AC3 passes `primerPath` as the per-phase BMAD primer.
- FR-3.17 line 542 — anti-magic chat (tool calls visible); AC5 forwards `tool-call` events without dressing them up.
- FR-3.20 line 545 — cancel + streaming; AC6 honors via `req.signal.abort` → SIGTERM.
- NFR-S4 line 629 — subprocess discipline; AC3+AC6 inherit from Story 5.1's `runStreaming`.

**Brainstorm references:**
- F-CRIT-5 (subprocess lifecycle) lines 248-251 — abort-on-tab-close is the irreducible behavior; Story 5.1 enforces, Story 5.7 wires.
- F-DEF-13 (trainee-message size cap) line 311 — 32k hard cap on `message` query param.
- Prod-1 (show full agent output, tool calls included) line 132 — AC5's stderr-NOT-forwarded keeps subprocess noise out of the chat surface; agent stdout (parsed via adapter) IS forwarded with full fidelity including tool calls.

**Research references:**
- Q-Tech-6 lines 216-291 — SSE choice rationale + reference Route Handler skeleton verbatim. AC1's `runtime='nodejs'`/`dynamic='force-dynamic'` is non-negotiable.
- Q-Tech-7 lines 296-345 — single `runStreaming` primitive; AC3+AC4 honor (with the `onSpawn` extension noted).

**Why GET (not POST) for the SSE endpoint:**

`EventSource` (the browser-native SSE client) only supports GET. Per architecture line 232's note ("the chat-message POST that triggers the SSE stream OR pass via query param to a GET stream endpoint"), Story 5.7 picks the GET-with-query-param shape because it lets `EventSource` connect directly without a separate POST → GET orchestration. The trade-off is the message goes through URL-encoding (which is fine for 32k of UTF-8 text). Documented.

**Why the handler returns 200 even when the spawn fails:**

The SSE response status is set BEFORE the subprocess spawns (we need `Content-Type: text/event-stream` to commit). If spawn fails (ENOENT, permission denied), the handler emits an `event: error\ndata: {"kind":"error","message":"..."}` SSE event and then `event: done`. The HTTP-level status remains 200; the failure is communicated in-band via the SSE error event. Trainee sees "tool failed to launch: ENOENT (claude not on PATH)" in the chat surface — actionable.

**Why Copilot's primer-write happens in the Route Handler, not the adapter:**

Story 5.5's AC7 deferred the actual file-write to Story 5.7. The reasoning: the adapter is a pure-ish per-turn decision module (build args, parse output, format input), not a side-effect orchestrator. Path-write side effects belong in the Route Handler, where the threat-model context (TM-1 sandbox / TM-2 path allowlist) is already in scope. Documented.

**Why stub adapter instead of mocking the real adapters in tests:**

The Vitest unit tests can mock `getAdapterRegistry` directly. The Playwright e2e test can NOT — Playwright runs against a live `next dev` server, which doesn't see Vitest mocks. The stub adapter is the e2e-test-time substitution mechanism: the Route Handler's adapter resolution checks `process.env.CAPSTONE_USE_STUB_ADAPTER === '1'` and substitutes when set. The env-var gate is loaded at MODULE LOAD time so the production path has zero overhead when the env var is unset.

**Defensible deviations:**

- AC11 retroactively patches Story 5.1. Story-5.1's spec doesn't include `onSpawn`. Two options were considered: (1) add `onSpawn` as an Story-5.1 patch in the same commit (AC11's choice); (2) introduce a `runStreamingWithChildHandle` companion. Option 1 is the smallest interface widening; the existing tests need 2 new cases to cover the new field; the existing call sites (Story 5.6's preflight) are unaffected because `onSpawn` is optional.
- AC9's EventSource reconnect assertion is soft because v1 does NOT implement `Last-Event-ID` reply support — the SSE Route Handler emits each event without an `id:` field. v1.1 may add IDs + reconnect-aware resumption. v1's "reconnect after a server restart" relies on the browser re-issuing the GET, which restarts the entire chat turn; that's documented as a known limitation.

**Test approach:**

- Vitest unit tests: stub the adapter registry + mock `runStreaming` to control event sequences. No real binary spawned in unit tests.
- Stub adapter (`stub.ts`) drives the Playwright e2e and a full-stack unit case via real `node -e` subprocess (deterministic, no third-party binary).
- Adapter integration tests (Stories 5.3/5.4/5.5) exercise the real binaries; this story does NOT add an integration test of its own — the spawn + parse path is covered by the per-adapter integration spec.

**No-egress / runtime-fs sanity:**

- Filesystem touches inside CHOSEN_DIR (Copilot primer file) are within the trainee's chosen tree, NOT the portal's. Out-of-scope for the no-egress test (`tests/e2e/no-egress.spec.ts` records portal-originated browser network requests, not filesystem writes).
- No portal-originated network calls. NFR-S1 invariant holds.

**Architecture-doc drift check:**

- AC11's `onSpawn` extension to `RunOptions` is additive, not contradictory; Story 5.1 already had a planned architecture-doc edit (`sessionLogPath`); this story's edit batches with that one.
- AC2's `capstone-tool-session` kind value extends architecture line 210's `kind` enum (which already includes capstone-tool and capstone-target). Architectural doc note: extend the kind enumeration after Story 5.7 lands. Tracked as follow-up.

## Dev Agent Record

### Implementation Plan

_To be filled in by the dev agent at implementation time._

### Debug Log

_To be filled in by the dev agent during implementation._

### Completion Notes

_To be filled in by the dev agent after the quad gate is clean._

## File List

**Expected new files:**
- `src/app/api/capstone/chat/[sessionId]/stream/route.ts`
- `src/app/api/capstone/chat/[sessionId]/stream/route.test.ts`
- `src/lib/capstone/adapters/stub.ts`
- `src/lib/capstone/adapters/stub.test.ts`
- `tests/e2e/capstone-chat-stream.spec.ts`
- `_bmad-output/implementation-artifacts/5-7-sse-chat-stream-route-shape.md` (this file)

**Expected modified files:**
- `src/lib/capstone/subprocess/run-streaming.ts` (add `onSpawn` to `RunOptions`; invoke once after spawn)
- `src/lib/capstone/subprocess/run-streaming.test.ts` (two new cases for `onSpawn`)
- `src/lib/db/schemas.ts` (extend `ProgressUpsertRequest` with `capstone-tool-session` kind branch + `CAPSTONE_TOOL_SESSION_ID` regex)
- `src/lib/db/progress-db.ts` (new helper `recordCapstoneToolSessionId`)
- `src/lib/db/progress-db.test.ts` (Vitest cases for the new helper, mirroring Story 4.1's pattern)
- `playwright.config.ts` (no changes anticipated unless the new spec needs a separate project; document)

## Change Log

- 2026-05-08 — Story file authored from architecture lines 232 + 261 + 280-285 + Q-Tech-6 + FR-3.15-3.20.
