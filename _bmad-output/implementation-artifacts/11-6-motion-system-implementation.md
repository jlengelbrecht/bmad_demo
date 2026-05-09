# Story 11.6: Motion system implementation — animation contracts per spec

**Epic:** 11 — UI Polish + Theming
**Story Key:** 11-6-motion-system-implementation
**Status:** ready-for-dev

## Story

As the developer landing the per-component animation contracts authored in `ux-design.md` §"Animation Guidelines",
I want the count-up utility, page transitions via View Transitions API, the `<ThemeToggle>` sliding pill (already in 11.1 — verified here), the `<PhaseDoneButton>` checkmark draw-on, the `<ToolCallCard>` slide-in (already in 11.4 — verified), the `<ArtifactList>` row pulse + count-up on `data-live` flips, the `<Toast>` slide-in stack, and the per-route page transitions wired,
So that the motion-as-information principle (`ux-design.md` §"Animation Guidelines → Motion Philosophy") becomes mechanically enforced — every animation respects its duration/easing token AND `prefers-reduced-motion`.

**Sequencing:** Lands AFTER Stories 11.1, 11.4, 11.5 (the foundation tokens + components that animate must exist). Lands BEFORE Story 11.7 (final QA — including the reduced-motion E2E test). In dev order: 11.6 ships AFTER Epic 6 + 7a's Story 7a.1 land (so the components have real prop flows to animate), but BEFORE Epic 7a's 7a.2/7a.3 + Epic 7b/8 (so those phases have polish from day 1).

## Acceptance Criteria

**AC1 — `countUp()` utility at `src/lib/utils/count-up.ts`**
- Pure function that animates a number's `textContent` from start → end over a duration with easing.
- Signature:
  ```ts
  function countUp(opts: {
    element: HTMLElement;
    from: number;
    to: number;
    durationMs?: number;       // default 200 (matches --duration-base)
    easing?: (t: number) => number; // default easeOutCubic
    formatter?: (n: number) => string; // default Number.toFixed(1) for fractional values, .toString() for integers
    onComplete?: () => void;
  }): { cancel: () => void };
  ```
- Implementation: `requestAnimationFrame` loop; each frame computes `t = Math.min(elapsed / durationMs, 1)`; sets `element.textContent = formatter(from + (to - from) * easing(t))`.
- Reduced-motion: when `window.matchMedia('(prefers-reduced-motion: reduce)').matches`, the function sets `textContent = formatter(to)` immediately and calls `onComplete` synchronously, NO animation.
- Returns a cancel function: callers can abort mid-animation (e.g., a new `data-live` flip arrives before the previous count-up finishes).
- Vitest cases at `src/lib/utils/count-up.test.ts`:
  - Animates from 0 to 1.2 over 200ms; final textContent is `"1.2 KB"` (with default formatter) or just the formatter's output.
  - Cancel mid-animation stops further frames.
  - Reduced-motion mode: textContent is the final value immediately; no requestAnimationFrame called (mock confirms).

**AC2 — `<ArtifactList>` row pulse + count-up on `data-live` flips**
- Story 11.4 shipped `<ArtifactList>` with static rendering; Story 11.6 layers the live-flip animations.
- Behavior: when an artifact's `isLive` prop transitions from `false` → `true` (or when a new artifact appears in the `artifacts` array with `isLive: true`):
  - The row's background applies the `animate-pulse-once` keyframe (defined in `globals.css`, Story 11.1) — `bg-accent-subtle` for 300ms, fading to transparent.
  - The size text count-ups from the previous size (or 0 if newly added) to the current size via the count-up utility.
- Implementation: a `useEffect` in the `<ArtifactList>` row component watches `isLive` + `sizeBytes` props. On change, applies the pulse class (and removes it after 600ms via `setTimeout`) AND invokes `countUp()` on the size span ref.
- Reduced-motion: pulse + count-up suppressed per the global rule; size text updates instantly.
- Vitest case in `artifact-list.test.tsx` extension: simulate `data-live` flip → assert the pulse class is applied and removed; assert size textContent updates (the count-up animation completes within the test timeout).

**AC3 — `<PhaseDoneButton>` success checkmark draw-on**
- Story 11.4 shipped `<PhaseDoneButton>` with the `onSuccessAnimate?` callback hook; Story 11.6 implements the actual draw-on animation.
- Behavior: when `dryRunValid && !isPending && wasJustClicked` (the success state):
  - An inline SVG checkmark renders next to the button: `<svg ... ><polyline points="3 12.5 9.5 19 21 5" stroke-dasharray="24" stroke-dashoffset="24" />`
  - The `<polyline>` element gets the `animate-draw-check` keyframe (defined in `globals.css` Story 11.1): `stroke-dashoffset: 24 → 0` over `--duration-slow` with `--ease-spring` easing.
  - Single-shot; never replays unless the trainee clicks again on a fresh phase.
  - 200ms after the checkmark settles, a brief "Tests green" / "Phase complete" label fades in next to it (via `transition-opacity duration-base ease-out`).
- Reduced-motion: checkmark renders fully drawn instantly (`stroke-dashoffset: 0` static); label fades-in becomes instant per the global rule.
- Vitest case: render with `dryRunValid=true, isPending=false, wasJustClicked=true`; assert SVG renders with the animation class.

**AC4 — Page transitions via View Transitions API**
- File: `src/app/layout.tsx` (or a sibling `src/app/template.tsx` per Next.js's App Router pattern).
- Wrap route renders in a Next.js view-transition primitive when the API is available:
  - Detect via `'startViewTransition' in document`.
  - When supported: route navigation triggers `document.startViewTransition(() => router.push(...))`. Next.js 16 has `unstable_ViewTransition` support; use the documented API. Reference: Next.js view-transitions docs.
  - When unsupported (older browsers): fall back to a CSS keyframe (`animate-page-enter`) applied to the route's content wrapper on mount.
- View Transitions CSS (in `globals.css`):
  ```css
  ::view-transition-old(root) {
    animation: 200ms var(--ease-out) both fade-out;
  }
  ::view-transition-new(root) {
    animation: 400ms var(--ease-out) both page-enter;
  }
  @keyframes fade-out {
    from { opacity: 1; }
    to   { opacity: 0; }
  }
  ```
- Reduced-motion: `@media (prefers-reduced-motion: reduce)` overrides both animations to `0.01ms` per the global rule. The route still renders; just instantly.
- Playwright case in `tests/e2e/page-transitions.spec.ts`: navigate from `/` to `/start-here`; assert the view-transition fires (check `document.startViewTransition` was called via instrumentation) — soft assertion; if browser doesn't support the API, the test still passes as a no-op.

**AC5 — `<Toast>` + `<Toaster>` provider implementation**
Story 11.1 left a `<div id="toaster-root">` placeholder; Story 11.6 implements the actual toast queue.
- File: `src/components/toaster.tsx`.
- A small `useToast()` hook + `<Toaster>` provider — minimal in-tree implementation; no external `react-hot-toast` dep.
- API:
  ```ts
  const { toast } = useToast();
  toast({ kind: 'success' | 'error' | 'warning' | 'info', title: string, description?: string, durationMs?: 5000 });
  ```
- Behavior:
  - `<Toaster>` mounts at `<body>` level (via the `id="toaster-root"` element from Story 11.1).
  - Each toast renders absolute-positioned bottom-right, stack of up to 3 visible (older toasts get popped if more than 3 active).
  - Each toast slides in via `animate-toast-in` (Story 11.1's keyframe): `opacity 0 → 1`, `translateY(8px) → 0`, `duration-base ease-out`.
  - Auto-dismiss after `durationMs` (default 5000ms): fade-out reverse via inline transition.
  - Click X → immediate dismiss (skips auto-timer).
  - Visual variants per `kind`: left border colored per success/error/warning/info tokens; icon from lucide (Check/AlertCircle/AlertTriangle/Info).
- Reduced-motion: slide-in reduces to opacity-only; auto-dismiss fade-out reduces to opacity-only.
- Vitest cases: trigger toast via hook; assert it appears; assert auto-dismiss fires after timer; assert manual dismiss works; assert kind-variant classes apply.

**AC6 — Verify `<ThemeToggle>` sliding pill animation passes (no new code; sanity check from 11.1)**
- This animation was implemented in Story 11.1. Story 11.6 adds NO new code here, but adds an explicit test case to `tests/e2e/theme-toggle.spec.ts` (extension):
  - Click between Light/Dark/Auto; capture the pill's `transform` style at intervals; assert it animates over `~200ms` with `ease-in-out` curve (loose match — verifying the `transform` value at three intermediate points is on the curve).
- Reduced-motion verification: emulate `prefers-reduced-motion: reduce`; assert pill snaps (transform changes instantly without intermediate values).

**AC7 — Verify `<ToolCallCard>` slide-in animation passes (no new code from 11.4)**
- Animation shipped in Story 11.4 via `animate-slide-in` class.
- Story 11.6 adds an explicit Playwright test in `tests/e2e/chat-surface-visuals.spec.ts` (extension): inject a tool-call card mid-stream into the test-only chat-visuals route; assert opacity transitions from 0 → 1 + transform from `translateX(-8px)` → 0.

**AC8 — Composite reduced-motion E2E spec**
- File: `tests/e2e/reduced-motion.spec.ts` (Story 11.1 created the basic spec; Story 11.6 expands).
- Walks the trainee golden path with `page.emulateMedia({ reducedMotion: 'reduce' })`:
  - Home → click audience tile → assert no transform animation on hover (compare initial render to post-hover; should be identical except color).
  - Theme toggle → click between modes → assert pill snaps (no intermediate transform values).
  - Test-only chat-visuals route → trigger tool-call card → assert opacity transitions but transform doesn't (translate stays at 0).
  - Test-only bootstrap-visuals route → progress shimmer → assert opacity is constant 1 (no pulse).
- Asserts the global `@media (prefers-reduced-motion: reduce)` rule from Story 11.1 is honored across components.

**AC9 — Lint, typecheck, quad gate**

## Tasks/Subtasks

- [ ] **Task 1 — `countUp()` utility (AC1)** — `src/lib/utils/count-up.ts` + tests.
- [ ] **Task 2 — `<ArtifactList>` live-flip animations (AC2)** — extend Story 11.4's component with the `useEffect` that triggers pulse + count-up on `isLive` flip.
- [ ] **Task 3 — `<PhaseDoneButton>` checkmark draw-on (AC3)** — implement the `onSuccessAnimate` hook that Story 11.4 left as a stub.
- [ ] **Task 4 — View Transitions API integration (AC4)** — `layout.tsx` or `template.tsx` wraps route renders. CSS keyframes + fallback animation class.
- [ ] **Task 5 — `<Toast>` + `<Toaster>` (AC5)** — small in-tree implementation; no external dep.
- [ ] **Task 6 — Verify existing animations (AC6, AC7)** — test cases for `<ThemeToggle>` pill + `<ToolCallCard>` slide-in. No new component code.
- [ ] **Task 7 — Composite reduced-motion E2E (AC8)** — extend `tests/e2e/reduced-motion.spec.ts` with golden-path coverage.
- [ ] **Task 8 — Quad gate clean (AC9)**.

### Review Findings

_To be populated by code review after implementation._

## Dev Notes

**Architecture references:**
- §"Test Strategy" line 333-336 — Vitest for unit, Playwright for E2E.

**PRD references:**
- NFR-A1 line 620 — WCAG AA; reduced-motion is part of AA conformance.

**Design spec references:**
- §"Animation Guidelines → Motion Tokens" — duration + easing values used throughout.
- §"Animation Guidelines → Where Animation Lives" — full 22-row contract (verified against AC list).
- §"Animation Guidelines → Per-Component Animation Contracts" — implementation specs verbatim.
- §"Animation Guidelines → Reduced-Motion Strategy" — global override rule + per-animation fallback contract.

**Why an in-tree `<Toaster>` instead of `react-hot-toast`:**

The toast system has 5-6 surfaces in v1 (validation errors, phase-done success, copy-to-clipboard confirmations). A 100-line in-tree implementation covers all of them; adding a 6KB-gzipped library for one feature violates the "vendored everything + no library bloat" principle. If the toast surface grows past three variants OR needs queue-priority logic, v1.1 evaluates `react-hot-toast` or `sonner`.

**Why View Transitions API + CSS keyframe fallback:**

The native API gives smooth route-to-route transitions for free in modern browsers. The CSS keyframe fallback means browsers that don't support it still animate consistently (just with a less-elegant approach). Reduced-motion is honored in both paths.

**Why Story 11.6 lands AFTER Story 7a.1 (in dev order, despite both being inside the Epic-11 + Epic-7a interleave):**

Story 11.6's animations need REAL component instances to animate. Story 11.4 ships static prop-driven components; Story 7a.1 wires them into a real chat surface; Story 11.6 then layers motion on the wired instances. Animating stub components would mean the motion contract gets re-verified once Story 7a.1 changes prop flows — wasteful churn. Better to land motion against the wired components.

**Defensible deviations:**
- The `countUp` utility uses `requestAnimationFrame` not `setInterval` — RAF respects browser frame rate; setInterval doesn't. Choice locked.
- The `easeOutCubic` default for count-up rather than `--ease-out` cubic-bezier(0.16, 1, 0.3, 1). The cubic-bezier is the CSS easing; `easeOutCubic` is the JS equivalent at `t => 1 - Math.pow(1 - t, 3)`. They're functionally indistinguishable for our durations (200ms); using the JS form keeps the utility synchronous + framework-agnostic.

**Test approach:**
- Vitest for the utility + components.
- Playwright for E2E motion verification + reduced-motion sweep.
- No integration spec.

**No-egress / runtime-fs sanity:**
- All animation logic is client-side. No network. NFR-S1 holds.

## Dev Agent Record

### Implementation Plan

_To be filled in by the dev agent at implementation time._

### Debug Log

_To be filled in by the dev agent during implementation._

### Completion Notes

_To be filled in by the dev agent after the quad gate is clean._

## File List

**Expected new files:**
- `src/lib/utils/count-up.ts` + `.test.ts`
- `src/components/toaster.tsx` + `.test.tsx`
- `tests/e2e/page-transitions.spec.ts`
- `_bmad-output/implementation-artifacts/11-6-motion-system-implementation.md` (this file)

**Expected modified files:**
- `src/components/capstone-chat/artifact-list.tsx` (live-flip animation effect)
- `src/components/capstone-chat/artifact-list.test.tsx`
- `src/components/capstone-chat/phase-done-button.tsx` (draw-on checkmark)
- `src/components/capstone-chat/phase-done-button.test.tsx`
- `src/app/layout.tsx` (or sibling `template.tsx` — view-transitions wiring + `<Toaster>` mount)
- `src/app/globals.css` (add View Transitions ::view-transition selectors + fade-out keyframe)
- `tests/e2e/theme-toggle.spec.ts` (pill animation assertion)
- `tests/e2e/chat-surface-visuals.spec.ts` (tool-call slide-in assertion)
- `tests/e2e/reduced-motion.spec.ts` (composite golden-path coverage)

## Change Log

- 2026-05-08 — Story file authored from `ux-design.md` §"Animation Guidelines" + per-component animation contracts.
