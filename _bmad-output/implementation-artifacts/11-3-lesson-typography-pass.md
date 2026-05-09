# Story 11.3: Lesson page typography pass + `<LessonNav>` + `<StalenessBanner>` visual updates

**Epic:** 11 — UI Polish + Theming
**Story Key:** 11-3-lesson-typography-pass
**Status:** ready-for-dev

## Story

As the developer landing FR-1.2 + FR-1.5 + NFR-M4 visual treatment against the new design tokens,
I want the lesson + lab pages re-skinned with the locked typography scale (12/14/16/18/20/24/30/36/48px) + spacing + accent + token colors, the `<LessonNav>` sidebar updated to use the new tokens (active state in `accent-subtle` + `accent` text; checks in `success` color; hover in `surface-sunken`), and the existing `<StalenessBanner>` re-skinned to the warning tokens,
So that lesson reading delivers the "density that reads" experience principle — typography hierarchy carries the visual weight, chrome disappears, content is the protagonist.

**Sequencing:** Lands after 11.1 (foundation tokens). Can run in parallel with 11.2.

## Acceptance Criteria

**AC1 — Markdown pipeline applies new typography tokens**
- File: `src/lib/markdown/pipeline.ts` (existing from Epic 1; updated).
- Rendered prose now uses Tailwind classes per `ux-design.md` §"Visual Design Foundation → Typography System":
  - `<h1>`: `text-4xl font-semibold leading-tight tracking-tight text-text-primary` (36px / 1.2)
  - `<h2>`: `text-3xl font-semibold leading-tight text-text-primary mt-12 mb-3` (30px / 1.3)
  - `<h3>`: `text-2xl font-semibold leading-snug text-text-primary mt-8 mb-3` (24px / 1.4)
  - `<h4>`: `text-xl font-semibold text-text-primary mt-6 mb-2`
  - `<p>`: `text-base leading-relaxed text-text-primary mb-4` (16px / 1.625)
  - `<a>`: `text-accent underline-offset-2 hover:underline focus-visible:underline`
  - `<code>` (inline): `font-mono text-sm bg-surface-sunken border border-border rounded px-1.5 py-0.5`
  - `<pre> > <code>` (block): `font-mono text-sm bg-surface-sunken border border-border rounded-md p-4 overflow-x-auto`
  - `<blockquote>`: `border-l-4 border-accent bg-accent-subtle pl-4 pr-3 py-3 my-4 rounded-r-md text-text-primary`
  - `<ul>` / `<ol>`: `pl-6 my-4 space-y-1.5 text-text-primary`
  - `<li>`: `leading-relaxed`
  - `<hr>`: `my-12 border-border`
  - `<table>`: `w-full my-6 border-collapse border border-border rounded-md overflow-hidden`; `<th>` `bg-surface-sunken text-left text-sm font-semibold p-3`; `<td>` `border-t border-border p-3 text-sm`
- Implementation pattern: a single `rehype-class-names` plugin (or equivalent) maps each HTML tag to its Tailwind class string. The plugin is configured in `pipeline.ts` and applied during rehype transformation.
- Existing markdown lesson content (in `training/lessons/*.md`) requires NO modification. The pipeline transforms the same markdown into the new visual treatment.

**AC2 — `<LessonNav>` re-skinned with new tokens**
- File: `src/components/lesson-nav.tsx` (exists from Epic 1; updated).
- Layout per the visualizer Mockup 2 (`ux-design-directions.html`):
  - Wrapper: `<aside class="border-r border-border pr-6">` (left sidebar at ≥`lg`).
  - Section heading: `<h4 class="text-xs uppercase tracking-wide text-text-muted font-semibold mb-3">Curriculum</h4>`.
  - Nav list: `<ul class="space-y-1">`.
  - Each `<li>` renders `<a>` with classes `block px-3 py-1.5 rounded-md text-sm font-medium transition-colors duration-fast`.
  - Default state: `text-text-secondary hover:bg-surface-sunken hover:text-text-primary`.
  - Active state (the lesson the trainee is currently viewing): `bg-accent-subtle text-accent`.
  - Completion check (when `progress` row exists for the lesson): inline `<Check class="w-3.5 h-3.5 mr-2 text-success" />` icon BEFORE the lesson title.
- Active state determined by comparing the current pathname (via Next.js `usePathname`) against each `<li>`'s href. Component is a Client Component (`'use client'`) for the pathname read.
- Completion data is fetched server-side (in the parent Server Component of the lesson route) and passed as a prop `completedLessonIds: string[]` to `<LessonNav>`.

**AC3 — `<LessonNav>` responsive collapse**
- At `<lg` (below 1024px): the sidebar is hidden; instead, a `<DropdownMenu>` button "Lessons" mounts in the page header (or in the lesson layout's top toolbar). Opens a dropdown listing the same nav items.
- Tailwind: `hidden lg:block` on the sidebar; `lg:hidden block` on the dropdown button.
- The dropdown items reuse the same active-state and completion-check rendering as the sidebar.

**AC4 — `<StalenessBanner>` re-skinned**
- File: `src/components/staleness-banner.tsx` (exists from Story 2.5; updated).
- Markup (per `ux-design.md` §"UX Consistency Patterns → Feedback Patterns" → in-context badge):
  ```tsx
  <div role="alert" class="flex items-start gap-3 p-4 mb-6 bg-warning/10 border border-warning/30 rounded-md text-text-primary">
    <AlertTriangle class="w-5 h-5 text-warning shrink-0 mt-0.5" aria-hidden="true" />
    <div class="text-sm">
      <strong class="font-semibold">Last reviewed {reviewedAt}.</strong> This entry is more than 120 days old; the contents may be out of date.
    </div>
  </div>
  ```
- Existing logic from Story 2.5 (date math, threshold check) preserved verbatim. Only the visual treatment changes.
- The banner appears inline above tool-notes content (its existing position; no relocation).

**AC5 — Lesson page layout updated**
- File: `src/app/lessons/[slug]/page.tsx` (exists from Epic 1; updated).
- Layout per visualizer Mockup 2:
  - Two-column grid at `lg`: `<div class="grid lg:grid-cols-[240px_1fr] gap-12">`.
  - Left column: `<LessonNav>`.
  - Right column: `<article class="max-w-3xl">` containing the rendered markdown.
- Page wrapper: `max-w-7xl mx-auto px-4 md:px-6 lg:px-8 pt-12 pb-24` (matches home page).
- Below-the-fold: a "Mark complete / Mark incomplete" affordance (existing from Epic 1; visual treatment uses `<Button variant="primary">` from Story 11.1's foundation).
- "Next lesson →" / "← Previous lesson" navigation links at the bottom of the article: `<div class="mt-16 pt-6 border-t border-border flex justify-between text-sm">`. Each link uses `text-accent hover:underline`.

**AC6 — `/labs/[slug]` page updated similarly**
- File: `src/app/labs/[slug]/page.tsx` (exists from Epic 1).
- Same layout as lesson page (sidebar nav for labs + main article column).
- Lab nav uses the same `<LessonNav>` component pattern but with lab data; alternatively a sibling `<LabNav>` if the label difference matters semantically. Pick one; lock the choice.
- Same typography tokens applied to lab markdown content.

**AC7 — `/start-here`, `/stakeholder`, `/facilitator` pages updated**
- Three single-markdown pages per FR-1.6 / FR-1.7. Each uses the same `<article class="max-w-3xl">` content column with the new typography.
- These pages do NOT use `<LessonNav>` — they're standalone reading surfaces.
- Page wrapper matches the lesson page (max-w-7xl).
- A small "Back to home" link at the top of each page: `<a href="/" class="text-sm text-text-secondary hover:text-text-primary inline-flex items-center gap-1"><ArrowLeft class="w-3.5 h-3.5"/> Back</a>`.

**AC8 — Vitest unit coverage**
- `src/lib/markdown/pipeline.test.ts` (existing) — extend with cases asserting that rendered HTML for each tag produces the expected Tailwind class string.
- `src/components/lesson-nav.test.tsx` — render with mock `completedLessonIds`; assert active state on the matching pathname; assert checks render for completed lessons.
- `src/components/staleness-banner.test.tsx` (existing) — extend with a smoke test verifying the new markup shape (AlertTriangle icon present; warning token classes present).
- `src/app/lessons/[slug]/page.test.ts` — render with a fixture markdown file; assert the article section + sidebar both render; assert the markdown's `<h1>` is in the rendered DOM.

**AC9 — Playwright E2E**
- `tests/e2e/lesson-page.spec.ts` — new spec:
  - Navigate to `/lessons/1-what-is-bmad`.
  - Assert the lesson nav sidebar visible at `lg` viewport.
  - Assert the article content renders.
  - Click a different lesson in the nav; assert navigation works.
  - At `<lg` (768px), assert the sidebar is hidden and the "Lessons" dropdown button is visible.
- `tests/e2e/accessibility.spec.ts` (existing) — extend to cover the lesson page; AA violations fail.
- `tests/e2e/golden-path.spec.ts` (existing) — verify the boot → start-here → lessons walk still passes with the re-skinned UI.
- `tests/e2e/lesson-link-integrity.spec.ts` (existing from NFR-R2) — verify the new pipeline doesn't break relative-link rendering.

**AC10 — Lint, typecheck, quad gate**
- `npm run lint` clean.
- `tsc --noEmit` clean.
- `npm run test:unit` 100% green.
- `npm run test:e2e` 100% green.
- `npm run lint:links` clean (the markdown pipeline changes preserve relative-link behavior; existing link-integrity test verifies).

## Tasks/Subtasks

- [ ] **Task 1 — Markdown pipeline class-names plugin (AC1)** — extend `pipeline.ts` with the Tailwind-class mapping. Vitest cases.
- [ ] **Task 2 — `<LessonNav>` re-skin (AC2, AC3)** — update the component; add the responsive dropdown collapse; preserve existing data-flow (completed-lessons prop).
- [ ] **Task 3 — `<StalenessBanner>` re-skin (AC4)** — markup update; preserve existing date logic.
- [ ] **Task 4 — Lesson page layout (AC5)** — `src/app/lessons/[slug]/page.tsx` update; two-column grid; bottom prev/next.
- [ ] **Task 5 — Lab page layout (AC6)** — same pattern.
- [ ] **Task 6 — Audience-entry pages (AC7)** — `/start-here`, `/stakeholder`, `/facilitator` re-skinned.
- [ ] **Task 7 — Vitest coverage (AC8)**.
- [ ] **Task 8 — Playwright E2E (AC9)**.
- [ ] **Task 9 — Quad gate clean (AC10)**.

### Review Findings

_To be populated by code review after implementation._

## Dev Notes

**Architecture references:**
- §"Frontend Architecture → Markdown pipeline" line 242 — `remark` + `rehype` pipeline; class-names plugin is the natural extension point.
- §"Frontend Architecture → Routing topology" line 245 — `/lessons/[slug]`, `/labs/[slug]` already exist.
- §"Frontend Architecture → Stale-date banner" line 243 — `<StalenessBanner>` Server Component.

**PRD references:**
- FR-1.2 line 484 — six lessons, sequential nav with completion state.
- FR-1.5 line 487 — lesson prose links to relative repo paths.
- NFR-M4 line 645 — staleness banner threshold.

**Design spec references** (`_bmad-output/planning-artifacts/ux-design.md`):
- §"Visual Design Foundation → Typography System" — full type scale + line heights (AC1).
- §"UX Consistency Patterns → Feedback Patterns → in-context badge" — staleness-banner shape (AC4).
- §"UX Consistency Patterns → Navigation Patterns" — sidebar at ≥1024, dropdown below (AC3).
- Visualizer Mockup 2 — exact rendered design.

**Why Server Component for the lesson page (with one Client Component island):**

The lesson markdown is read at request time and rendered to HTML; that's pure Server Component territory. The `<LessonNav>` needs `usePathname()` for the active-state read, so it's a Client Component island. This split means the page's JS bundle stays tiny (only `<LessonNav>` + the lesson-complete button hydrate); markdown content is static HTML.

**Why `rehype-class-names` (or equivalent) over inline className-via-rehype:**

The class-names plugin is a documented rehype convention and well-tested. Inlining className manipulation in a custom rehype handler would re-implement the plugin's logic. If the plugin doesn't exist as a published package, hand-roll a 30-line equivalent and document the choice.

**Defensible deviations:**
- The lesson page article has `max-w-3xl` (768px), distinct from the page wrapper's `max-w-7xl` (1280px). This intentional double-bound preserves the optimal reading width for prose (per typography research, ~70-80 chars per line on body text) while letting the sidebar + content composition still center within the wider page.
- The labs page reuses `<LessonNav>` rather than introducing `<LabNav>`. Rule of three: only one place needs a "labs nav" right now; rename/split if a third surface emerges.

**Test approach:**
- Vitest covers the markdown rendering + component logic.
- Playwright covers the rendered DOM + the sidebar/dropdown responsive collapse + the navigation flows.
- No integration spec.

**No-egress / runtime-fs sanity:**
- All markdown is local; no remote-asset fetches. NFR-S1 holds.
- Lucide icons are tree-shaken from the npm package.

## Dev Agent Record

### Implementation Plan

_To be filled in by the dev agent at implementation time._

### Debug Log

_To be filled in by the dev agent during implementation._

### Completion Notes

_To be filled in by the dev agent after the quad gate is clean._

## File List

**Expected new files:**
- `tests/e2e/lesson-page.spec.ts`
- `_bmad-output/implementation-artifacts/11-3-lesson-typography-pass.md` (this file)

**Expected modified files:**
- `src/lib/markdown/pipeline.ts` (class-names plugin extension)
- `src/lib/markdown/pipeline.test.ts`
- `src/components/lesson-nav.tsx`
- `src/components/lesson-nav.test.tsx` (or `.test.ts`)
- `src/components/staleness-banner.tsx`
- `src/components/staleness-banner.test.tsx`
- `src/app/lessons/[slug]/page.tsx`
- `src/app/lessons/[slug]/page.test.ts`
- `src/app/labs/[slug]/page.tsx`
- `src/app/start-here/page.tsx`
- `src/app/stakeholder/page.tsx`
- `src/app/facilitator/page.tsx`
- `tests/e2e/golden-path.spec.ts` (verify still passes)
- `tests/e2e/accessibility.spec.ts` (extend to lesson page)

## Change Log

- 2026-05-08 — Story file authored from `ux-design.md` §"Visual Design Foundation → Typography" + visualizer Mockup 2 + FR-1.2/1.5 + NFR-M4.
