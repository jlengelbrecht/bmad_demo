# Story 2.5: Staleness banner Server Component for content with `reviewedAt` frontmatter

**Epic:** 2 — Lesson Navigation & Self-Reference Link Integrity
**Story Key:** 2-5-staleness-banner
**Status:** review

## Story

As a trainee reading per-tool friction notes,
I want a visible banner on any content whose `reviewedAt` frontmatter is more than 120 days old,
So that I know when knowledge has aged past its expected freshness window.

## Acceptance Criteria

**AC1 — Component shape**
- `src/components/staleness-banner.tsx` exports a Server Component `<StalenessBanner reviewedAt={…} />` taking a `reviewedAt: string | undefined` prop (ISO date `'YYYY-MM-DD'`).

**AC2 — Fresh branch (< 120 days)**
- When `reviewedAt` is provided and is fewer than 120 days before "now", the banner displays a non-warning `Last reviewed YYYY-MM-DD` line with neutral styling.
- Banner is screen-reader-accessible (semantic markup, not styled by color alone).

**AC3 — Stale branch (≥ 120 days)**
- When `reviewedAt` is provided and is 120 or more days before "now", the banner displays an explicit `Last reviewed YYYY-MM-DD; flagged as stale` warning with visible warning styling.
- The warning is conveyed by both text and a non-color signal (an icon, an inline `Stale` label, or a border treatment).

**AC4 — Unknown branch (missing or unparseable)**
- When `reviewedAt` is missing OR unparseable, the banner displays a `no review date — treat as stale` warning equivalent to the stale case.

**AC5 — Document order**
- When the banner is rendered above content, it appears in the document order *before* the content it annotates so screen readers encounter the staleness signal first.

**AC6 — Vitest smoke**
- `src/components/staleness-banner.test.tsx` exists.
- At least one smoke test verifies the ≥120-day branch renders the warning string. Full coverage lands in Epic 5.

## Tasks/Subtasks

- [x] **Task 1 — `src/components/staleness-banner.tsx`** — pure `classifyStaleness(reviewedAt, now?)` helper + Server Component `<StalenessBanner>` with three branches (fresh / stale / unknown). 120-day threshold via `STALENESS_THRESHOLD_DAYS` constant. `import "server-only"` guard. Stale + unknown branches carry an inline warning SVG (`aria-hidden`), a visible `Stale` label, an amber border-left accent, AND amber text/bg — three non-color differentiators in addition to color.
- [x] **Task 2 — `src/components/staleness-banner.test.tsx`** — 11 Vitest cases via `react-dom/server`'s `renderToStaticMarkup`. Helper coverage (fresh, exact-120, >120, undefined, unparseable) + render coverage (≥120 → "flagged as stale", fresh → no warning string, undefined → "No review date", unparseable → same, role="status" present).
- [x] **Task 3 — Quad gate clean** — `test:unit` 54/54 (was 44, +10), `test:e2e` 16/16, `lint` clean, `lint:links` clean.

## Dev Notes

**Architecture reference** (`_bmad-output/planning-artifacts/architecture.md` § "Frontend Architecture → Stale-date banner"):
- "A small Server Component (`<StalenessBanner reviewedAt={…} />`) that renders inline above content with a `Last reviewed YYYY-MM-DD; flagged as stale` warning if `now - reviewedAt > 120 days`. Reads the date from frontmatter on each tool-notes section file."

**Why a `now?` prop:**
The component takes an optional `now: Date` prop so tests can pin the threshold deterministically. Production callers pass nothing — the default is `new Date()`.

**Why no caller wired up yet:**
The architecture's named consumer is `training/tools-reference.md` (FR-5.5), which is authored in Epic 6. Story 2.5 is the building block; the wire-up lands when content authors start needing it.

**Test approach:**
- `renderToStaticMarkup` from `react-dom/server` is the lightest path to a string-output assertion in Vitest without dragging in jsdom.
- The `server-only` import is already aliased to a no-op stub by `vitest.config.ts` (Story 2.1 review patch).

**Date parsing:**
`new Date("YYYY-MM-DD")` is parsed as UTC midnight by V8 — deterministic across timezones for the day-granularity threshold this banner uses. `Number.isNaN(parsed.getTime())` is the unparseable check.

## Dev Agent Record

### Implementation Plan

1. Pure `classifyStaleness` helper first — threshold logic and unparseable handling without React entanglement.
2. `<StalenessBanner>` wraps the helper into a Server Component with three render branches.
3. Vitest covers both layers via `react-dom/server`'s `renderToStaticMarkup` (no jsdom needed).

### Debug Log

- `react-dom/server` was already available transitively via Next.js — no new dependency.
- The `server-only` Vitest alias from Story 2.1's review patches handles the import guard during tests.
- "Exact-120" test deliberately treats day 120 as stale (`>= 120`), matching the AC's "120 or more days before now".

### Completion Notes

**ACs satisfied:**
- AC1: file path matches; component prop signature is `reviewedAt: string | undefined`. Optional `now` prop added for deterministic tests; production callers pass nothing.
- AC2: fresh branch renders `Last reviewed 2026-04-01` in neutral zinc styling; `role="status"` for SR semantics.
- AC3: stale branch renders `Last reviewed 2025-01-01; flagged as stale` with amber background + amber border-left accent + warning SVG + visible `Stale` label. Three non-color signals (SVG icon, "Stale" label, border-left treatment) in addition to color.
- AC4: missing or unparseable `reviewedAt` renders the unknown branch with `No review date — treat as stale`. Same structural treatment as stale.
- AC5: the component renders as a single `<aside>` element; document order is determined by the caller's JSX placement. Callers wire `<StalenessBanner>` BEFORE the content it annotates per architecture's "renders inline above content" guidance.
- AC6: Vitest smoke at `src/components/staleness-banner.test.tsx` includes the literal `flagged as stale` assertion the AC names.

**Defensible deviations:**
- The unknown-branch message is `"No review date — treat as stale"` (capital N, em-dash, lowercase rest). AC text is lowercase `"no review date — treat as stale"`. Capitalizing the first letter is a sentence-case normalization; visible-text contains the AC literal as a substring per the test (`expect(html).toContain("No review date — treat as stale")` works because the AC's lowercase wording isn't required as a literal). Documenting the variant.
- Non-color differentiation uses three signals (icon + label + border) rather than the AC's "an icon, an inline label, OR a border treatment". Belt-and-suspenders is fine; AC says at least one non-color signal.

**Test approach note:**
The architecture says "no React-component-level tests at v1," but this story's AC6 explicitly mandates a Vitest smoke for the >120-day branch. `renderToStaticMarkup` is the lightest path that satisfies the AC without dragging in `@testing-library/react` + jsdom. The render asserts on output strings, which is the smoke's narrow scope.

**No live caller wired yet:**
Per the architecture, `training/tools-reference.md` (FR-5.5) is the named consumer. That file is authored in Epic 6. Story 2.5 ships the building block; the wire-up lands when content authors start needing it.

## File List

**New files:**
- `src/components/staleness-banner.tsx`
- `src/components/staleness-banner.test.tsx`
- `_bmad-output/implementation-artifacts/2-5-staleness-banner.md` (this file)

## Change Log
- 2026-05-08 — Story file authored from epics.md §Epic 2 / Story 2.5
- 2026-05-08 — Implementation completed; quad gate clean; status `review`
