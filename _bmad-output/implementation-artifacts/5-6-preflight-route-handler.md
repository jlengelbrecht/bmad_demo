# Story 5.6: Phase 0 pre-flight Route Handler

**Epic:** 5 — Capstone Runtime Foundation
**Story Key:** 5-6-preflight-route-handler
**Status:** done

## Story

As the developer landing FR-3.3 (Phase 0 — pre-flight environment check),
I want `POST /api/capstone/setup/preflight` to verify node, git, and npx are present at supported versions before any other capstone surface loads, returning per-check status as `{ name, status: 'green'|'red', actualVersion?, requiredVersion, hint? }` rows,
So that Epic 6's wizard can render the green-✓/red-✗ per-row UI directly off this Route Handler's response — and a trainee whose machine is missing one of the three blockers fails fast with an actionable install link instead of mid-stream during Phase 2 bootstrap.

## Acceptance Criteria

**AC1 — `POST /api/capstone/setup/preflight` exists at `src/app/api/capstone/setup/preflight/route.ts`**
- The handler accepts `POST` only (per architecture's "GET = Server Components handle reads; POST = mutations" convention; preflight is a side-effect-bearing probe — it spawns subprocesses).
- No request body required; the handler accepts `{}` or no body at all (Zod schema is permissive — `z.object({}).strict()` so unknown fields produce 400 with `details`).
- Idempotent: each invocation re-runs the probes; results may differ across calls (e.g., trainee installed git between calls). No caching, no retry-with-backoff.
- Response status: `200` on success (regardless of whether checks are green or red — the response body carries the verdicts; HTTP 200 means "the probe ran"). `400` on a malformed body (Zod failure). `500` on an unexpected internal error.
- Response shape (camelCase per architecture line 477):
  ```ts
  {
    ok: true,
    checks: [
      { name: 'node',  status: 'green' | 'red', requiredVersion: '>=20.0.0', actualVersion?: string, hint?: string },
      { name: 'git',   status: 'green' | 'red', requiredVersion: '>=2.30.0', actualVersion?: string, hint?: string },
      { name: 'npx',   status: 'green' | 'red', requiredVersion: '>=10.0.0', actualVersion?: string, hint?: string },
    ],
    allGreen: boolean,
  }
  ```
- `allGreen` is the convenience flag for Epic 6's "advance to Phase 0.5" gate.

**AC2 — Each preflight probe is implemented**

| Check | Probe | Required | Hint on red |
|---|---|---|---|
| `node` | `runStreaming({ cmd: 'node', args: ['--version'], cwd: os.tmpdir() })`; parse `vX.Y.Z` from stdout | `>=20.0.0` | `"Node 20+ is required. Install from https://nodejs.org/ or via your version manager (nvm, asdf, fnm)."` |
| `git` | `runStreaming({ cmd: 'git', args: ['--version'], cwd: os.tmpdir() })`; parse `git version X.Y.Z` from stdout | `>=2.30.0` | `"Git 2.30+ is required. Install from https://git-scm.com/ or via your package manager."` |
| `npx` | `runStreaming({ cmd: 'npx', args: ['--version'], cwd: os.tmpdir() })`; parse `X.Y.Z` from stdout | `>=10.0.0` | `"npx 10+ is required (npm 10+ ships it). Install from https://nodejs.org/ — npx comes with npm."` |

- Each probe has a 5-second timeout via an internal `AbortController`. On timeout: status `red`, hint includes "(probe timed out — is the binary responsive?)".
- ENOENT (binary not on PATH): status `red`, no `actualVersion`, hint as in the table.
- Exit code non-zero: status `red`, no `actualVersion`, hint includes "(unexpected exit code — try running `<cmd> --version` in your terminal)".
- Below required version: status `red`, `actualVersion` populated, hint as in the table prefixed with `"<cmd> <actualVersion> found; required: <requiredVersion>. "`.
- Probes run in **parallel** via `Promise.all([nodeProbe, gitProbe, npxProbe])` — no reason to serialize. Total wall-clock of preflight is ~2-3 seconds in the green case, dominated by spawn cost on slowest binary.

**AC3 — Implementation lives in `src/lib/capstone/preflight/`**
- `src/lib/capstone/preflight/checks.ts` exports `runPreflightChecks(): Promise<PreflightResult>` — the pure orchestration logic that returns the response body. Route Handler is a thin wrapper that adds Zod validation and the JSON envelope.
- `src/lib/capstone/preflight/checks.test.ts` covers all green/red branches via `vi.mock('../subprocess/run-streaming', ...)`.
- The Route Handler at `src/app/api/capstone/setup/preflight/route.ts` is ≤30 lines: parse body, call `runPreflightChecks()`, return Response.json. Mirrors Story 3.2's route-handler pattern.
- Why the split: makes the orchestration testable without HTTP context (Vitest can't easily synthesize `Request` objects in some Next.js versions); also lets Story 5.7's chat-stream Route Handler reuse pattern of "library function + thin handler."

**AC4 — Vitest unit coverage at `src/lib/capstone/preflight/checks.test.ts`**
Cases (with `runStreaming` stubbed to yield canned event sequences):
- All-green path: each probe yields exit-0 + version banner ≥ required → response has 3 green checks, `allGreen: true`.
- Each individual check red:
  - `node` ENOENT → node red with version-not-found hint; git/npx remain green; `allGreen: false`.
  - `node` below min (e.g., `v18.20.0`) → red with "node v18.20.0 found; required: >=20.0.0" hint; `actualVersion: '18.20.0'`.
  - `git` exit-non-zero → git red; hint mentions exit code.
  - `npx` timeout (stub iterator never yields exit) → npx red; hint includes timeout phrase; verifies AbortController fires after 5s.
- All three red simultaneously (test fixture: all three probes ENOENT) → `allGreen: false`; all three hints populated.
- Version banner regex robustness: each probe's version-line regex tolerates leading whitespace, surrounding text, and Unicode; tests cover `'  v22.1.0\n'`, `'git version 2.45.0 (Apple Git-x.y)\n'`, `'10.8.2\n'`.
- Probes run in parallel: with three probes each artificially slowed to 1.5s (stubbed delay), total elapsed time is <3s (parallel) not >4.5s (serial). Verified with `Date.now()` capture.

**AC5 — Vitest Route Handler coverage at `src/app/api/capstone/setup/preflight/route.test.ts`**
- POST with no body → 200 with the all-green response (when `runPreflightChecks` is mocked to return all-green).
- POST with empty JSON body `{}` → 200 (Zod accepts).
- POST with unknown field `{ foo: 'bar' }` → 400 with `details` populated.
- GET (wrong method) → 405. (Next.js auto-rejects non-exported methods; the test asserts the 405 + the `Allow` header includes `POST`.)
- 500 path: when `runPreflightChecks` throws, response is 500 with `{ ok: false, error: 'Internal error' }` and the error is `console.error`-logged.
- Module-surface smoke: `route.ts` exports only `POST`; no GET/PUT/PATCH/DELETE.
- Architecture-lock smoke (mirrors Story 3.2 pattern): the file contains no imports from `next/headers`, `next/cookies`, or `next/server`'s `NextRequest` (we use plain `Request`).

**AC6 — Lint, typecheck, quad gate**
- `npm run lint` + `tsc --noEmit` + `npm run test:unit` + `npm run test:e2e` + `npm run lint:links` clean.

## Tasks/Subtasks

- [ ] **Task 1 — Scaffold (AC1, AC3)** — create `src/lib/capstone/preflight/checks.ts`, `checks.test.ts`; create `src/app/api/capstone/setup/preflight/route.ts`, `route.test.ts`. Add a one-line `preflight/README.md` pointing at FR-3.3 + this story.

- [ ] **Task 2 — `runPreflightChecks` orchestration (AC2, AC3)** — implement the three probe functions (`probeNode`, `probeGit`, `probeNpx`), each calling `runStreaming` with a 5s `AbortController`, parsing version banners with the regex per AC4, and returning the typed result row. The orchestrator runs them in parallel and assembles the response body.

- [ ] **Task 3 — Version-comparison helper (AC2)** — `src/lib/capstone/preflight/semver.ts` exports `meetsMinimum(actual: string, required: string): boolean`. Inline implementation handles the `>=X.Y.Z` shape used by the three preflight checks (no external `semver` dep yet — Story 5.3 may have promoted it; if so, this helper delegates). Vitest cases: equal, greater, lesser, malformed-actual.

- [ ] **Task 4 — Route Handler (AC1, AC5)** — implement the handler per the patterns at architecture lines 575-596 (verbatim Route Handler example). Zod schema is `z.object({}).strict()`. On valid body, await `runPreflightChecks()`, wrap in `{ ok: true, ...result }`, return 200.

- [ ] **Task 5 — Unit Vitest spec for `checks.ts` (AC4)** — implement the 8+ cases via `vi.mock('../subprocess/run-streaming', ...)`. Each case provides a fake `AsyncIterable<ProcEvent>` per probe.

- [ ] **Task 6 — Route Handler Vitest spec (AC5)** — mock `runPreflightChecks` and assert on the HTTP envelope. Add the architecture-lock smoke and module-surface smoke.

- [ ] **Task 7 — Quad gate clean (AC6)** — run all five gates.

### Review Findings

_To be populated by code review after implementation._

## Dev Notes

**Architecture references:**
- §"API & Communication Patterns → Endpoints (v1)" line 232 — `POST /api/capstone/setup/preflight` is the Epic-6 surface: "run Phase 0 environment checks (node/git/npx versions); return per-check status. Idempotent."
- §"API & Communication Patterns → Mutation idiom" line 233 — Route Handlers for all mutations; preflight is a side-effecting probe.
- Lines 575-596 — verbatim Route Handler example showing the pattern (Zod parse → handler logic → typed Response).
- §"Folder Layout" line 386 — `capstone/setup/preflight/route.ts` path verbatim.

**PRD references:**
- FR-3.3 line 516 — "Phase 0 verifies node, git, and npx are on PATH at supported versions before any other capstone step loads. Each requirement renders green (✓) or red (✗) with an actionable hint linking to install instructions. Capstone advances only when all green." AC1+AC2 implement verbatim.
- NFR-P3 line 612 — capstone artifact-save <500ms; preflight is not artifact-save and the 5s probe timeout is generous in service of the failure-fast goal.

**Brainstorm references:**
- Setup-1 line 84 — "Pre-flight check (Phase 0). Before tool selection even loads, the portal probes node, git, npx versions and shows green/red status with actionable hints. Fails fast." Story 5.6 IS this irreducible.

**Why preflight is a Route Handler (POST) instead of running at page-load:**

Two reasons: (1) it spawns three subprocesses, which is too heavy for Server Component data-fetch (would block the initial paint); (2) idempotent re-running is a feature — the Epic 6 wizard has a "Re-check" button that triggers another POST, and the trainee's environment can change between calls (they install Node, then re-check). Page-load probes would force a navigation to retry; the Route Handler doesn't.

**Why 5-second per-probe timeout:**

Generous for any well-behaved binary (`node --version` finishes in <100ms locally). 5s catches a hung shell wrapper or filesystem-locked PATH lookup without making the trainee wait pathologically long. If a trainee's environment legitimately takes longer, that's a signal worth red-flagging.

**Why version-comparison inline rather than `semver`:**

The three required ranges (`>=20`, `>=2.30`, `>=10`) are all `>=X.Y.Z` shape. An inline comparator handles them in 10 lines. Promoting `semver` as a direct dep is fine if Story 5.3's adapter version-checks need it (and they may), but Story 5.6 doesn't gate on that — the inline helper works either way and the rule of three for promotion isn't tripped by preflight alone.

**Defensible deviations:**

- AC2's hints are English-only and prescriptive ("Install from https://..."). PRD §FR-3.3 says "actionable hint linking to install instructions"; the AC's hints satisfy this. v1.1 may extend with localized hints (PRD locks English-only at v1).
- AC4's "probes run in parallel" assertion is a side-channel performance check, not a release-gate NFR. Documented as evidence of the design intent so a future refactor that serializes the probes (and triples preflight latency) gets flagged.

**Test approach:**

- Vitest unit tests stub `runStreaming` to control event sequences deterministically. No real binaries spawned in `npm run test:unit`.
- Route Handler tests mock the orchestrator; HTTP envelope is the focus.
- No e2e changes here — Epic 6's wizard story will land an e2e spec that drives the preflight UI end-to-end (against real binaries on the CI runner, which has node/git/npx).

**No-egress / runtime-fs sanity:**

- This story adds no network calls. NFR-S1 invariant holds.
- Filesystem touches: none beyond `os.tmpdir()` as `cwd` for the probe spawns. No reads, no writes.

**Architecture-doc drift check:**

- The architecture's endpoint line 232 says "preflight" returns "per-check status." AC1's response shape extends this to include `allGreen` and per-row `actualVersion`/`requiredVersion`/`hint`. Additive, not contradictory; consider an architecture-doc edit only if more endpoints adopt richer response shapes.

## Dev Agent Record

### Implementation Plan

_To be filled in by the dev agent at implementation time._

### Debug Log

_To be filled in by the dev agent during implementation._

### Completion Notes

_To be filled in by the dev agent after the quad gate is clean._

## File List

**Expected new files:**
- `src/lib/capstone/preflight/checks.ts`
- `src/lib/capstone/preflight/checks.test.ts`
- `src/lib/capstone/preflight/semver.ts`
- `src/lib/capstone/preflight/semver.test.ts`
- `src/lib/capstone/preflight/README.md` (one-liner pointer to FR-3.3)
- `src/app/api/capstone/setup/preflight/route.ts`
- `src/app/api/capstone/setup/preflight/route.test.ts`
- `_bmad-output/implementation-artifacts/5-6-preflight-route-handler.md` (this file)

**Expected modified files:**
- None at story start (the `data/` and `src/lib/capstone/` directories were already created in Stories 5.1-5.5).

## Change Log

- 2026-05-08 — Story file authored from FR-3.3 + architecture line 232 + brainstorm Setup-1.
