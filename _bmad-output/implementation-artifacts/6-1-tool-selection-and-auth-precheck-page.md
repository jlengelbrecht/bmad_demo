# Story 6.1: Tool selection + auth pre-check page (Phase 0.5)

**Epic:** 6 — Setup Wizard + Bootstrap
**Story Key:** 6-1-tool-selection-and-auth-precheck-page
**Status:** ready-for-dev

## Story

As the developer landing FR-3.4 (tool selection from the curated v1 list with detection badges) and FR-3.5 (auth pre-check),
I want `/capstone/setup` to show a curated tool grid (claude-code, codex, github-copilot) with per-tool ✓-detected/✗-not-installed badges plus per-tool ✓-authed/✗-needs-auth badges, gating advance to the wizard on green-everything,
So that the trainee picks their AI tool with full visibility into what's actually installed and authed on their machine — failing fast at Phase 0.5 instead of mid-Phase-3 when the chat surface tries to spawn a missing or unauthenticated binary.

## Acceptance Criteria

**AC1 — Page exists at `src/app/capstone/setup/page.tsx`**
- Server Component that, on render, calls Story 5.6's preflight handler internally (via direct function import — `runPreflightChecks` from `src/lib/capstone/preflight/checks.ts`) and Story 6.2's `runToolChecks(toolId)` for each adapter in the registry.
- Renders a single page with three regions:
  1. **Phase 0 preflight panel** — node/git/npx with per-row ✓/✗ + hint. If any are red, the tool grid below is rendered DISABLED with a banner: "Resolve preflight issues before selecting a tool. [Re-check]" The Re-check button POSTs `/api/capstone/setup/preflight` and full-page-revalidates.
  2. **Tool grid** — a 1×3 (or 3×1 on narrow viewports, kept above the 1024px gate) grid of cards. Each card shows: tool icon (small SVG; vendored), display name, `cliBinary` name, two badges (Installed: ✓ Yes / ✗ Not on PATH; Authed: ✓ Yes / ✗ Sign in needed / — Not checked yet), and a "Select" button (disabled unless both badges are green for that card).
  3. **Help row** — a "What does this check?" disclosure under the grid that explains in plain language what `detectInstalled` and `detectAuthenticated` do per tool, with links to the adapter's `manifest.docsUrl`.
- Selecting a tool POSTs `/api/progress` with `{ kind: 'capstone-tool', id: '<capstone-session-id>', completed_at: '<tool-id>' }` (per architecture line 210's column-overload) AND navigates to `/capstone/setup/wizard?session=<capstone-session-id>` (Story 6.3 territory).
- The capstone-session-id is captured: if the page is loaded WITHOUT `?session=<id>`, the page generates a new compact-UTC id and redirects with the param. (Per architecture line 210 + Story 4.1's session-id format.)

**AC2 — `POST /api/capstone/setup/tool-check` Route Handler exists in this story**
- Page and Route Handler ship in the same commit because the page is the only consumer. New file: `src/app/api/capstone/setup/tool-check/route.ts`.
- Body: `{ tool: 'claude-code' | 'codex' | 'github-copilot' }`. Zod-validated.
- Logic: resolves adapter via `getAdapterRegistry().get(tool)`; calls `await adapter.detectInstalled()` then (only if installed) `await adapter.detectAuthenticated()`; returns `{ ok: true, installed: boolean, authed: boolean | null }` (authed `null` when not checked because not installed).
- Idempotent. No persistence — the result feeds the page's badge rendering only.
- 5-second outer timeout via `AbortController` passed into the adapter's internal `runStreaming` calls; on timeout, `installed`/`authed` default to `false` with a `console.warn` capturing which probe timed out.

**AC3 — Tool-check is invoked once per tool on initial page load**
- The Server Component calls `runToolChecks` for all three tools in parallel (one outer `Promise.all` with three adapter calls) at render time.
- A "Re-check tool" affordance per card POSTs `/api/capstone/setup/tool-check` for that single tool and full-page-revalidates.
- Initial-render parallelism caps total wait at the slowest adapter's auth probe (~3s typical, 15s ceiling per Stories 5.3-5.5).
- If a tool's `detectInstalled` returns `false`, `detectAuthenticated` is NOT called for that tool (skip — the card shows "Not installed" and the auth badge is not rendered).

**AC4 — Tool not on PATH renders install-instructions hint**
- A red "Not on PATH" badge includes a "How to install" disclosure that surfaces the tool's `manifest.docsUrl` as a clickable link plus a one-line install hint per tool:
  - claude-code: `"Install via 'npm install -g @anthropic-ai/claude-code' or download from <docsUrl>."`
  - codex: `"Install via 'npm install -g @openai/codex' or download from <docsUrl>."`
  - github-copilot: `"Install via 'npm install -g @github/copilot' (requires an active GitHub Copilot subscription)."`
- The hints are static strings under `src/lib/capstone/adapters/install-hints.ts` keyed by `ToolId`. Mirrors the FR-3.4 lock: "the portal does NOT auto-install third-party AI tools."

**AC5 — Tool installed but not authed renders auth-instructions hint**
- A red "Sign in needed" badge surfaces a per-tool auth hint:
  - claude-code: `"Set ANTHROPIC_API_KEY in your shell environment, then re-check."`
  - codex: `"Set OPENAI_API_KEY in your shell environment, then re-check."`
  - github-copilot: `"Run 'gh auth login' (with the 'copilot' scope), then re-check. Requires an active GitHub Copilot subscription."`
- These hints are inline under each card; no per-tool tooltip indirection.

**AC6 — Two-tab session-lock surfaced on conflict**
- Per F-CRIT-4 / TM-3: the SQLite check before navigating to the wizard verifies the chosen capstone-session-id is not currently held by another tab. Implementation: a new `progress-db` helper `acquireCapstoneSessionLock(sessionId, expiresAt)` that upserts a `kind='capstone-session-lock'` row with `completed_at` containing an ISO expiry timestamp; if a non-expired lock exists for a different lock-holder-id (the page's per-tab UUID stored in `sessionStorage`), the page shows: "Another tab is active for this capstone session. Close it or reload here to take over." A "Take over" button invalidates the prior lock + re-acquires.
- Lock TTL: 60 seconds; the page heartbeats (extends expiry) every 30 seconds via `POST /api/capstone/setup/session-lock`. Tab close fires `navigator.sendBeacon` to release.
- Vitest cases cover lock acquisition, expiry, take-over, and the no-other-tab happy path.

**AC7 — Vitest unit coverage at `src/app/capstone/setup/page.test.ts` + `src/app/api/capstone/setup/tool-check/route.test.ts`**
- Page tests: stub `runPreflightChecks` + `runToolChecks` to produce all-green / mixed / all-red fixtures; assert the rendered DOM (via `renderToString`) shows the expected badges and the Select buttons' disabled state.
- Route Handler tests: standard Zod-validation + happy-path + 500-error pattern. Spy on the adapter's `detectInstalled`/`detectAuthenticated` to confirm call ordering.
- Lock-helper tests in `progress-db.test.ts`: acquire/expire/take-over.

**AC8 — Playwright e2e at `tests/e2e/capstone-setup-tool-selection.spec.ts`**
- Uses a Playwright fixture that env-substitutes the adapter registry with three stub adapters (re-using Story 5.7's `getStubAdapter()` pattern, parameterized by id). Asserts:
  - Preflight panel renders three green checks (real binaries on the CI runner).
  - Tool grid renders three cards with the stub-adapter-driven Installed/Authed badges all green.
  - Selecting "Claude Code" navigates to `/capstone/setup/wizard?session=<compact-utc>`.
  - Re-check button on a single card re-runs the per-tool check (verified via network-request inspection).

**AC9 — Lint, typecheck, quad gate**
- All five npm-script gates clean.

## Tasks/Subtasks

- [ ] **Task 1 — Scaffold setup page (AC1)** — `src/app/capstone/setup/page.tsx` Server Component that calls preflight + per-tool checks in parallel.
- [ ] **Task 2 — Tool-check Route Handler (AC2)** — `src/app/api/capstone/setup/tool-check/route.ts` + tests.
- [ ] **Task 3 — Install/auth hint module (AC4, AC5)** — `src/lib/capstone/adapters/install-hints.ts` + `auth-hints.ts`. Static strings keyed by `ToolId`.
- [ ] **Task 4 — Tool grid component** — client component (co-located) with three `<ToolCard>` renderings, badges, Select button, Re-check button. Tailwind for styling; one Radix primitive for the disclosure.
- [ ] **Task 5 — Session-lock helper + heartbeat (AC6)** — `progress-db.ts` `acquireCapstoneSessionLock`/`releaseCapstoneSessionLock`/`extendCapstoneSessionLock` helpers. Schema extended via Story 5.7's pattern (kind = `'capstone-session-lock'`).
- [ ] **Task 6 — Session-lock Route Handler** — `src/app/api/capstone/setup/session-lock/route.ts` for heartbeat extends.
- [ ] **Task 7 — Vitest unit coverage (AC7)** — page render tests, Route Handler tests, lock helper tests.
- [ ] **Task 8 — Playwright e2e spec (AC8)** — drives the page with stub adapters; asserts the navigation + re-check round-trip.
- [ ] **Task 9 — Quad gate clean (AC9)**.

## Dev Notes

**Architecture references:**
- §"API & Communication Patterns → Endpoints (v1)" line 232 — `POST /api/capstone/setup/tool-check`; AC2 implements.
- §"Frontend Architecture" line 245 — App Router routing topology already includes `/capstone/setup/`; AC1's path matches.
- §"Folder Layout" lines 372-374, 381-382 — `capstone/setup/{page,wizard,bootstrap}` paths verbatim.

**PRD references:**
- FR-3.4 line 520 — tool-selection mechanics + curated v1 list + detection badge + hard-stop on missing tool. AC1+AC4 implement.
- FR-3.5 line 521 — tool-specific auth probe gates Phase 1. AC1+AC5 implement.
- F-CRIT-4 + TM-3 lines 244, 310 — two-tab session lock; AC6 implements.

**Brainstorm references:**
- Setup-2 line 88 — auth pre-check IS irreducible.
- Setup-3 line 92 — tool selection comes FIRST. AC1's page is the FIRST wizard surface.
- Setup-5 line 100 — curated v1 list with detection badges; AC1's tool grid IS this.
- Setup-6 line 104 — hard-stop on missing tool, no auto-install. AC4 honors.

**Why Server Component for the page:**
Initial render needs preflight + three tool checks (data fetch). A Server Component does this on the server in parallel and ships only the rendered HTML; the client gets one round-trip. Client Component would need a useEffect cascade.

**Why the tool-check Route Handler ships with the page:**
The page is the only consumer; splitting forces a stub of the Route Handler in 6.1's tests and double-test-fixtures. Bundling keeps the surface coherent and reviewable as a single unit.

## Dev Agent Record

### Implementation Plan

_To be filled in by the dev agent at implementation time._

### Debug Log

_To be filled in by the dev agent during implementation._

### Completion Notes

_To be filled in by the dev agent after the quad gate is clean._

## File List

**Expected new files:**
- `src/app/capstone/setup/page.tsx`
- `src/app/capstone/setup/page.test.ts`
- `src/app/capstone/setup/tool-card.tsx` (client component, co-located)
- `src/app/api/capstone/setup/tool-check/route.ts`
- `src/app/api/capstone/setup/tool-check/route.test.ts`
- `src/app/api/capstone/setup/session-lock/route.ts`
- `src/app/api/capstone/setup/session-lock/route.test.ts`
- `src/lib/capstone/adapters/install-hints.ts`
- `src/lib/capstone/adapters/auth-hints.ts`
- `tests/e2e/capstone-setup-tool-selection.spec.ts`
- `_bmad-output/implementation-artifacts/6-1-tool-selection-and-auth-precheck-page.md` (this file)

**Expected modified files:**
- `src/lib/db/schemas.ts` (extend with `capstone-session-lock` kind)
- `src/lib/db/progress-db.ts` (lock helpers)
- `src/lib/db/progress-db.test.ts` (lock-helper cases)

## Change Log

- 2026-05-08 — Story file authored from FR-3.4/3.5 + brainstorm Setup-2/3/5/6 + architecture line 232.
