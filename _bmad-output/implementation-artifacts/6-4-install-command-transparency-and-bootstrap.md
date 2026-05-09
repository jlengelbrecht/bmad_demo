# Story 6.4: Install-command transparency screen + Phase 2 bootstrap orchestration

**Epic:** 6 — Setup Wizard + Bootstrap
**Story Key:** 6-4-install-command-transparency-and-bootstrap
**Status:** ready-for-dev

## Story

As the developer landing FR-3.9 (install-command transparency), FR-3.11 (BMAD version pin), and FR-3.20's pattern for streaming subprocess output (now applied to Phase 2 bootstrap),
I want `/capstone/setup/bootstrap` to render the literal `npx bmad-method@<pinned-version> install --directory <path> --modules bmm --tools <tool> --set core.project_name=<name> ...` command before any spawn, plus `POST /api/capstone/setup/bootstrap` (paired with `GET /api/capstone/setup/bootstrap/stream`) that spawns it via `runStreaming` and streams stdout/stderr to the browser as SSE,
So that trainees see the exact command they could have run themselves (pedagogy: "BMAD is just npm + a CLI") and the bootstrap's progress is visible-as-it-happens — not a spinner that hides whatever the install is doing for 60 seconds.

## Acceptance Criteria

**AC1 — Page exists at `src/app/capstone/setup/bootstrap/page.tsx`**
- Server Component (renders the install-command preview synchronously) wrapping a Client Component (`<BootstrapRunner>`) that owns the SSE connection + progress UI.
- Reads `?session=<capstone-session-id>&wizard=<base64-json>` from `searchParams`. Decodes the wizard payload (Story 6.2's URL-state). Reads tool selection from SQLite (`getCapstoneToolForSession(sessionId)` — new helper) — the tool was persisted in Story 6.1.
- Renders three regions:
  1. **Command preview** — a code block showing the literal `npx bmad-method@<version>` command with all `--set` flags. Each line of the command on its own line for readability. A "Copy" button next to it.
  2. **Confirm + Run** — a single button: "Confirm and Run". Disabled if any wizard payload field is malformed (defense-in-depth — Story 6.2 already validated, but we re-validate here).
  3. **Progress panel** (initially hidden; revealed on Run click) — `<BootstrapRunner>` Client Component that opens an `EventSource` to `/api/capstone/setup/bootstrap/stream?session=<id>` and renders streaming output in a scrolling pre block. Shows a status row (`Spawning... → Running... → Complete ✓` or `Failed ✗`) with elapsed time.
- On stream `event: done` with success: navigate to `/capstone/setup/bootstrap/complete?session=<id>` (Story 6.6's territory — the post-bootstrap explainer).

**AC2 — `POST /api/capstone/setup/bootstrap` Route Handler**
- Body (Zod-validated):
  ```ts
  {
    sessionId: string,         // capstone-session-id (CAPSTONE_SESSION_ID format)
    chosenDir: string,         // absolute, validated by re-running Story 6.3's path-validate logic server-side
    projectName: string,
    tool: ToolId,
    communicationLanguage: string,
    documentOutputLanguage: string,
    skillLevel: 'beginner' | 'intermediate' | 'expert',
    outputFolder: string,      // relative
  }
  ```
- Behavior:
  1. Re-validates `chosenDir` against the Story 6.3 allowlist + existing-dir status. Rejects 400 if invalid.
  2. Creates the portal session dir at `data/capstone-sessions/<sessionId>/` (mkdir -p).
  3. Persists the chosen-target-dir to SQLite via `recordCapstoneTargetDir(sessionId, chosenDir)` (new helper using kind=`'capstone-target'` per architecture line 210).
  4. Returns 202 Accepted with `{ ok: true, streamUrl: '/api/capstone/setup/bootstrap/stream?session=<id>' }`.
  5. Bootstrap does NOT start in this handler — the actual spawn happens when the client connects to the stream URL. Two-step pattern keeps the POST cheap and the spawn lifecycle bound to the SSE connection (one connection = one bootstrap).

**AC3 — `GET /api/capstone/setup/bootstrap/stream` Route Handler**
- Query: `?session=<sessionId>`. Reads the session's prior recorded chosenDir + wizard params from SQLite (or, for now, from a server-only in-memory cache populated by the POST in AC2 — see "Why" section).
- Spawns `npx bmad-method@<pinned-version> install ...` via `runStreaming` with:
  - `cwd: <parent-of-chosenDir>` (npx must be run from a writable cwd; the parent of CHOSEN_DIR is the natural choice).
  - `signal: req.signal` (NFR-S4 invariant 3 — abort propagation).
  - `sessionLogPath: data/capstone-sessions/<session>/subprocess.log`.
- Streams stdout AND stderr lines to the browser as SSE events (this differs from Story 5.7 which dropped stderr — bootstrap's stderr is informational progress that trainees should see, e.g., "fetching package..."):
  - `event: stdout\ndata: {"text":"<line>"}\n\n`
  - `event: stderr\ndata: {"text":"<line>"}\n\n`
- On terminal exit: `event: done\ndata: {"code":<n>,"signal":<s>,"durationMs":<ms>}\n\n`. Stream closes.
- `runtime='nodejs'`, `dynamic='force-dynamic'`.
- 10-minute hard timeout (npx install is sometimes slow on first-fetch; 10 minutes covers worst-case network. Documented in code-comment.) On timeout: SIGTERM + emit `event: error\ndata: {"message":"bootstrap timed out at 10 minutes"}\n\n` + close.

**AC4 — BMAD version pin (FR-3.11)**
- The pinned version is read from `_bmad/_config/manifest.yaml` at module-load time (the portal's own manifest). New helper `src/lib/capstone/bootstrap/bmad-version.ts` exports `getPinnedBmadVersion(): string` that parses the YAML and returns the version field. Memoized.
- The bootstrap command uses `npx bmad-method@<pinned-version> install ...` — never `npx bmad-method install` (which would resolve to latest and drift from the version the portal was tested against).
- On manifest-yaml-read failure: throws at module load (a missing manifest.yaml is a deployment defect, not a runtime-recoverable error).

**AC5 — All `--set` flags pre-filled (TM-5 + brainstorm F-DEF-7)**
- The command builder includes:
  ```
  npx bmad-method@<version> install
    --directory <chosenDir>
    --modules bmm
    --tools <tool>
    --set core.project_name=<projectName>
    --set core.communication_language=<comm>
    --set core.document_output_language=<doc>
    --set core.user_skill_level=<skill>
    --set core.output_folder=<output-folder-resolved-against-chosen-dir>
    --yes
  ```
- The `--yes` flag prevents interactive prompts (per F-DEF-7 line 286 — anti-deadlock: install must not block on stdin).
- A 10-second `no-stdout-no-stderr` watchdog (per F-DEF-7): if the install produces no output for 10s, emit a warning event ("install may be waiting for input — no output for 10s") but do NOT abort. v1 just informs; v1.1 may add an auto-abort.
- The command builder is `src/lib/capstone/bootstrap/build-install-command.ts`, exported pure function. Vitest covers each combination.

**AC6 — Vitest unit coverage**
- `bmad-version.test.ts`: parses manifest.yaml → returns version; missing file throws at module load.
- `build-install-command.test.ts`: each wizard-payload variation produces the expected argv; the `--yes` flag is always present; the `--directory` value is the absolute chosenDir; `--set` flags are correctly composed.
- `bootstrap/route.test.ts`: POST happy path returns 202 + streamUrl; POST with invalid path returns 400; POST creates the session dir.
- `bootstrap/stream/route.test.ts`: GET spawns the command via `runStreaming` (mocked); stdout AND stderr are forwarded as SSE; terminal exit closes the stream; abort SIGTERMs the child.
- `<BootstrapRunner>.test.ts` (Client Component): EventSource opens; lines append to the pre block; `done` event triggers navigation.

**AC7 — Playwright e2e at `tests/e2e/capstone-setup-bootstrap.spec.ts`**
- Drives the full bootstrap with a stub `npx`: a test fixture installs a `node` script at `<test-tmp>/node_modules/.bin/npx-stub` that simulates `npx bmad-method install` by writing canned progress lines and creating a fake `_bmad/` skeleton in CHOSEN_DIR.
- Asserts: command preview renders correctly; "Confirm and Run" triggers the SSE stream; progress lines stream live; final navigation to `/complete` succeeds.
- Real `npx bmad-method install` is NOT invoked in CI (it's network-dependent and slow). Real-bootstrap integration is gated behind `RUN_BOOTSTRAP_INTEGRATION=1` similar to adapter-integration in Stories 5.3-5.5.

**AC8 — Lint, typecheck, quad gate**

## Tasks/Subtasks

- [ ] **Task 1 — BMAD version-pin helper (AC4)** — `bmad-version.ts` reads manifest.yaml. Memoize. Add a Vitest case that swaps the yaml file in a tmp fixture.
- [ ] **Task 2 — Install-command builder (AC5)** — `build-install-command.ts` pure function. Argv assembly with `--yes`. Tests for each wizard-payload combo.
- [ ] **Task 3 — Path validation re-run helper** — extract Story 6.3's `validatePath` core into a server-only helper that AC2's POST can reuse (defense-in-depth).
- [ ] **Task 4 — `bootstrap/route.ts` POST handler (AC2)** — Zod + path re-validate + mkdir session dir + persist target-dir + return streamUrl.
- [ ] **Task 5 — `bootstrap/stream/route.ts` GET handler (AC3, AC4, AC5)** — spawns `npx bmad-method@<pinned> install ...` via `runStreaming`; forwards stdout AND stderr as SSE; terminal-exit close; 10-min timeout.
- [ ] **Task 6 — `bootstrap/page.tsx` Server Component (AC1)** — composes wizard payload + tool selection into the command-preview render.
- [ ] **Task 7 — `<BootstrapRunner>` Client Component (AC1)** — EventSource consumer + scrolling pre block + status row + navigation on done.
- [ ] **Task 8 — Vitest unit coverage (AC6)**.
- [ ] **Task 9 — Playwright e2e with stub npx (AC7)**.
- [ ] **Task 10 — Quad gate clean (AC8)**.

## Dev Notes

**Architecture references:**
- §"API & Communication Patterns → Endpoints" line 232 — `POST /api/capstone/setup/bootstrap` paired with a stream endpoint, verbatim.
- §"Capstone Threat Model" TM-5 line 312 — version pinning via `npx bmad-method@<pinned>`.
- §"Folder Layout" line 375 — `capstone/setup/bootstrap/page.tsx` verbatim.
- §"Folder Layout" line 410 — `data/capstone-sessions/` is the per-session subprocess-log directory.

**PRD references:**
- FR-3.9 line 528 — install-command transparency. AC1 + AC5 implement.
- FR-3.11 line 533 — BMAD version pin. AC4 implements.
- F-DEF-7 line 286 — `--yes` + no-stdin-input watchdog. AC5 implements.
- F-DEF-17 line 327 — subprocess timeout (10 min for npx install). AC3 implements.

**Brainstorm references:**
- Setup-9 line 116 — show literal install command in preview.
- F-DEF-7 lines 286-289 — pre-filled install + stdin timeout.
- F-DEF-15 line 318 — cancel button always present (AC1's progress panel renders one; abort handled via `req.signal` propagation).

**Why two endpoints (POST + GET stream) instead of one POST that streams:**

Architecture line 232 explicitly considers both. The two-endpoint shape:
- POST validates + persists session metadata (cheap, idempotent).
- GET stream spawns + streams (long-running, abortable via `req.signal`).

The split lets the Client Component:
1. POST to create the session record (sync, fast).
2. Open EventSource (which is GET-only by browser constraint).
3. Receive streaming output until done.

A single-POST-streams-progress shape would force the Client Component to use `fetch` + manual chunk parsing, losing `EventSource`'s auto-reconnect.

**Why pass wizard params via the POST body even though the Server Component already has them:**

The Server Component renders the page; the GET stream endpoint runs in a different request context with no shared memory. Without the POST persisting the params (or a server-side memory cache keyed by sessionId), the GET endpoint would have to re-derive them from the URL — and `?wizard=<base64>` shouldn't appear in the EventSource URL because `EventSource` URLs are logged to browser history (vs. POST bodies which aren't).

**Module-load file read for manifest.yaml:**

The pinned version is invariant per portal-version. Reading at module-load time (memoized) avoids per-request file I/O and makes "missing manifest" a deployment defect (loud, fail-fast) rather than a per-request runtime error.

## Dev Agent Record

### Implementation Plan

_To be filled in by the dev agent at implementation time._

### Debug Log

_To be filled in by the dev agent during implementation._

### Completion Notes

_To be filled in by the dev agent after the quad gate is clean._

## File List

**Expected new files:**
- `src/app/capstone/setup/bootstrap/page.tsx`
- `src/app/capstone/setup/bootstrap/bootstrap-runner.tsx`
- `src/app/capstone/setup/bootstrap/page.test.ts`
- `src/app/capstone/setup/bootstrap/bootstrap-runner.test.ts`
- `src/app/api/capstone/setup/bootstrap/route.ts`
- `src/app/api/capstone/setup/bootstrap/route.test.ts`
- `src/app/api/capstone/setup/bootstrap/stream/route.ts`
- `src/app/api/capstone/setup/bootstrap/stream/route.test.ts`
- `src/lib/capstone/bootstrap/bmad-version.ts`
- `src/lib/capstone/bootstrap/bmad-version.test.ts`
- `src/lib/capstone/bootstrap/build-install-command.ts`
- `src/lib/capstone/bootstrap/build-install-command.test.ts`
- `tests/e2e/capstone-setup-bootstrap.spec.ts`
- `tests/fixtures/npx-stub.js` (stub npx for the e2e)
- `_bmad-output/implementation-artifacts/6-4-install-command-transparency-and-bootstrap.md` (this file)

**Expected modified files:**
- `src/lib/db/schemas.ts` (extend with `capstone-target` kind branch — if not already added by Story 5.7 or earlier)
- `src/lib/db/progress-db.ts` (`recordCapstoneTargetDir` + `getCapstoneTargetDir` helpers)
- `src/lib/db/progress-db.test.ts` (cases)
- `package.json` (verify `js-yaml` or `yaml` is a direct dep; promote if needed for manifest.yaml parsing)

## Change Log

- 2026-05-08 — Story file authored from FR-3.9/3.11 + brainstorm Setup-9/F-DEF-7/F-DEF-17 + architecture line 232.
