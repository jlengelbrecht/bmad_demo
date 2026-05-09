# Story 7a.1: Per-phase chat page + shared UI shell

**Epic:** 7a — WHY Phases (Brief + PRD)
**Story Key:** 7a-1-chat-page-shell
**Status:** done

## Story

As the developer landing FR-3.15 (chat surface), FR-3.17 (anti-magic chat — tool calls visible), FR-3.18 (BMAD primer visible), FR-3.19 (revise via re-prompt), and FR-3.20 (cancel + streaming),
I want `/capstone/chat/[sessionId]/[phase]/page.tsx` — the per-phase chat page consumed by Phases 3-8 — to render an `EventSource`-driven chat surface with message bubbles, inline tool-call cards, a collapsible BMAD primer panel, a cancel-in-flight button, and the trainee message input,
So that Stories 7a.2 (brief/PRD primers), 7b's phase-specific surfaces, and Epic 8's green-tests-gated dev story phase all reuse a single chat-page shell — and the per-phase chat UX is one place to evolve.

## Acceptance Criteria

**AC1 — Page exists at `src/app/capstone/chat/[sessionId]/[phase]/page.tsx`**
- Server Component reads `[sessionId]` (`CAPSTONE_SESSION_ID` format — Zod-validated; 404 on malformed) and `[phase]` (one of `brief|prd|architecture|epics-and-stories|adr|dev-story-1.1`; 404 on unknown).
- Looks up the session: tool, chosenDir, prior `tool-session-id` for this phase (from Story 5.7's `capstone-tool-session` row).
- Renders the page composed of:
  1. **Phase header** — "Phase N — <title>" with progress dots showing which phases are complete (queries `getCapstoneStepsCompleted(sessionId)`).
  2. **Prior artifacts panel** (collapsible) — list of files in CHOSEN_DIR (per FR-3.16) — `brief.md (1.2KB)`, `prd.md (3.4KB)`, etc. Default expanded for visibility on first load; collapses on first message.
  3. **BMAD primer panel** (collapsible, default collapsed) — renders `<adapter>.buildPrimer(phase)` content via the markdown pipeline. Per FR-3.18.
  4. **Chat thread** — `<ChatThread>` Client Component (AC2).
  5. **Message input** — `<MessageInput>` Client Component (AC3).
  6. **Phase-done button + acknowledge checkbox** (AC4) — initially disabled.
- The page's URL `[sessionId]` segment is the *capstone session id*; the *tool-native session id* (claude-code/codex/copilot's per-tool resume id) is captured by Story 5.7's stream handler and stored separately in SQLite.

**AC2 — `<ChatThread>` Client Component**
- File: `src/app/capstone/chat/[sessionId]/[phase]/chat-thread.tsx`.
- Props: `{ sessionId, phase, tool, chosenDir, initialMessages: ChatMessage[] }`.
- State: `useReducer` with actions `MESSAGE_APPENDED`, `MESSAGE_DELTA`, `TOOL_CALL_RECORDED`, `MESSAGE_ENDED`, `ERROR_RAISED`, `CANCELLED`.
- Maintains an in-memory message log of the current phase's chat. **Not persisted** — per FR-3.30 (cross-phase chat history replay is NOT supported); reload mid-phase loses the chat thread but the artifacts on disk persist.
- When a message-input submit fires (from AC3), opens a new `EventSource` to `/api/capstone/chat/<resolvedToolSessionIdOr'new'>/stream?phase=<phase>&message=<encoded>&tool=<tool>&chosenDir=<encoded>` (Story 5.7's endpoint).
- For each `event: msg` SSE event with a `ChatStreamEvent`:
  - `session-init` → store the tool-native session id locally (subsequent turns use it).
  - `message-delta` → append to the current assistant bubble's text (typewriter effect).
  - `tool-call` → render an inline tool-call card ("▶ <description>") between message bubbles.
  - `error` → render an error bubble in red with the message.
- For `event: done`: close the EventSource; un-disable the message input.
- Renders a "Cancel" button while a stream is in flight; clicking it calls `eventSource.close()` (which fires `req.signal.abort` server-side per Story 5.7's wiring).

**AC3 — `<MessageInput>` Client Component**
- File: `src/app/capstone/chat/[sessionId]/[phase]/message-input.tsx`.
- Multi-line textarea with autosize (max 8 rows). Submit on Cmd/Ctrl+Enter; Enter inserts newline.
- Soft warning at 8000 chars (per F-DEF-13); hard cap at 32000 chars (matches Story 5.7's Zod max).
- Submit button disabled when: empty input, in-flight stream, character cap exceeded.
- Per FR-3.19: explicitly NO "regenerate" button. The repaint-message affordance is "type a follow-up" — the input retains focus and a subtle hint after each turn: "Don't like the answer? Tell the agent what you want different." (Static text under the input.)

**AC4 — Phase-done button + acknowledge checkbox**
- Button is disabled until ALL of:
  1. The acknowledge checkbox is checked: "I've read this artifact and it represents my work" (per FR-3.22).
  2. A backend pre-check (`POST /api/capstone/phase-done?dryRun=1`) returns `{ ok: true, valid: true }` — Story 7a.3 owns the actual phase-done logic; this story stubs the dry-run-pre-check call but the real validation lands in 7a.3.
- On click: POST `/api/capstone/phase-done` with `{ sessionId, phase }`; on `{ ok: true, advanced: true }`, navigate to the next phase URL or to `/capstone/handoff/<sessionId>` if `phase === 'dev-story-1.1'` (Epic 9 territory).
- Renders next to the button: small "View artifact" disclosure that fetches and renders the artifact file content (e.g., `brief.md`) via a new `GET /api/capstone/artifact?session=<id>&phase=<phase>` Route Handler (read-only, returns the file content). Per FR-3.22: "render the produced artifact in a review panel before Done is clickable."

**AC5 — `GET /api/capstone/artifact` Route Handler (artifact-render support)**
- Query: `?session=<id>&phase=<phase>`. Zod-validated.
- Behavior:
  - Looks up CHOSEN_DIR for the session.
  - Reads the expected artifact file from CHOSEN_DIR per phase mapping:
    - `brief` → `<output-folder>/brief.md`
    - `prd` → `<output-folder>/prd.md`
    - `architecture` → `<output-folder>/architecture.md`
    - `epics-and-stories` → `<output-folder>/epics-and-stories.md`
    - `adr` → `<output-folder>/adr/<some-id>.md` (the FIRST adr-shaped file found; v1.1 may iterate)
    - `dev-story-1.1` → `<output-folder>/stories/1.1.md` (or first story file)
  - The `<output-folder>` is read from the wizard payload Phase 1 captured (default `_bmad-output`).
  - Returns `{ ok: true, path: <relative-to-chosenDir>, content: <utf8 string>, sizeBytes: number }` on success; `{ ok: false, error: 'not-found', expectedPath }` if the file is missing.
- Path-traversal-safe: resolved path must be `path.resolve(chosenDir, expectedPath).startsWith(chosenDir)` after `path.normalize`. 400 on traversal attempt.

**AC6 — `<ToolCallCard>` rendering**
- File: `src/app/capstone/chat/[sessionId]/[phase]/tool-call-card.tsx`.
- Renders the tool-call `description` as a single-line monospace pill with a ▶ icon. e.g. `"▶ reading brief.md..."`.
- For Copilot's plain-text adapter: tool calls may be rendered as text-bubbles instead of cards (since the adapter's `parseStreamChunk` only emits `tool-call` events for lines matching the heuristic). Documented graceful degradation.

**AC7 — Vitest unit coverage**
- `chat-thread.test.tsx`: stub EventSource (via `MockEventSource` test helper); inject canned event sequences; assert state transitions; assert tool-call cards render.
- `message-input.test.tsx`: empty disables submit; over-cap disables; Cmd+Enter submits; soft-warning at 8k.
- `artifact/route.test.ts`: happy path with fixture file; not-found case; path-traversal rejection; Zod-validation failures.
- `chat/[sessionId]/[phase]/page.test.ts`: 404 on invalid sessionId/phase; renders the four panels.

**AC8 — Playwright e2e at `tests/e2e/capstone-chat-page.spec.ts`**
- Uses Story 5.7's stub-adapter via `CAPSTONE_USE_STUB_ADAPTER=1`.
- Drives the chat page with a synthetic session in SQLite (fixture-loaded). Sends a message; asserts the streaming bubble updates; asserts the tool-call card renders; asserts cancel works mid-stream.
- Asserts the BMAD primer panel renders the placeholder primer content (Story 5.3's stubs; Story 7a.2 replaces with real content for brief/prd).
- Asserts Phase-done button is disabled without ack; checking ack + a backend-stubbed valid response enables it.

**AC9 — Lint, typecheck, quad gate**

## Tasks/Subtasks

- [ ] **Task 1 — Page Server Component (AC1)** — `[sessionId]/[phase]/page.tsx`. Composes the four panels.
- [ ] **Task 2 — `<ChatThread>` Client Component (AC2)** — useReducer + EventSource consumption.
- [ ] **Task 3 — `<MessageInput>` Client Component (AC3)** — textarea + caps + submit shortcut.
- [ ] **Task 4 — `<ToolCallCard>` (AC6)**.
- [ ] **Task 5 — `GET /api/capstone/artifact` Route Handler (AC5)**.
- [ ] **Task 6 — Phase-done button + ack checkbox (AC4)** — UI; the actual `POST /api/capstone/phase-done` real validation is Story 7a.3's territory; 7a.1 stubs the dry-run client-side call.
- [ ] **Task 7 — Vitest unit coverage (AC7)**.
- [ ] **Task 8 — Playwright e2e (AC8)**.
- [ ] **Task 9 — Quad gate clean (AC9)**.

## Dev Notes

**Architecture references:**
- §"Folder Layout" line 377 — `capstone/chat/[sessionId]/[phase]/page.tsx` verbatim.
- §"API & Communication Patterns → Endpoints" line 232 — chat stream + phase-done endpoints.

**PRD references:**
- FR-3.15 line 540 — chat surface proxies the AI tool.
- FR-3.16 line 541 — prior artifacts panel.
- FR-3.17 line 542 — anti-magic chat.
- FR-3.18 line 543 — BMAD primer visible (collapsible).
- FR-3.19 line 544 — revise via re-prompt; no "regenerate" button.
- FR-3.20 line 545 — cancel + streaming.
- FR-3.22 line 550 — render artifact + ack checkbox.

**Brainstorm references:**
- Prod-1/2/3/4/5/6/7/8/9/10/11 lines 130-172 — the artifact-production phase design positions; the chat-page shell embodies them.

**Why one shared chat shell across 7a/7b/8 instead of per-epic shells:**

The Phases 3-8 chat surfaces share 95% of their UI (chat thread, primer, prior artifacts, message input, cancel, phase-done). Differences are per-phase primer content (Story 7a.2/7b/8) and Phase 8's additional green-tests gate (Epic 8 extends `<PhaseDoneButton>`). Centralizing the shell here means evolving the chat UX is one diff.

**Why state is in-memory not persisted:**

FR-3.30 — cross-phase chat history replay is NOT supported. The chat thread is for the trainee, not the agent. On reload, the thread is empty but the artifacts on disk and the tool-native session id (which the agent rehydrates via `--resume`) survive.

## Dev Agent Record

### Implementation Plan

_To be filled in by the dev agent at implementation time._

### Debug Log

_To be filled in by the dev agent during implementation._

### Completion Notes

_To be filled in by the dev agent after the quad gate is clean._

## File List

**Expected new files:**
- `src/app/capstone/chat/[sessionId]/[phase]/page.tsx`
- `src/app/capstone/chat/[sessionId]/[phase]/page.test.ts`
- `src/app/capstone/chat/[sessionId]/[phase]/chat-thread.tsx`
- `src/app/capstone/chat/[sessionId]/[phase]/chat-thread.test.tsx`
- `src/app/capstone/chat/[sessionId]/[phase]/message-input.tsx`
- `src/app/capstone/chat/[sessionId]/[phase]/message-input.test.tsx`
- `src/app/capstone/chat/[sessionId]/[phase]/tool-call-card.tsx`
- `src/app/capstone/chat/[sessionId]/[phase]/phase-done-button.tsx`
- `src/app/api/capstone/artifact/route.ts`
- `src/app/api/capstone/artifact/route.test.ts`
- `tests/e2e/capstone-chat-page.spec.ts`
- `_bmad-output/implementation-artifacts/7a-1-chat-page-shell.md` (this file)

**Expected modified files:**
- `src/lib/db/progress-db.ts` (add `getCapstoneStepsCompleted` helper)

## Change Log

- 2026-05-08 — Story file authored from FR-3.15-3.20/3.22 + brainstorm Prod-1..11 + architecture line 377.
