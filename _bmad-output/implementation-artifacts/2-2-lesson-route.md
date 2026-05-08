# Story 2.2: Lesson route with sequential lesson navigation

**Epic:** 2 — Lesson Navigation & Self-Reference Link Integrity
**Story Key:** 2-2-lesson-route
**Status:** review

## Story

As a trainee working through the curriculum,
I want `/lessons/[slug]` to render the corresponding lesson markdown with a "previous / next" navigation strip showing my position in the six-lesson sequence,
So that I can move through lessons in order, deep-link to any lesson, and use browser back/forward to revisit prior lessons.

## Acceptance Criteria

**AC1 — Lesson route renders markdown via `<Markdown>`**
- `src/app/lessons/[slug]/page.tsx` exists as a Server Component.
- Visiting `/lessons/1-what-is-bmad` (or any valid slug) returns HTTP 200 and renders the markdown via `<Markdown>` from Story 2.1.
- The page is wrapped in a layout that includes the sequential lesson navigation strip.

**AC2 — Sequential navigation: middle of sequence**
- On any lesson 2–5: the strip shows "Previous: Lesson N − 1 — <title>" linking to `/lessons/<prev-slug>` and "Next: Lesson N + 1 — <title>" linking to `/lessons/<next-slug>`.
- The strip shows position in the form "N of 6".

**AC3 — Sequential navigation: lesson 1**
- On lesson 1, the "Previous" affordance is absent (no broken link to lesson 0).
- "Next: Lesson 2 — <title>" is present.

**AC4 — Sequential navigation: lesson 6**
- On lesson 6, "Next" points at `/capstone` if that route exists, or is hidden otherwise.
- The capstone route doesn't exist yet (Epic 4) — Story 2.2 acceptable behavior is hidden Next.
- "Previous: Lesson 5 — <title>" is present.

**AC5 — Single source of truth for the sequence**
- Lesson sequence comes from a single source — `src/lib/lessons/sequence.ts` reading filesystem entries from `training/lessons/*.md`, sorting by leading number prefix.
- The sequence is NOT duplicated across lesson pages.

**AC6 — Browser navigation + keyboard nav**
- Browser back lands on the previous URL (no client-state leak; Server Component rendering).
- Tab order through the page reaches prev/next links + in-content links in a logical order.

**AC7 — Unknown slug 404s**
- Visiting `/lessons/some-nonsense` triggers Next.js's `not-found.tsx`.
- A repo-styled `src/app/not-found.tsx` exists (was scaffold default until this story).

## Tasks/Subtasks

- [x] **Task 1 — Six lesson placeholder files** at `training/lessons/N-slug.md` with frontmatter `title` + `order` + minimal h1 and a one-paragraph placeholder body. Titles derived from PRD (`The artifact chain`, `Stories as tool-agnostic contract`, `CODEOWNERS and the gate`, `Working as a team`) and bookend choices for lessons 1 and 6 (`What is BMAD`, `From lessons to capstone`).
- [x] **Task 2 — `src/lib/lessons/sequence.ts`** — `getLessonSequence()`, `getLessonBySlug(slug)`, `getNeighbors(slug)`. Reads `training/lessons/*.md`, parses frontmatter via `gray-matter`, sorts numerically by leading prefix. Module-level cache + `__resetLessonCacheForTests` for suite hygiene. `import "server-only"` at top.
- [x] **Task 3 — `src/components/lesson-nav.tsx`** — Server Component nav region with `aria-label`, position indicator "Lesson N of M", and prev/next `<Link>`s with descriptive `aria-label`s. Empty state sentinels ("Start of curriculum" / "End of curriculum") for the boundary cases — visible affordances rather than empty space.
- [x] **Task 4 — `src/app/lessons/[slug]/page.tsx`** — async Server Component using `generateStaticParams()` + `generateMetadata()` + `notFound()` for unknown slugs. Renders LessonNav (top), Markdown, LessonNav (bottom) — bottom and top have distinct `aria-label`s for SR clarity.
- [x] **Task 5 — `src/app/not-found.tsx`** — h1 "Not found", brief copy, link back to `/`. `noindex, nofollow` metadata.
- [x] **Task 6 — `src/lib/lessons/sequence.test.ts`** — 8 cases: sort order + titles from frontmatter, getLessonBySlug hit/miss, getNeighbors first/last/middle/unknown.
- [x] **Task 7 — `tests/e2e/lessons.spec.ts`** — 4 cases: lesson 1 boundary (no Prev), lesson 3 middle (Prev=2, Next=4), lesson 6 boundary (no Next), garbage slug → 404.
- [x] **Task 8 — Smoke + lint + finalize** — `test:unit` 22/22 in 271ms, `test:e2e` 10/10 in 3.6s, `lint` clean.

## Dev Notes

**Architecture references** (`_bmad-output/planning-artifacts/architecture.md`):
- §"Routing topology" line ~233: `/lessons/[slug]` → renders `training/lessons/<slug>.md`
- §"Frontend Architecture": Server Components by default; this route is purely server-rendered.
- §FR-1.2 mapping: trainee navigates the six lessons in sequential order.

**Lesson titles** (derived from PRD §"Rising action" + architecture §FR-5 file paths):
- 1 — What is BMAD (placeholder)
- 2 — The artifact chain (per Story 2.2 AC literal)
- 3 — Stories as tool-agnostic contract (per PRD line 167)
- 4 — CODEOWNERS and the gate (per Story 2.2 AC literal + PRD §FR-5.3)
- 5 — Working as a team (per architecture line 709)
- 6 — From lessons to capstone (Lesson-6-leads-to-capstone framing; AC4 says Next can be hidden if `/capstone` doesn't yet exist, so the title doesn't have to commit to capstone phrasing — but it tells the trainee where they're going)

**Sequence sorting:**
Sort by `parseInt(filename.split("-")[0], 10)`. This handles 1–9 in their natural order and would handle 10+ correctly without lexicographic surprises if a v2 ever adds more lessons.

**Test approach:**
- Vitest covers `sequence.ts` (pure-function-of-disk; mocked filesystem via tmpdir fixtures, mirroring the dev-link-check test pattern).
- Playwright covers the route layer: HTTP 200, content presence, prev/next correctness, 404 on garbage slug.

## Dev Agent Record

### Implementation Plan

1. Author six numbered lesson placeholder files with frontmatter titles. Naming: `N-slug.md` where `slug` is derived from the PRD's lesson framing.
2. `sequence.ts` — filesystem-driven, numerically sorted; cached per process; module-scoped cache reset hook for tests.
3. `LessonNav` component — bilateral nav with composite `aria-label`s for SR users and visible sentinels for the boundary cases.
4. `[slug]/page.tsx` route — `generateStaticParams` for SSG; `notFound()` on miss; `generateMetadata` for per-route title.
5. `not-found.tsx` — global 404, plain Server Component.
6. Vitest cases for `sequence.ts`.
7. Playwright cases covering the four AC narratives (lesson 1, lesson 3, lesson 6, unknown slug).
8. Triple gate: lint + unit + e2e.

### Debug Log

- Initial sequence test had a misnamed `beforeAll()` invocation — refactored to a top-level `__resetLessonCacheForTests()` call so the suite is order-independent.
- LessonNav uses sentinels ("Start/End of curriculum") at boundaries instead of hiding nothing — gives keyboard/SR users a consistent landmark on every lesson page.
- Top + bottom nav strips have distinct `aria-label`s (`Lesson navigation (top)` vs `Lesson navigation (bottom)`) so SR rotor doesn't merge them.

### Completion Notes

**ACs satisfied:**
- AC1: `/lessons/1-what-is-bmad` returns 200, renders the markdown via `<Markdown>` (verified by E2E h1 assertion), wrapped in LessonNav layout.
- AC2: middle-lesson (3) E2E asserts both `Previous: Lesson 2 — The artifact chain` and `Next: Lesson 4 — CODEOWNERS and the gate` with correct hrefs + position "3 of 6".
- AC3: lesson 1 E2E asserts the "Start of curriculum" sentinel (no broken link to lesson 0) + visible Next.
- AC4: lesson 6 E2E asserts the "End of curriculum" sentinel (Next is hidden because `/capstone` doesn't exist yet — explicitly allowed by AC).
- AC5: single source of truth lives at `src/lib/lessons/sequence.ts`; consumed only by the route + LessonNav. Filesystem-driven so a new placeholder file with a number prefix automatically slots in.
- AC6: Server Component rendering, no client state. `next/link` provides client-side prefetch for prev/next.
- AC7: `src/app/not-found.tsx` exists; E2E confirms 404 status + h1 "Not found" on a garbage slug.

**Defensible deviations:**
- Lesson 6's "Next" → capstone behavior. AC4 says "points at `/capstone` if route exists, hidden otherwise." `/capstone` doesn't exist (Epic 4). Implementation hides Next via the End-of-curriculum sentinel. When Story 4.x lands the capstone route, LessonNav will need a `nextOverride={{ slug: 'capstone', label: 'Begin capstone' }}` prop or similar; left as a Story-2.2 boundary.
- Title fallback. If a lesson markdown lacks `title` frontmatter, `sequence.ts` falls back to `Lesson N`. AC didn't require frontmatter titles, but the cleanest path to producing accessible nav labels was to make titles a first-class field.

**Open carry-overs from prior reviews:**
- The `cached` Set in `sequence.ts` is module-level — same shape as the dev-link-check warning the previous review patched. Acceptable here because the cache is *invalidating* (filesystem-driven), idempotent, and harmless to share across requests. Test reset hook handles suite isolation.

**Test approach:**
- Vitest for `sequence.ts` (pure-function-of-disk; uses real lesson files as the fixture).
- Playwright for the route layer (HTTP status, h1, position indicator, prev/next presence + hrefs, 404 fallback).

## File List

**New files:**
- `training/lessons/1-what-is-bmad.md`
- `training/lessons/2-the-artifact-chain.md`
- `training/lessons/3-stories-as-tool-agnostic-contract.md`
- `training/lessons/4-codeowners-and-the-gate.md`
- `training/lessons/5-working-as-a-team.md`
- `training/lessons/6-from-lessons-to-capstone.md`
- `src/lib/lessons/sequence.ts`
- `src/lib/lessons/sequence.test.ts`
- `src/components/lesson-nav.tsx`
- `src/app/lessons/[slug]/page.tsx`
- `src/app/not-found.tsx`
- `tests/e2e/lessons.spec.ts`
- `_bmad-output/implementation-artifacts/2-2-lesson-route.md` (this file)

## Change Log
- 2026-05-08 — Story file authored from epics.md §Epic 2 / Story 2.2
- 2026-05-08 — Implementation completed; `test:unit` 22/22, `test:e2e` 10/10, lint clean; status `review`
