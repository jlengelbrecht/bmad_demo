# Story 11.4: Chat surface visual components (`<ChatBubble>`, `<ToolCallCard>`, `<MessageInput>`, `<PrimerDisclosure>`, `<ArtifactList>`, `<PhaseDoneButton>`, `<ChatThread>`)

**Epic:** 11 — UI Polish + Theming
**Story Key:** 11-4-chat-surface-visual-components
**Status:** ready-for-dev

## Story

As the developer landing the visual layer for the capstone chat surface (Epic 7a's defining experience),
I want seven custom components vendored at `src/components/capstone-chat/*.tsx` — `<ChatBubble>`, `<ToolCallCard>`, `<MessageInput>`, `<PrimerDisclosure>`, `<ArtifactList>`, `<PhaseDoneButton>`, `<ChatThread>` — built against the foundation tokens (Story 11.1) and ready for Story 7a.1 to wire to the SSE Route Handler,
So that Epic 7a's authoring focuses on the data-flow + state-machine logic rather than re-implementing the visual layer; and Story 7a.1's review effort stays focused on the chat-loop correctness, not the styling.

**Sequencing:** Lands AFTER Story 11.1 (foundation tokens + Radix wrappers required). Lands BEFORE Story 7a.1 (which consumes these components). Story 11.4 ships the components as visual stubs with prop-driven rendering only — no SSE wiring, no backend calls. Story 7a.1 layers the chat-stream EventSource consumer on top.

## Acceptance Criteria

**AC1 — `<ChatBubble>` at `src/components/capstone-chat/chat-bubble.tsx`**
Per `ux-design.md` §"Component Strategy → `<ChatBubble>`":
- Props: `{ variant: 'user' | 'assistant' | 'error', children: ReactNode, isStreaming?: boolean, className?: string }`.
- User variant: `self-end max-w-[90%] px-4 py-3 rounded-lg bg-accent text-accent-foreground`.
- Assistant variant: `self-start max-w-[90%] px-4 py-3 rounded-lg bg-surface-sunken border border-border text-text-primary`.
- Error variant: `self-start max-w-[90%] px-4 py-3 rounded-lg bg-surface border border-error text-text-primary`. Inside, the children render with `text-error font-mono text-sm` for the stderr-style payload.
- When `isStreaming === true`, an inline typewriter cursor renders at the end of the children: `<span class="inline-block w-2 h-4 bg-text-primary align-text-bottom animate-blink ml-0.5" aria-hidden="true" />`.
- `<ChatBubble>` includes ARIA: assistant variant has `role="status"` + `aria-live="polite"` on the wrapping element; user variant has no ARIA (it's the user's own message echo, not a status).
- Reduced-motion: typewriter cursor is static (`opacity: 1`) — defined globally per Story 11.1's reduced-motion rule.

**AC2 — `<ToolCallCard>` at `src/components/capstone-chat/tool-call-card.tsx`**
Per `ux-design.md` §"Component Strategy → `<ToolCallCard>`":
- Props: `{ description: string, className?: string }`.
- Renders: `<div role="status" aria-label="Tool call: {description}" class="self-start max-w-[90%] px-3 py-1.5 rounded-md font-mono text-sm bg-info/8 border border-info/25 text-info inline-flex items-center gap-1.5 animate-slide-in">`.
- Inner: `<span aria-hidden="true">▶</span><span>{description}</span>`.
- The `animate-slide-in` class is the keyframe defined in `globals.css` (Story 11.1): `opacity: 0 → 1` and `translateX(-8px) → 0`.
- Reduced-motion: animation reduces to opacity-only fade per the global rule.

**AC3 — `<MessageInput>` at `src/components/capstone-chat/message-input.tsx`**
Per `ux-design.md` §"Component Strategy → `<MessageInput>`" + §"UX Consistency Patterns → Form Patterns":
- Props: `{ value: string, onChange: (v: string) => void, onSubmit: () => void, onCancel?: () => void, isStreaming: boolean, disabled?: boolean, maxLength?: number /* default 32000 */, softWarnAt?: number /* default 8000 */ }`.
- Layout: `<div class="border border-border-strong rounded-lg p-3 bg-surface flex flex-col gap-2">`
  - `<Textarea>` (Story 11.1's foundation): no border (the wrapper has it); placeholder "Type your message... (Cmd+Enter to send)"; rows=3; autosize via Tailwind `field-sizing: content` if supported else JS height adjustment up to 8 rows.
  - Footer row: `<div class="flex justify-between items-center">`
    - Left hint: `<span class="text-xs text-text-muted">Cmd+Enter to send · Esc to cancel · {value.length} / {maxLength} chars</span>`. When `value.length >= softWarnAt`, the chars span gets `text-warning`. When `value.length === maxLength`, it gets `text-error`.
    - Right buttons: `<Button variant="ghost" onClick={onCancel} class={cn('opacity-0 pointer-events-none transition-opacity duration-fast', isStreaming && 'opacity-100 pointer-events-auto')}>Cancel</Button>` followed by `<Button variant="primary" onClick={onSubmit} disabled={disabled || !value.trim() || value.length > maxLength}>Send →</Button>`.
- Keyboard handlers (via `onKeyDown` on the textarea):
  - `Cmd/Ctrl+Enter` → calls `onSubmit()`.
  - `Esc` → calls `onCancel?.()`.
  - All other keys → default behavior.
- Reduced-motion: Cancel button reveal becomes instant (no opacity transition) per the global rule.

**AC4 — `<PrimerDisclosure>` at `src/components/capstone-chat/primer-disclosure.tsx`**
Per `ux-design.md` §"Component Strategy → `<PrimerDisclosure>`":
- Props: `{ phaseName: string, primerMarkdown: string, defaultOpen?: boolean, className?: string }`.
- Wraps `<Collapsible>` from Story 11.1's foundation:
  - `<CollapsibleTrigger>`: `<button class="flex items-center gap-1.5 px-3 py-2.5 w-full text-left text-sm font-medium text-text-secondary hover:bg-surface-sunken hover:text-text-primary [&[data-state=open]]:bg-surface-sunken transition-colors duration-fast"><ChevronDown class="w-4 h-4 transition-transform [&[data-state=open]]:rotate-0 [&[data-state=closed]]:-rotate-90" />View primer for {phaseName}</button>`. (Caret rotation is via Radix `data-state` attribute targeted with Tailwind arbitrary-variant selectors.)
  - `<CollapsibleContent>`: renders the primer markdown via Story 11.3's pipeline (server-rendered if possible; otherwise client-side via `<Markdown>` Server Component island). Container: `border-t border-border bg-surface-sunken p-3 max-h-[200px] overflow-y-auto font-mono text-xs leading-relaxed text-text-secondary`.
- Outer wrapper: `border border-border rounded-md overflow-hidden`.
- Default closed.

**AC5 — `<ArtifactList>` at `src/components/capstone-chat/artifact-list.tsx`**
Per `ux-design.md` §"Component Strategy → `<ArtifactList>`":
- Props: `{ artifacts: Array<{ name: string, sizeBytes: number, isLive?: boolean }>, className?: string }`.
- Layout: `<section class="space-y-2">`
  - `<h4 class="text-xs uppercase tracking-wide text-text-muted font-semibold">Prior artifacts</h4>`
  - `<ul class="space-y-0">` (no gap; rows have border-bottom for visual separation):
    - Each `<li>`: `<li data-live={isLive} class="flex justify-between py-1.5 border-b border-border text-sm text-text-secondary [&[data-live=true]]:text-text-primary [&[data-live=true]]:font-medium last:border-b-0 transition-colors">`
      - Filename: `<span>{name}{isLive ? ' ⌁' : ''}</span>` (the lightning glyph is the "live" indicator next to filename)
      - Size: `<span class="font-mono text-xs text-text-muted [&[data-live=true]]:text-accent">{formatSize(sizeBytes)}</span>`
- `formatSize(bytes)` utility (inline in this file or `src/lib/utils.ts`): formats as `1.2 KB`, `34 B`, etc.
- Empty-state (when `artifacts.length === 0`): `<p class="text-sm text-text-muted">No prior artifacts yet — start the chat below.</p>`.
- Story 11.4 ships this WITHOUT live-update animation; Story 11.6 adds the count-up + pulse animations to the row when transitioning to `isLive=true`.

**AC6 — `<PhaseDoneButton>` at `src/components/capstone-chat/phase-done-button.tsx`**
Per `ux-design.md` §"Component Strategy → `<PhaseDoneButton>`" + §"Per-Component Animation Contracts":
- Props: `{ phaseName: string, ackChecked: boolean, onAckChange: (v: boolean) => void, onClick: () => void, dryRunValid: boolean, isPending: boolean, isPhase8: boolean, validationError?: string }`.
- Layout (`<div class="border border-border rounded-md p-4 bg-surface space-y-3">`):
  - Heading: `<div class="font-medium text-text-primary">Ready to advance from {phaseName}?</div>`.
  - Ack checkbox row: `<label class="flex items-start gap-2 text-sm text-text-secondary cursor-pointer"><Checkbox checked={ackChecked} onCheckedChange={onAckChange} />I've read this artifact and it represents my work.</label>`.
  - "View artifact" disclosure: `<PrimerDisclosure>` repurposed (or a sibling `<ArtifactDisclosure>` if cleaner) — expands to render the produced artifact markdown OR the validation error message. Component receives the artifact-content fetch as an optional render-prop.
  - Phase 8 (`isPhase8 === true`): an additional `<TestResultsPanel>` sibling renders below the artifact disclosure. Story 11.4 ships `<TestResultsPanel>` as part of this story (AC7).
  - Phase-done button: `<Button variant="primary" onClick={onClick} disabled={!ackChecked || !dryRunValid || isPending}><Loader2 class={cn('w-4 h-4 mr-2 animate-spin', !isPending && 'hidden')} />Phase done →</Button>`.
  - When `validationError` is set (and ack is checked, but dry-run is invalid), the error message renders inline above the button: `<p class="text-sm text-error" role="alert">{validationError}</p>`.
- On successful `onClick` → POST → response valid → the component's parent renders a one-shot success animation (Story 11.6's checkmark draw-on). Story 11.4 leaves a hook for this: a callback `onSuccessAnimate?: () => void` that fires when `dryRunValid && !isPending && wasJustClicked`. The actual animation orchestration lives in Story 11.6.

**AC7 — `<TestResultsPanel>` at `src/components/capstone-chat/test-results-panel.tsx`**
Required for Phase 8 (`<PhaseDoneButton isPhase8>`):
- Props: `{ status: 'green' | 'red' | 'no-test-command' | 'timeout' | 'pending' | null, exitCode?: number, durationMs?: number, output?: string, message?: string }`.
- Wraps `<Collapsible>`. Default open when `status !== null`.
- Trigger row: `<button class="flex items-center gap-2 w-full p-3 text-left text-sm font-medium">`
  - Status badge: green `<Check class="w-4 h-4 text-success" />` / red `<X class="w-4 h-4 text-error" />` / amber `<AlertTriangle class="w-4 h-4 text-warning" />` (no-test-command) / spinner `<Loader2 class="w-4 h-4 text-text-muted animate-spin" />` (pending).
  - Status text: "Tests passed in {durationMs/1000}s" / "Tests failed (exit code {exitCode})" / "No test command" / "Test run timed out" / "Running tests...".
- Content: `<pre class="font-mono text-xs bg-surface-sunken border-t border-border p-3 max-h-[200px] overflow-auto whitespace-pre-wrap text-text-secondary">{output || message}</pre>`.
- When status is `red`, the panel is auto-expanded (default) so trainee sees the test output without an extra click.

**AC8 — `<ChatThread>` at `src/components/capstone-chat/chat-thread.tsx`**
The container that arranges `<ChatBubble>`s and `<ToolCallCard>`s vertically with auto-scroll.
- Props: `{ items: Array<ChatItem>, className?: string }` where `ChatItem` is `{ kind: 'bubble', variant, content, isStreaming } | { kind: 'tool-call', description }`.
- Layout: `<div class="flex flex-col gap-4 overflow-y-auto h-full px-1 py-2">`.
- Auto-scroll behavior: a `useEffect` watches `items.length`; if the user is at the bottom of the scroll, scrolls to the new bottom on each new item; if the user has scrolled up, surfaces a "↓ New message" pill that, on click, scrolls back to the bottom and resumes auto-follow.
- "↓ New message" pill: positioned `absolute bottom-4 left-1/2 -translate-x-1/2`, `<button class="px-3 py-1.5 rounded-full bg-accent text-accent-foreground text-xs shadow-md hover:bg-accent/90">↓ New message</button>`.
- Story 11.4 ships the auto-scroll logic + pill. Story 7a.1 wires the actual `items` prop from the EventSource consumer.

**AC9 — Vitest unit coverage**
- One test file per component. Each covers:
  - Default render with required props.
  - Variant/state coverage (user/assistant/error for `<ChatBubble>`; live/static for `<ArtifactList>`; etc.).
  - ARIA attributes per the spec's Accessibility column.
  - Keyboard handlers for `<MessageInput>` (Cmd+Enter, Esc).
  - Disabled states for `<PhaseDoneButton>` (no ack / no dry-run-valid / pending).
- Snapshot tests for visual contract on each component (one snapshot per locked variant).

**AC10 — Visualizer-fidelity Playwright spec**
- `tests/e2e/chat-surface-visuals.spec.ts` — uses a minimal mock-page (test-only route at `/__test__/chat-visuals` rendering all 7 components with sample props) to verify the components render correctly in both themes.
- This is a NEW test-only route. Implemented via a route gated on `process.env.E2E_TEST_ROUTES === '1'`. Production never serves it.
- Asserts: every component renders; theme toggle flips them all; reduced-motion suppresses animations.
- Story 7a.1 will add the real E2E spec that drives the components against the SSE Route Handler.

**AC11 — Lint, typecheck, quad gate**

## Tasks/Subtasks

- [ ] **Task 1 — Scaffold `src/components/capstone-chat/`** — create directory + 7 component files + colocated tests. README pointer to `ux-design.md` §"Component Strategy".
- [ ] **Task 2 — `<ChatBubble>` (AC1)** — three variants + streaming cursor.
- [ ] **Task 3 — `<ToolCallCard>` (AC2)** — slide-in animation class application.
- [ ] **Task 4 — `<MessageInput>` (AC3)** — textarea + footer + Cmd+Enter + Esc + cancel reveal.
- [ ] **Task 5 — `<PrimerDisclosure>` (AC4)** — Radix Collapsible wrapper + markdown rendering.
- [ ] **Task 6 — `<ArtifactList>` (AC5)** — list + size formatter + live-row data attribute.
- [ ] **Task 7 — `<PhaseDoneButton>` (AC6)** — ack + dry-run-state-aware button + view-artifact disclosure.
- [ ] **Task 8 — `<TestResultsPanel>` (AC7)** — Phase-8-specific test output.
- [ ] **Task 9 — `<ChatThread>` (AC8)** — auto-scroll + new-message pill.
- [ ] **Task 10 — Vitest unit coverage (AC9)**.
- [ ] **Task 11 — Test-only visualizer route + Playwright spec (AC10)** — gated on env var.
- [ ] **Task 12 — Quad gate clean (AC11)**.

### Review Findings

_To be populated by code review after implementation._

## Dev Notes

**Architecture references:**
- §"Folder Layout" line 388 — `src/components/` for shared components.
- §"Frontend Architecture → State management" line 244 — local state via React; no global store.

**PRD references:**
- FR-3.15 line 540 — chat surface proxies the AI tool.
- FR-3.16 line 541 — cross-phase context = files on disk.
- FR-3.17 line 542 — anti-magic chat (tool calls visible).
- FR-3.18 line 543 — BMAD primer visible.
- FR-3.19 line 544 — revise via re-prompt; no regenerate.
- FR-3.20 line 545 — cancel + streaming.
- FR-3.21/3.22 lines 549-550 — phase-done gates.

**Design spec references:**
- §"Component Strategy → Load-bearing custom components" — full specs for `<ChatBubble>`, `<ToolCallCard>`, `<PhaseDoneButton>`, `<ArtifactList>`.
- §"UX Consistency Patterns → Form Patterns" — `<MessageInput>` follows the form-pattern lock.
- §"User Journey Flows → Journey 3 — Single Chat Phase Loop" — the loop these components compose.
- Visualizer Mockup 3 — exact rendered design.

**Why ship as visual stubs in 11.4 instead of integrating directly into Story 7a.1:**

Sequencing lock: Epic 11 lands BEFORE rebuild dev work (Devbox's initial scoping). Story 7a.1 is in Epic 7a which lands AFTER Epic 5. If Story 7a.1 had to build both visual layer AND data flow, its review weight doubles. Splitting means:
- Story 11.4 ships components with prop-driven rendering + snapshot tests; review focuses on visual fidelity.
- Story 7a.1 wires the components to the EventSource + reducer; review focuses on state-machine correctness.

**Why the test-only visualizer route:**

The components don't have a real production page to test against until Story 7a.1 lands. A minimal test-route lets Story 11.4's Playwright spec verify rendering + theme + a11y without waiting for 7a.1. The route is env-var-gated so it doesn't ship in production.

**Defensible deviations:**
- `<PhaseDoneButton>` is one component in 11.4 even though Phase 8 layers a test-results sibling — keeping them in one story preserves the cohesive contract. Alternative (split into base + Phase-8 specialization) would force Story 8.2's visual to live elsewhere; cleaner to keep visual contract in 11.4.

**Test approach:**
- Vitest per-component coverage.
- Playwright fidelity spec via test-only route.
- No integration / no real SSE wiring at v1 — Story 7a.1's territory.

**No-egress / runtime-fs sanity:**
- Components render based on props; no network calls or filesystem reads. NFR-S1 holds.
- The test-only route is gated on env var; not present in production builds.

## Dev Agent Record

### Implementation Plan

_To be filled in by the dev agent at implementation time._

### Debug Log

_To be filled in by the dev agent during implementation._

### Completion Notes

_To be filled in by the dev agent after the quad gate is clean._

## File List

**Expected new files:**
- `src/components/capstone-chat/chat-bubble.tsx` + `.test.tsx`
- `src/components/capstone-chat/tool-call-card.tsx` + `.test.tsx`
- `src/components/capstone-chat/message-input.tsx` + `.test.tsx`
- `src/components/capstone-chat/primer-disclosure.tsx` + `.test.tsx`
- `src/components/capstone-chat/artifact-list.tsx` + `.test.tsx`
- `src/components/capstone-chat/phase-done-button.tsx` + `.test.tsx`
- `src/components/capstone-chat/test-results-panel.tsx` + `.test.tsx`
- `src/components/capstone-chat/chat-thread.tsx` + `.test.tsx`
- `src/components/capstone-chat/README.md` (one-line pointer)
- `src/app/__test__/chat-visuals/page.tsx` (env-var-gated test route)
- `tests/e2e/chat-surface-visuals.spec.ts`
- `_bmad-output/implementation-artifacts/11-4-chat-surface-visual-components.md` (this file)

**Expected modified files:**
- None (Story 7a.1 does the wiring; Story 11.4 only adds new files).

## Change Log

- 2026-05-08 — Story file authored from `ux-design.md` §"Component Strategy" + visualizer Mockup 3 + FR-3.15-3.22.
