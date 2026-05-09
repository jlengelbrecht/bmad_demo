# Story 5.1: `runStreaming` subprocess primitive + tracked-children registry

**Epic:** 5 — Capstone Runtime Foundation
**Story Key:** 5-1-run-streaming-subprocess-primitive
**Status:** ready-for-dev

## Story

As the developer landing the rebuilt capstone runtime,
I want a single `runStreaming(opts): AsyncIterable<ProcEvent>` module under `src/lib/capstone/subprocess/` that enforces all seven subprocess-discipline non-negotiables (NFR-S4) in one place,
So that every other Epic-5+ story (adapters, bootstrap, chat-stream Route Handler) consumes the same primitive instead of re-implementing pipe-draining, signal handling, AbortSignal wiring, and `subprocess.log` writing per call site — with a single chokepoint where the lifecycle invariants can be reviewed once and trusted everywhere.

## Acceptance Criteria

**AC1 — `runStreaming(opts): AsyncIterable<ProcEvent>` exists at `src/lib/capstone/subprocess/run-streaming.ts`**
- Module exports the `runStreaming` function and the `ProcEvent` / `RunOptions` types verbatim per architecture §"Capstone Runtime → Subprocess Discipline" (lines 285-294):
  ```ts
  type ProcEvent =
    | { kind: 'stdout-line'; text: string }
    | { kind: 'stderr-line'; text: string }
    | { kind: 'exit'; code: number | null; signal: NodeJS.Signals | null };

  interface RunOptions {
    cmd: string;
    args: string[];
    cwd?: string;
    env?: NodeJS.ProcessEnv;
    signal?: AbortSignal;
    sessionLogPath?: string; // optional: where to append subprocess.log entries (NFR-S4 invariant 7)
  }

  function runStreaming(opts: RunOptions): AsyncIterable<ProcEvent>;
  ```
- The async iterable yields `stdout-line` and `stderr-line` events as newline-delimited chunks become available, plus exactly one terminal `exit` event before the iterator completes.
- Lines are buffered across chunks: a partial line received in one `data` chunk is concatenated with the next so consumers always see whole lines (the line-buffer correctness rule from Q-Tech-7).
- ANSI escape codes are stripped server-side from both `stdout-line.text` and `stderr-line.text` using `node:util`'s `stripVTControlCharacters` (Node ≥20, already required by `package.json` engines field). Decision per architecture line 296 + Q-Tech-10.

**AC2 — All seven NFR-S4 non-negotiables enforced by the module**
The `runStreaming` body MUST implement, in order:
1. **Drain stdout AND stderr unconditionally.** Both pipes get a `data` listener attached before the function awaits anything. The chat consumer reads `stdout-line`; the bootstrap consumer reads both. Even if a future consumer only iterates `stdout-line`, the `stderr` pipe is still drained (events are still produced; they're just ignored by that consumer).
2. **Never pass `detached: true`** to `spawn`. The default keeps the child in the parent's process group so SIGINT to `next dev` propagates automatically.
3. **Honor `AbortSignal` from `opts.signal`.** When the signal fires (the SSE Route Handler will pass `req.signal`), the child is sent SIGTERM. If the child does not exit within `SIGKILL_GRACE_MS` (constant: `5000`), it is sent SIGKILL.
4. **Global `process.on('exit'|'SIGINT'|'SIGTERM')` handler** registered exactly once at module load (idempotent — if the module is hot-reloaded under HMR, the prior handler is removed before the new one is attached). The handler iterates the `tracked-children.ts` registry and sends SIGTERM to every tracked child before the parent exits.
5. **Always pass `cwd` explicitly.** If `opts.cwd` is undefined, the function throws `Error('runStreaming: opts.cwd is required (NFR-S4 invariant 5)')` — never trust ambient cwd. The error message names the invariant so a future reader who hits it understands why.
6. **Argv-style spawn.** The function calls `spawn(opts.cmd, opts.args, { cwd, env, stdio: ['pipe','pipe','pipe'] })` with `args` as an array. Shell-string interpolation is impossible by construction (the function signature does not accept a single-string command).
7. **Subprocess.log writing.** When `opts.sessionLogPath` is provided, every `stderr-line` event is also appended to that file as `[ISO-timestamp] stderr: <text>\n`, AND the spawn header `[ISO-timestamp] spawn: <cmd> <args.join(' ')> (cwd=<cwd>, pid=<pid>)\n` is written before the first event. The file is opened in append mode (`fs.createWriteStream(path, { flags: 'a' })`); failure to open does NOT throw — it logs to `console.error` and continues (subprocess.log is a debug aid, not a blocker).

**AC3 — `tracked-children.ts` registry**
- `src/lib/capstone/subprocess/tracked-children.ts` exports:
  - `track(child: ChildProcess): void` — adds the child to a module-level `Set<ChildProcess>`.
  - `untrack(child: ChildProcess): void` — removes it.
  - `getAll(): ReadonlySet<ChildProcess>` — used by the global signal handler in `run-streaming.ts`.
  - `__resetForTests(): void` — clears the set; called from `beforeEach` in tests so test-spawned children do not leak across cases.
- `runStreaming` calls `track(child)` immediately after `spawn()` returns and `untrack(child)` after the `exit` event has been yielded.
- The module-load-time global signal handler (NFR-S4 invariant 4) imports `getAll` from this module.

**AC4 — Vitest coverage at `src/lib/capstone/subprocess/run-streaming.test.ts`**
Tests use `node -e '<inline-script>'` as the child binary — no third-party fixtures, no shell strings. Each test sets `cwd: process.cwd()` (or a tmp dir for the subprocess.log test) and asserts on the yielded events.

Cases:
- **stdout streaming** — child runs `process.stdout.write('a\nb\nc\n')`; iterator yields three `stdout-line` events with text `'a'`, `'b'`, `'c'` (no trailing newlines on the text), then an `exit` event with `code: 0, signal: null`.
- **partial-line buffering** — child writes `'partial'` then waits 50ms then writes `' end\n'`; iterator yields exactly one `stdout-line` with text `'partial end'`, not two events.
- **stderr streaming** — child runs `process.stderr.write('err1\n'); process.exit(2)`; iterator yields one `stderr-line` event with text `'err1'`, then an `exit` event with `code: 2, signal: null`.
- **ANSI stripped** — child writes `'[31mred[0m\n'` to stdout; iterator yields one `stdout-line` event with text `'red'` (no escape sequences).
- **AbortSignal SIGTERM** — caller passes an `AbortController.signal` and aborts after the iterator has yielded one event from a long-running child (`setInterval(()=>process.stdout.write('tick\n'), 100)`); within `SIGKILL_GRACE_MS + 500ms`, the iterator yields an `exit` event with `signal: 'SIGTERM'` (and the test asserts the elapsed time < 1000ms — no SIGKILL escalation needed for a well-behaved child).
- **AbortSignal SIGKILL escalation** — child traps SIGTERM and refuses to exit (`process.on('SIGTERM', ()=>{})` plus `setInterval(()=>{}, 1000)` to keep the loop alive); after the abort, within `SIGKILL_GRACE_MS + 1000ms`, the iterator yields an `exit` event with `signal: 'SIGKILL'`.
- **missing cwd throws** — calling `runStreaming({ cmd: 'node', args: ['-e','0'] })` (no `cwd`) throws synchronously with the verbatim error message `'runStreaming: opts.cwd is required (NFR-S4 invariant 5)'`.
- **subprocess.log writing** — given `sessionLogPath` pointing to a tmp file, after the iterator completes the file contains: a `spawn:` header line, one `stderr:` line per stderr-line event, and the file ends with a newline. Stdout-line events are NOT written (only stderr is, per NFR-S4 invariant 7's wording — "every spawn writes its stderr").
- **subprocess.log open failure does not throw** — given a `sessionLogPath` inside a non-existent directory, the iterator still completes successfully and yields all events; a `console.error` was called once (spied).
- **tracked-children registry round-trip** — before spawn the registry has 0 entries; after spawn but before exit, 1 entry; after the iterator completes, 0 entries.
- **global signal handler on `process.emit('SIGTERM')`** — using `vi.spyOn(process, 'kill')` to assert each tracked child receives `kill('SIGTERM')` when the global handler fires. (The test does not actually exit the test process; it directly invokes the registered listener via a small exported test-helper or by spying on the listener registration.)

**AC5 — Module surface smokes**
- A test in the same file (or a sibling `run-streaming.smoke.test.ts`) asserts:
  - `runStreaming` is the only default-or-named function export beyond the types.
  - `tracked-children.ts` exports exactly `track`, `untrack`, `getAll`, `__resetForTests` and nothing else (uses Vitest's import-as-namespace and asserts `Object.keys(...).sort()`).
  - No top-level imports from `next/*`, `react`, `react-dom`, or `@/app/*` — the subprocess primitive must not pull the Next.js runtime into its bundle. (Mirrors the import-discipline pattern from Story 3.2's route-handler tests.)

**AC6 — Lint, typecheck, quad gate**
- `npm run lint` clean.
- `tsc --noEmit` clean (strict mode; no `any` in the public surface; internal `any` only where Node typings are weak — flagged with `// eslint-disable-line @typescript-eslint/no-explicit-any` plus a one-line `// reason:` comment).
- `npm run test:unit` 100% green; no flake on the AbortSignal cases when run 10× in a row (CI-loop verification: `for i in 1..10; do npm run test:unit -- run-streaming; done`).
- `npm run test:e2e` continues to pass (no e2e changes in this story).
- `npm run lint:links` clean (no markdown changes in this story).

## Tasks/Subtasks

- [ ] **Task 1 — Scaffold `src/lib/capstone/subprocess/` module folder (AC1, AC3)** — create `run-streaming.ts`, `tracked-children.ts`, and the colocated test files (`run-streaming.test.ts`, `tracked-children.test.ts`). Add a one-line `subprocess/README.md` pointing readers at architecture §"Capstone Runtime → Subprocess Discipline" lines 271-300.

- [ ] **Task 2 — `tracked-children.ts` registry first (AC3)** — implement `track`/`untrack`/`getAll`/`__resetForTests` against a module-level `Set<ChildProcess>`. Land before `run-streaming.ts` so the latter can consume it cleanly. Vitest cases: add → getAll size 1; add+remove → size 0; reset → size 0; double-add idempotent (Set).

- [ ] **Task 3 — `runStreaming` core implementation (AC1, AC2)** —
  - Throw on missing `cwd` first (NFR-S4 invariant 5 — fail fast).
  - `spawn` with `stdio: ['pipe','pipe','pipe']`, no `detached`. Track immediately.
  - Open `sessionLogPath` write-stream in append mode; on `error` event, `console.error` and proceed.
  - Wire stdout/stderr line-buffering: maintain per-pipe `buf` strings; on each `data` chunk, append, split on `\n`, push complete lines through `stripVTControlCharacters`, enqueue events into the async-iterable's pending-events buffer.
  - Wire `opts.signal?.addEventListener('abort', ...)`: SIGTERM the child; set a `setTimeout` for `SIGKILL_GRACE_MS = 5000`; on `exit` clear the timeout.
  - On child `'close'` (use `'close'` not `'exit'` so the stdio streams have flushed): yield the `exit` event last, untrack, end the iterator.

- [ ] **Task 4 — Module-load global signal handler (AC2 invariant 4)** — top of `run-streaming.ts`, register exactly one listener per signal. Use a module-level `_handlersRegistered` flag plus `process.removeListener` on the prior reference (HMR safety). The handler iterates `getAll()` and `child.kill('SIGTERM')` each. Add a `__getRegisteredHandlerForTests` export so AC4's "global signal handler" test can invoke it directly without sending a real signal to the test runner.

- [ ] **Task 5 — Vitest coverage (AC4, AC5)** — implement the 11 cases enumerated in AC4 plus the 3 surface smokes in AC5. Each AbortSignal case wraps the elapsed-time assertion in a `Date.now()` capture before/after. The SIGKILL escalation test uses `process.on('SIGTERM', ()=>{})` inside the `node -e` script body — quoting via separate argv entries (no shell), so no escape-string headaches.

- [ ] **Task 6 — Type surface review (AC1)** — confirm `RunOptions`, `ProcEvent`, and `runStreaming`'s signature match the architecture verbatim. Export them as named types from `run-streaming.ts`. No barrel re-export at the `subprocess/` directory level (we only need direct imports from the two consumer call sites: adapter chat and bootstrap; rule of three not yet hit).

- [ ] **Task 7 — Subprocess.log format finalization (AC2 invariant 7, AC4)** — write the spawn-header line synchronously (after `spawn()` returns the child handle, before any data events). Format: `[<ISO>] spawn: <cmd> <args.join(' ')> (cwd=<cwd>, pid=<pid>)\n`. Each stderr line: `[<ISO>] stderr: <text>\n`. The file is closed when the iterator completes (`writeStream.end()`); if abort fires mid-stream, the close happens after SIGTERM/SIGKILL completes so trailing stderr is captured.

- [ ] **Task 8 — Quad gate clean (AC6)** — run `npm run test:unit`, `npm run test:e2e`, `npm run lint`, `npm run lint:links`; ensure all pass. Run the run-streaming tests 10× in a loop and confirm no flake on the AbortSignal cases (CI-loop check). If any flake surfaces, the most likely culprit is racey event ordering between `'close'` and the AbortController callback — fix by sequencing: SIGTERM → wait for `'close'` → yield `exit` → untrack.

### Review Findings

_To be populated by code review after implementation._

## Dev Notes

**Architecture references** (`_bmad-output/planning-artifacts/architecture.md`):
- §"Capstone Runtime → Subprocess Discipline" lines 271-300 — the seven non-negotiables verbatim, plus the `runStreaming` signature, the `ProcEvent` discriminated union, the "single primitive, two consumers" pattern, and the ANSI-stripping decision.
- §"Capstone Runtime → AI Tool Abstraction Layer" lines 254-262 — establishes `runStreaming` as the foundation for both chat (Phase 3-8) and bootstrap (Phase 2) consumers.
- §"Capstone Runtime → Capstone Threat Model" line 310 (TM-3) — subprocess lifecycle ownership maps to AC2 invariants 2/3/4 and AC3 (tracked-children).
- §"Folder Layout" lines 399-401 — `src/lib/capstone/subprocess/{run-streaming.ts, tracked-children.ts}` paths verbatim.
- §"Test Strategy" line 333 — Vitest is the unit-test runner; co-located `*.test.ts`.

**PRD references** (`_bmad-output/planning-artifacts/prd.md`):
- NFR-S4 (subprocess discipline) lines 629 — the seven invariants in PRD form. AC2 maps 1:1 to this list.
- NFR-S5 (AI tool sandboxing) line 630 — out-of-scope here (sandboxing is the adapter's job, not `runStreaming`'s) but motivates why `cwd` is mandatory.
- FR-3.20 (cancel + streaming) line 545 — the cancel button surfaces via `AbortSignal` propagation, which AC2 invariant 3 implements.

**Brainstorm references** (`_bmad-output/brainstorming/brainstorming-session-2026-05-08-1953.md`):
- F-CRIT-5 (subprocess lifecycle ownership) lines 248-251 — the architectural anchor for invariants 2-4. Story 5.1 IS the v1-minimum enforcement.
- F-DEF-9 (always-explicit cwd) line 296 — invariant 5.
- F-DEF-10 (argv-style spawn, never shell strings) line 299 — invariant 6.
- The "subprocess.log promoted to irreducible" note in Phase 3's First Principles output (line 412 of brainstorm) — invariant 7.

**Research references** (`_bmad-output/research/q-tech-decisions-2026-05-08.md`):
- Q-Tech-7 (one module beats two) lines 296-345 — the "single chokepoint for all seven invariants" framing. Story 5.1 is the materialization.
- Q-Tech-Plus-1 (subprocess-discipline non-negotiables) lines 411-435 — the source list for AC2; this story discharges the engineering work the research declared mandatory.
- Q-Tech-10 (ANSI handling — server-side strip via `util.stripVTControlCharacters`) lines 386-408 — AC1's ANSI requirement.
- Pipe-buffer-deadlock case study at [anthropics/claude-code issue #1970](https://github.com/anthropics/claude-code/issues/1970) — invariant 1's motivating real-world failure.

**Why this story is the foundation:**

Every other Epic-5 story has a hard dependency on `runStreaming`. The three adapter stories (5.3 / 5.4 / 5.5) call `runStreaming` from their `buildSpawnArgs` consumers; the chat-stream Route Handler (5.7) wires `runStreaming`'s events into SSE; Epic 6's bootstrap handler is the second consumer (collect-and-return shape). Centralizing the seven invariants in one module — with one Vitest spec covering them once — means subsequent stories don't carry "did I drain stderr?" review weight; they consume a primitive that has the answer baked in.

**Why test with `node -e` and not a third-party fixture:**

The fixtures stay portable, deterministic, and require zero new dev dependencies. `node` is already on PATH (we require Node ≥20). Tests stay reproducible across macOS/Linux/WSL2 without shell quirks.

**Why `'close'` not `'exit'`:**

Node's `child_process` `exit` event fires when the child process terminates but BEFORE the stdio streams have necessarily drained. The `close` event fires after all stdio streams are closed. Using `close` ensures we don't yield the `exit` `ProcEvent` before all `stdout-line` / `stderr-line` events have been yielded — preserves the "iterator yields exactly one terminal `exit` event after all data events" contract. Documented inline.

**Why `SIGKILL_GRACE_MS = 5000` and not e.g. 1000 or 10000:**

5 seconds is the conventional grace period for cooperative shutdown across most CLI tools (claude-code, codex, copilot all exit within ~1-2s on SIGTERM in our manual testing). 5s leaves headroom for slow filesystem flushes or in-flight streaming responses without making a stuck process feel hung. v1.1 may make this configurable via `RunOptions` if real-world telemetry shows escalations.

**Test approach:**

- All cases run via Vitest with the Node environment (default for non-React code).
- The AbortSignal SIGKILL escalation case sets a generous `vi.setConfig({ testTimeout: 10_000 })` to absorb the grace period plus assertions; this is local to that test, not project-wide.
- The global-signal-handler test uses an exported `__getRegisteredHandlerForTests` rather than `process.emit('SIGTERM')` to avoid actually shutting the test runner down. The handler is invoked manually with `vi.spyOn(process, 'kill')` capturing each child's PID.
- No e2e changes: the SSE Route Handler that consumes `runStreaming` is Story 5.7's territory.

**No-egress / runtime-fs sanity:**

- This story adds no network calls. NFR-S1 invariant holds.
- Filesystem touches are bounded to: (a) the `subprocess.log` write-stream when `sessionLogPath` is provided (caller-controlled), and (b) test-only tmp directories. The `runStreaming` module itself does not pick paths or read configuration.

**Architecture-doc drift check:**

- The architecture's `RunOptions` shape (line 285-294) does NOT include `sessionLogPath`. Story 5.1 adds it because invariant 7 (subprocess.log) requires the caller to control where the log lands (per-session under `<session-dir>/subprocess.log`). The architecture says invariant 7 is "a function of `runStreaming`" but doesn't pin the parameter name. This story locks the field as `sessionLogPath: string | undefined`. **Architecture-doc edit recommended after this story lands** to extend the `RunOptions` example with the optional field. Tracked as a Story-5.1 follow-up; no blocker.

## Dev Agent Record

### Implementation Plan

_To be filled in by the dev agent at implementation time._

### Debug Log

_To be filled in by the dev agent during implementation._

### Completion Notes

_To be filled in by the dev agent after the quad gate is clean._

## File List

**Expected new files:**
- `src/lib/capstone/subprocess/run-streaming.ts`
- `src/lib/capstone/subprocess/run-streaming.test.ts`
- `src/lib/capstone/subprocess/tracked-children.ts`
- `src/lib/capstone/subprocess/tracked-children.test.ts`
- `src/lib/capstone/subprocess/README.md` (one-liner pointer to architecture §"Capstone Runtime → Subprocess Discipline")
- `_bmad-output/implementation-artifacts/5-1-run-streaming-subprocess-primitive.md` (this file)

**Expected modified files:**
- None at story start. (If Task 8 surfaces a pre-existing lint or typecheck failure, the smallest possible patch lands inline and is noted in the Debug Log.)

## Change Log

- 2026-05-08 — Story file authored from session-state-2026-05-08-rebuild-planning.md §"Epic structure to author" + architecture §"Capstone Runtime → Subprocess Discipline" + research Q-Tech-Plus-1.
