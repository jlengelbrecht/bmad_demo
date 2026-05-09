# Story 11.7: Final design-system QA — axe-core sweep, theme-flicker, reduced-motion, keyboard E2E

**Epic:** 11 — UI Polish + Theming
**Story Key:** 11-7-design-system-qa
**Status:** ready-for-dev

## Story

As the developer landing the final QA pass on the design system after Epics 5-9 have shipped,
I want comprehensive automated tests covering WCAG 2.x AA conformance across every route, theme-flicker absence at first paint, reduced-motion respect on every animation, keyboard-only navigation, and the manual VoiceOver + color-blindness smoke documented in `branch-protection-notes.md`,
So that the entire portal — curriculum + capstone + handoff — passes the design-system gate before v1 ships, with CI-blocking automated coverage and a clear human-driven release checklist for the items automation can't catch.

**Sequencing:** This is the LAST Epic-11 story. It lands AFTER Epic 9 (the final feature epic), so every route the trainee can reach is included in the sweep. Lands BEFORE the final v1 release.

## Acceptance Criteria

**AC1 — `tests/e2e/accessibility.spec.ts` covers every route in the trainee golden path**
- Routes covered:
  - `/` (home)
  - `/start-here`, `/stakeholder`, `/facilitator`
  - `/lessons/1-what-is-bmad` through `/lessons/6-capstone` (six lesson pages)
  - `/labs/solo`, `/labs/sync`, `/labs/async-story-review`
  - `/capstone` (overview)
  - `/capstone/setup` (Phase 0/0.5)
  - `/capstone/setup/wizard` (Phase 1)
  - `/capstone/setup/bootstrap` (Phase 2)
  - `/capstone/setup/bootstrap/complete` (Phase 2 pause)
  - `/capstone/chat/<test-session>/brief` (one chat phase representative)
  - `/capstone/handoff/<test-session>` (Phase 9)
- Each route loads with a synthetic test session (fixture-loaded via Playwright `page.evaluate` setting up SQLite + filesystem state). Story 11.7 ships the fixture utility at `tests/e2e/fixtures/synthetic-session.ts`.
- For each route, `await injectAxe(page)` then `await checkA11y(page, null, { detailedReport: true, axeOptions: { runOnly: ['wcag2a', 'wcag2aa'] } })`.
- Any AA violation fails CI with the detailed report.
- Disabled / known-issue exceptions are documented inline in the spec with a `// FIXME(story-N.M): <reason>` comment AND tracked in a follow-up story (rule: no exceptions without a follow-up).

**AC2 — `tests/e2e/theme-flicker.spec.ts` enforces no first-paint flash**
- Story 11.1 created the basic spec; Story 11.7 expands it.
- For each of light, dark, auto themes:
  - Set `localStorage.theme` BEFORE navigation.
  - Navigate to a representative route (home, lesson, capstone setup).
  - Capture a screenshot at `domcontentloaded` (BEFORE any client-side React hydration).
  - Compute the average pixel luminance of the screenshot. For dark theme, assert luminance < 0.3; for light theme, assert luminance > 0.7. Auto theme follows the emulated `prefers-color-scheme`.
  - Failure mode: if the inline theme-init script doesn't run early enough, the screenshot will show light-mode colors before flipping to dark, and the luminance assertion fails.

**AC3 — `tests/e2e/reduced-motion.spec.ts` covers the composite golden path**
- Story 11.6 created the composite spec; Story 11.7 extends with all routes and all animations.
- `page.emulateMedia({ reducedMotion: 'reduce' })`.
- Walks: home → start-here → lesson-1 → lab → capstone overview → capstone setup → capstone wizard → capstone bootstrap → capstone chat → capstone handoff.
- At each stage, assert that animations either don't run OR complete instantly. Implementation: capture DOM state at t=0 and t=200ms; for animation-bearing elements, assert states are identical (no intermediate animation values).

**AC4 — `tests/e2e/keyboard.spec.ts` keyboard-only navigation across every route**
- Walks the trainee golden path using ONLY keyboard input (Tab, Shift+Tab, Enter, Space, Esc, arrow keys).
- For each route:
  - Tab through every focusable element; assert the focus ring is visible (computed style on `:focus-visible` element has a visible `outline` or `ring-*` value).
  - Assert tab order matches visual order (use `page.locator(':focus')` after each Tab; capture position; assert progressively-later visual position).
- Form inputs (capstone wizard) reachable + completable via keyboard alone.
- Modal dismissal: Esc closes Story 6.5's abort modal + Story 9.2's regenerate modal.
- Dropdown menus (theme toggle <768px): arrow keys navigate, Enter selects.

**AC5 — Manual smoke checklist documented in `branch-protection-notes.md`**
- File: `.github/branch-protection-notes.md` (existing from Epic 1; extended).
- New section "Pre-release manual QA checklist":
  ```markdown
  ## Pre-release manual QA checklist

  Run these manually on a clean cold-clone before each release. Automation can't fully cover them.

  ### Accessibility
  - [ ] **VoiceOver (macOS)** — walk through home → start-here → lesson 1 → capstone setup → first chat phase. Verify every interactive element has a sensible accessible name; verify streaming text + tool-call cards announce; verify status messages announce.
  - [ ] **Color blindness simulation** — open Chrome DevTools > Rendering > Emulate vision deficiencies. Test protanopia, deuteranopia, tritanopia on home (audience tiles), capstone setup (preflight + tool checks), bootstrap (progress + stream stderr), chat (assistant vs error bubbles). Status badges/cards should remain readable; color is not the sole channel.
  - [ ] **Windows High Contrast Mode** — boot a Windows VM (or Win box); run portal; verify focus rings visible; verify borders distinguishable.
  - [ ] **macOS Increase Contrast** — System Settings > Accessibility > Display > Increase Contrast. Verify portal still readable.

  ### Cross-platform
  - [ ] **macOS install** — fresh git clone + npm install + npm run dev; verify <5 minute cold boot (NFR-P1); verify no postinstall failures.
  - [ ] **Linux install** — same.
  - [ ] **Windows-via-WSL2 install** — same.

  ### Themes
  - [ ] **Light mode** — visual review of home + lesson + capstone setup + chat in light mode against the visualizer at `_bmad-output/planning-artifacts/ux-design-directions.html`.
  - [ ] **Dark mode** — same in dark mode.
  - [ ] **Auto mode** — toggle OS dark/light during a session; verify portal follows.

  ### Reduced motion
  - [ ] **macOS Reduce Motion** — System Settings > Accessibility > Display > Reduce motion. Walk through the trainee path; verify no animations run.

  ### Theme flicker
  - [ ] **Hard reload in dark mode** — cmd+shift+R while page is dark; verify no light-mode flash on first paint.

  ### Logo + brand
  - [ ] **Logo present** — `public/brand/logo.svg` exists; renders in header.
  - [ ] **Forkability** — change `--accent` token in `src/app/globals.css`; verify entire portal's accent color flips consistently.
  ```

**AC6 — Visual regression sanity (manual, not gating)**
- Story 11.7 generates a "before vs after" comparison: takes screenshots of each route in light + dark using Playwright's `page.screenshot()`, saves them under `tests/e2e/screenshots/<route>-<theme>.png`.
- Screenshots committed to the repo as a manual reference (not automated regression — gitignored and re-generated per release).
- A `npm run screenshots` script automates the capture; documented in `branch-protection-notes.md`.
- This is NOT automated visual regression (Percy/Chromatic deferred to v1.1 per `ux-design.md` §"Components Deferred to v1.1") — just a captured baseline a reviewer eyeballs.

**AC7 — `cn()` audit + token usage compliance**
- A grep-based test at `tests/unit/token-compliance.test.ts`:
  - Walks all `*.tsx` files in `src/`.
  - Asserts that arbitrary color values like `bg-[#abc]` or `text-[hsl(...)]` don't appear (everything should use semantic tokens like `bg-surface` or `text-accent`).
  - Asserts that pixel-spacing values like `p-[16px]` don't appear (use Tailwind's `p-4` etc.).
  - Asserts no `style={{ color: '...' }}` inline-style hardcoding.
  - Failure: lists offending files + the offending pattern.
  - Allowed exceptions documented in a comment at the top of the test file (e.g., the inline theme-init `<script>` in `layout.tsx` necessarily inlines values).

**AC8 — Lint, typecheck, quad gate clean across the WHOLE app**
- `npm run lint` clean.
- `tsc --noEmit` clean.
- `npm run test:unit` 100% green.
- `npm run test:e2e` 100% green (this is the big one — all the new accessibility/keyboard/reduced-motion specs must pass).
- `npm run lint:links` clean.
- `npm run audit` clean (NFR-S3 — no high-severity findings).

**AC9 — `branch-protection-notes.md` updated**
- The pre-release checklist (AC5) is added.
- The `npm run screenshots` script (AC6) is documented.
- A note linking to `ux-design.md` and `ux-design-directions.html` as the design source-of-truth is added at the top of the file.

## Tasks/Subtasks

- [ ] **Task 1 — Synthetic session fixture (AC1)** — `tests/e2e/fixtures/synthetic-session.ts` utility that sets up SQLite + filesystem state for a representative capstone session.
- [ ] **Task 2 — Accessibility sweep (AC1)** — extend `tests/e2e/accessibility.spec.ts` to cover every golden-path route.
- [ ] **Task 3 — Theme-flicker sweep (AC2)** — extend Story 11.1's spec to cover representative routes in light/dark/auto.
- [ ] **Task 4 — Reduced-motion sweep (AC3)** — extend Story 11.6's spec to walk every route.
- [ ] **Task 5 — Keyboard-only sweep (AC4)** — extend Story 11.1's spec to cover golden path.
- [ ] **Task 6 — Manual checklist (AC5)** — extend `branch-protection-notes.md`.
- [ ] **Task 7 — Screenshot capture script (AC6)** — `npm run screenshots`.
- [ ] **Task 8 — Token compliance test (AC7)** — `tests/unit/token-compliance.test.ts`.
- [ ] **Task 9 — Final quad gate sweep (AC8)** — run full suite; expect clean.

### Review Findings

_To be populated by code review after implementation._

## Dev Notes

**Architecture references:**
- §"Test Strategy" line 333-339 — Playwright for E2E + accessibility + no-egress + adapter integration.

**PRD references:**
- NFR-A1 line 620 — WCAG 2.x AA release gate.
- NFR-A2 line 621 — automated a11y in E2E.
- NFR-S3 line 628 — `npm audit --audit-level=high` blocks merge.
- NFR-R1/R2 lines 636-637 — golden-path E2E + lesson-link integrity.

**Design spec references:**
- §"Responsive Design & Accessibility → WCAG AA conformance plan" — full criteria mapping (AC1).
- §"Responsive Design & Accessibility → Testing Strategy" — automated + manual splits verbatim (AC2-AC6).

**Why this is the LAST Epic-11 story:**

Every route the trainee can reach must exist before the comprehensive sweep can run. The capstone routes (`/capstone/chat/...`, `/capstone/handoff/...`) only exist after Epics 7a/7b/8/9 ship. Running 11.7 earlier would mean the sweep covers only a fraction of the surface; running last means full coverage.

**Why an in-tree token-compliance test rather than ESLint plugin:**

ESLint can lint Tailwind class strings, but our token-compliance check is a small grep — 30 lines vs adding `eslint-plugin-tailwindcss` which would surface many false positives we'd then have to allowlist. Story 11.7's test is cheap to maintain and explicit about what's checked.

**Why screenshots are not automated visual regression:**

Per `ux-design.md` §"Components Deferred to v1.1": Percy/Chromatic add SaaS deps that conflict with NFR-S1; vendored alternatives (e.g., Lost Pixel) are heavier than the value they deliver at our scale. Manual screenshot review with the visualizer as the reference does the job at v1. v1.1 reconsiders.

**Defensible deviations:**
- The accessibility spec uses `wcag2a` + `wcag2aa` rule sets but NOT `best-practice` — best-practice would surface non-WCAG opinions that may not align with our spec. Sticking to AA-as-spec keeps the contract testable + grounded.

**Test approach:**
- Vitest for token-compliance.
- Playwright for accessibility + theme + reduced-motion + keyboard.
- Manual checklist for VoiceOver + color blindness + cross-platform + theme parity + forkability.
- No real-binary integration in this story.

**No-egress / runtime-fs sanity:**
- The QA tests render the production bundle locally; no remote network. NFR-S1 holds.
- `axe-core` is bundled in `@axe-core/playwright`; no remote calls.

## Dev Agent Record

### Implementation Plan

_To be filled in by the dev agent at implementation time._

### Debug Log

_To be filled in by the dev agent during implementation._

### Completion Notes

_To be filled in by the dev agent after the quad gate is clean._

## File List

**Expected new files:**
- `tests/e2e/fixtures/synthetic-session.ts`
- `tests/unit/token-compliance.test.ts`
- `scripts/capture-screenshots.ts` (powers `npm run screenshots`)
- `_bmad-output/implementation-artifacts/11-7-design-system-qa.md` (this file)

**Expected modified files:**
- `tests/e2e/accessibility.spec.ts` (full route coverage)
- `tests/e2e/theme-flicker.spec.ts` (light + dark + auto sweep)
- `tests/e2e/reduced-motion.spec.ts` (composite walk)
- `tests/e2e/keyboard.spec.ts` (composite walk)
- `.github/branch-protection-notes.md` (pre-release checklist + screenshot doc)
- `package.json` (add `screenshots` script)

## Change Log

- 2026-05-08 — Story file authored from `ux-design.md` §"Responsive Design & Accessibility → Testing Strategy" + the design system QA gate.
