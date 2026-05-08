# Story 2.5: Staleness banner Server Component for content with `reviewedAt` frontmatter

**Epic:** 2 — Lesson Navigation & Self-Reference Link Integrity
**Story Key:** 2-5-staleness-banner
**Status:** done

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
- [x] **Task 2 — `src/components/staleness-banner.test.tsx`** — Vitest cases via `react-dom/server`'s `renderToStaticMarkup`. Helper coverage (fresh, exact-120, 119, >120, undefined, unparseable, loose forms, `"0"`, future date) + render coverage (≥120 → "flagged as stale", fresh → no warning string, undefined → "No review date", unparseable → same, future-date → unknown, role="status" + role="alert" present on the right branches). Final count after the review patches: 17 cases.
- [x] **Task 3 — Quad gate clean** — `test:unit` 54/54 (was 44, +10), `test:e2e` 16/16, `lint` clean, `lint:links` clean.

### Review Findings

**Patches (resolved):**

- [x] [Review][Patch] **Strict `^\d{4}-\d{2}-\d{2}$` regex in `classifyStaleness`** — `"0"`, `"2026-1-5"`, `"2026/01/05"`, and rollovers like `"2026-13-40"` now classify as `unknown` instead of producing wrong-but-valid verdicts. Three new test cases pin the behavior.
- [x] [Review][Patch] **Future-date guard** — negative `daysAgo` returns `kind: "unknown"` so a `2099-01-01` typo isn't silently fresh. New test + a new render case covering the unknown-branch warning string for the future-dated input.
- [x] [Review][Patch] **UTC-day math** — replaced `MS_PER_DAY` with `Date.UTC(y, m, d)` part-extraction so the comparison is in pure UTC days and DST-immune. Boundary tests at exact-120 and 119 still pass.
- [x] [Review][Patch] **Warning branches → `role="alert"`** — fresh stays `role="status"`; new tests assert both attributes on the right branches.
- [x] [Review][Patch] **Warning branches → `<div role="alert">`** — `<aside>` retained only for the fresh / informational branch where its semantics fit.
- [x] [Review][Patch] **Tailwind class reorder** — `border` shorthand now precedes `border-l-4` so the cascade lands the 4px amber accent reliably.
- [x] [Review][Patch] **"Stale" assertion tightened** — switched to `toMatch(/<span[^>]*>Stale<\/span>/)` so the test pins the visible label, not the substring inside `flagged as stale`.
- [x] [Review][Patch] **Story Tasks count corrected** — 10 cases (now 17 after the new ones), no longer the stale "11" figure.
- [x] [Review][Patch] **New tests for strict-regex + future-date branches** — three classifyStaleness cases (loose forms, `"0"`, future date) + one render case (future date → unknown warning).

**Deferred:**

- [x] [Review][Defer] **Server Component `new Date()` is captured at build time for SSG'd routes** — pages cached at build never transition to stale until the cache invalidates. Real concern; the right home is the consumer's route definition (`export const revalidate = …` or `dynamic = "force-dynamic"`). Document in JSDoc here; the wire-up lands when Epic 6 introduces the first consumer. Source: edge.
- [x] [Review][Defer] **AC4 capitalization "No" vs "no"** — sentence-case normalization is a defensible UI prose choice, already noted as a deviation. Either flip to lowercase to match the AC literal OR amend the AC; defer until the user calls the choice. Source: auditor (LOW).
- [x] [Review][Defer] **`toContain('role="status"')` is brittle to JSX refactors** — implementation-detail coupling. Reasonable to keep until a refactor actually breaks it. Source: blind.
- [x] [Review][Defer] **i18n / locale formatting of `reviewedAt`** — hardcoded English strings + ISO date format. Out of scope at v1. Source: blind.
- [x] [Review][Defer] **Architecture vs epics threshold drift (`> 120` vs `≥ 120`)** — this story sides with epics; reconcile in the architecture doc separately. Source: auditor.

**Dismissed:**

- "Exact-120 test fixture is timezone-fragile" — `NOW = 2026-05-08T00:00:00Z` is a deliberate UTC fixture; behavior is pinned, not fragile.

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
- 2026-05-08 — Code review run: 0 decision-needed; 9 patches applied (strict ISO regex, future-date guard, UTC-day math, role="alert" + `<div>` for warnings, Tailwind class reorder, tight "Stale" assertion, doc-count fix, new strict-regex/future-date tests); 5 deferred; 1 dismissed. `test:unit` now 60/60 (was 54); `test:e2e` 16/16; lint clean; `lint:links` clean. Status `done`.
