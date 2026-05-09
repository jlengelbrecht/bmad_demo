# Story 8.2: Green-tests phase-done gate (Phase 8 only)

**Epic:** 8 — Phase 8 Dev Story 1.1 with Green-Tests Gate
**Story Key:** 8-2-green-tests-gate
**Status:** done

## Story

As the developer landing F-CRIT-7 + FR-3.23's "phase-done refuses Done on red tests" requirement,
I want `POST /api/capstone/phase-done` to layer an additional green-tests gate when `phase === 'dev-story-1.1'` — running CHOSEN_DIR's `npm test` (or detected test command) via `runStreaming`, refusing advance when exit code is non-zero, and surfacing the test output to the trainee inline,
So that the capstone's central pedagogical promise — "ends with working code, not docs" — is mechanically enforced and not just documented.

## Acceptance Criteria

**AC1 — Story 7a.3's `phase-done` Route Handler is extended for `phase === 'dev-story-1.1'`**
- For the dev-story-1.1 phase only, after the artifact-existence + shape validation passes (the existing Story 7a.3 logic), the handler runs an additional gate:
  1. Look up CHOSEN_DIR for the session.
  2. Detect the test command: read `<chosenDir>/package.json`'s `scripts.test` field. If absent, return validation result with `testGate: { status: 'no-test-command', message: 'No "test" script found in package.json. Add one before continuing.' }` and `valid: false`.
  3. If present, spawn it via `runStreaming({ cmd: 'npm', args: ['test'], cwd: chosenDir, signal: <internal AbortController, 5min timeout> })` (with `metadata: { kind: 'test-run' }` per Story 6.5's tracked-children extension).
  4. Collect stdout + stderr; capture the final exit code.
  5. If exit code 0: `testGate: { status: 'green', exitCode: 0, durationMs, output: <last 4KB of combined stdout+stderr> }`. If non-zero: `testGate: { status: 'red', exitCode, durationMs, output }`.
- The combined `valid` is `artifactValid && shapeValid && (phase !== 'dev-story-1.1' || testGate.status === 'green')`.

**AC2 — Response shape extension**
- The handler's response (Story 7a.3 AC1's shape) gains an optional `testGate` field, populated only for `phase === 'dev-story-1.1'`:
  ```ts
  testGate?: {
    status: 'green' | 'red' | 'no-test-command' | 'timeout',
    exitCode?: number,
    durationMs?: number,
    output?: string,        // last 4KB of combined stdout+stderr
    message?: string,       // present for no-test-command status
  }
  ```

**AC3 — Test-run timeout (5 minutes)**
- The internal AbortController fires at 5 minutes. On timeout: `testGate: { status: 'timeout', message: 'Test run exceeded 5 minutes; the gate timed out. Re-run after the suite settles.' }`.
- 5min is generous for v1 capstones; trainees with multi-minute test suites are doing something interesting and the message tells them to retry.

**AC4 — Story 7a.1's phase-done button surfaces test output**
- When `phase === 'dev-story-1.1'`, the phase-done button's panel (the existing "View artifact" disclosure from Story 7a.1) gains a sibling "Test results" disclosure that shows:
  - Status: ✓ All tests passed (green status) / ✗ Tests failed (red) / ⏳ Running... (during the dry-run check) / ⚠ No test command (no-test-command).
  - The captured output (last 4KB) in a monospace pre block.
- The dry-run pre-check (Story 7a.1 AC4 polling pattern) ALSO runs the test gate. This is the only phase where a dry-run pre-check actually spawns a subprocess; for performance, the dry-run is debounced to once per 30 seconds (instead of 5s for non-dev-story phases). Documented inline.

**AC5 — Phase 8 advances on green; refuses on red**
- Story 7a.3's advance logic (AC4) gains: when `phase === 'dev-story-1.1'`, advance also requires `testGate.status === 'green'`.
- Refusal message in the UI: "Tests failed (exit code <n>). Advance is blocked until tests pass. Use the chat to ask the agent to fix them."

**AC6 — Vitest unit coverage**
- `phase-done/route.test.ts` extension: dev-story-1.1 with green-tests stub → advances; with red-tests stub → refuses with testGate.status='red' + output populated; with missing package.json → testGate.status='no-test-command'; with timeout-stub → testGate.status='timeout'.
- The runStreaming stub injects canned event sequences for the test-run subprocess.

**AC7 — Playwright e2e at `tests/e2e/capstone-phase-dev-story.spec.ts` (Story 8.2 extension)**
- Extends Story 8.1's e2e:
  - After the stub adapter writes the example code + test file pair, the trainee clicks Phase Done; asserts the test-results panel shows ✓ green; asserts navigation to `/capstone/handoff/<sessionId>`.
  - Drives a "tests fail" scenario: the stub writes a deliberately-failing test; clicks Phase Done; asserts the panel shows ✗ red with output; asserts the button stays disabled / refuses advance.

**AC8 — Lint, typecheck, quad gate**

## Tasks/Subtasks

- [ ] **Task 1 — Test-gate logic in route handler (AC1, AC2, AC3)** — extends `phase-done/route.ts` with the dev-story-1.1 branch. Spawns via `runStreaming` with metadata + 5min timeout.
- [ ] **Task 2 — Response shape extension** — type the optional `testGate` field; update Zod return type if validated.
- [ ] **Task 3 — Story 7a.1 phase-done panel UI extension (AC4)** — add the Test-results disclosure to `<PhaseDoneButton>` (or a sibling component) when `phase === 'dev-story-1.1'`.
- [ ] **Task 4 — Dry-run debounce (AC4)** — extend the polling logic to 30s for dev-story-1.1.
- [ ] **Task 5 — Advance-logic gate (AC5)** — extend the advance condition.
- [ ] **Task 6 — Vitest unit coverage (AC6)**.
- [ ] **Task 7 — Playwright e2e extension (AC7)** — both green and red scenarios.
- [ ] **Task 8 — Quad gate clean (AC8)**.

## Dev Notes

**Architecture references:**
- §"API & Communication Patterns → Endpoints" line 232 — `phase-done` is the right surface to layer this gate; no new endpoint needed.

**PRD references:**
- FR-3.23 line 554 — phase-done refuses Done on red tests.

**Brainstorm references:**
- F-CRIT-7 lines 256-258 — the load-bearing "promise unkept without this" lock.
- End-4 lines 217-219 — "BMAD ends with code, not docs."

**Why layer in `phase-done` instead of a separate `test-run` endpoint:**

The architecture's endpoint set is small and intentional. Adding a separate `test-run` endpoint would mean two sources of truth for "phase 8 is done": the trainee can't have one endpoint say green and the other say red. Layering keeps phase-done the single decision point.

**Why 5-minute timeout:**

Most v1 capstones produce ~1 test file with a few cases — runs in seconds. 5min covers the case where the trainee picked a beefier framework (jest with TS compilation) and still gives a hard ceiling. v1.1 may make this configurable per-trainee.

**Why debounce dry-run to 30s for this phase:**

5s polling on a phase that spawns `npm test` would be a constant background load. 30s is a compromise: trainees who finish their code in a 30s burst still get the UI update within ~30s; trainees actively iterating won't trigger a test run mid-edit-cycle.

**Why output capped at 4KB:**

Test output can be huge (thousands of lines of vitest verbose mode). 4KB captures the failing-tests summary section plus a few stack traces — actionable for diagnosis. Trainees who need full output run `npm test` themselves in a terminal in CHOSEN_DIR (which they can do per the brainstorm's "side-channel access is a feature" stance, line 150).

## Dev Agent Record

### Implementation Plan

_To be filled in by the dev agent at implementation time._

### Debug Log

_To be filled in by the dev agent during implementation._

### Completion Notes

_To be filled in by the dev agent after the quad gate is clean._

## File List

**Expected new files:**
- `_bmad-output/implementation-artifacts/8-2-green-tests-gate.md` (this file)

**Expected modified files:**
- `src/app/api/capstone/phase-done/route.ts` (Story 7a.3 — adds dev-story-1.1 test-gate branch)
- `src/app/api/capstone/phase-done/route.test.ts` (new cases per AC6)
- `src/app/capstone/chat/[sessionId]/[phase]/phase-done-button.tsx` (Story 7a.1 — adds Test-results disclosure)
- `src/app/capstone/chat/[sessionId]/[phase]/phase-done-button.test.tsx`
- `tests/e2e/capstone-phase-dev-story.spec.ts` (Story 8.1 — extended with green/red scenarios)

## Change Log

- 2026-05-08 — Story file authored from FR-3.23 + brainstorm F-CRIT-7/End-4 + architecture line 232.
