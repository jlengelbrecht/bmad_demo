# Story 11.2: `<AudienceCard>` component + home page rewrite

**Epic:** 11 — UI Polish + Theming
**Story Key:** 11-2-audience-cards-and-home-rewrite
**Status:** ready-for-dev

## Story

As the developer landing FR-1.1 (home with three audience entry cards) and the redesign answer to Devbox's three-color tile critique,
I want a `<AudienceCard>` component that renders identical chrome (border, padding, shadow, radius) for all three audiences — differentiated by icon + headline + description + CTA copy ONLY — and a rewritten `/` home page that uses three of them in a 3-column grid above ≥1024px (1-column below),
So that Mira, Priya, Marcus, and Lena all see equal-weight options without one tile dominating by hue, and the visual coherence principle (`ux-design.md` §"Experience Principles → Coherence over flair") becomes the home page's most-visible expression.

**Sequencing:** Lands after Story 11.1 (foundation tokens + design system available). No downstream Epic-11 stories depend on this; can run in parallel with 11.3.

## Acceptance Criteria

**AC1 — `<AudienceCard>` component at `src/components/audience-card.tsx`**
- Server Component (no client interactivity required at v1).
- Props:
  ```ts
  interface AudienceCardProps {
    icon: React.ReactNode;        // typically a lucide-react icon component
    title: string;                 // "Engineer / team trainee"
    description: string;           // body copy
    cta: string;                   // "Start here"
    href: string;                  // /start-here, /stakeholder, /facilitator
  }
  ```
- Renders as `<a href={href}>` per `ux-design.md` §"Component Strategy → `<AudienceCard>`":
  - Container: `rounded-lg border border-border bg-surface p-6 flex flex-col gap-3 transition-all duration-fast ease-out`.
  - Icon container: `w-8 h-8 grid place-items-center bg-surface-sunken border border-border rounded-md text-text-secondary`. Icon SVG inside is sized `w-4 h-4`.
  - Title: `text-lg font-semibold text-text-primary`.
  - Description: `text-sm text-text-secondary leading-relaxed`.
  - CTA row (margin-top auto, pushed to bottom): `text-sm text-accent font-medium inline-flex items-center gap-1`. Trailing `<ArrowRight class="w-3.5 h-3.5 transition-transform duration-fast">` icon.
- Hover state (CSS `:hover` only — no JS):
  - Container: `hover:border-border-strong hover:shadow-md hover:-translate-y-px`.
  - CTA arrow: `group-hover:translate-x-0.5` (uses Tailwind `group` class on the parent).
- Focus-visible: `focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 focus-visible:ring-offset-bg`.
- Touch target: card minimum height 140px ensures ≥44×44 hit area (per WCAG 2.5.5).
- Reduced-motion (per spec): no `-translate-y-px` and no arrow nudge. Tailwind: `motion-safe:hover:-translate-y-px motion-safe:group-hover:translate-x-0.5` — falls through to no-transform when reduced-motion is set.

**AC2 — Three `<AudienceCard>` instances on `/` home page**
- File: `src/app/page.tsx` (existing; rewritten).
- Hero block above the cards:
  - `<h1 class="text-4xl md:text-5xl font-semibold leading-tight tracking-tight text-text-primary">The BMAD training portal that teaches itself.</h1>`
  - `<p class="mt-4 text-lg text-text-secondary leading-relaxed max-w-2xl">Clone the repo. Run <code class="font-mono text-sm bg-surface-sunken border border-border rounded px-1.5 py-0.5">npm run dev</code>. Walk through six lessons, three labs, and a 90-minute capstone where you experience BMAD by chatting through the full artifact chain with your own AI tool.</p>`
- 3-column grid below: `<div class="mt-8 grid gap-4 lg:grid-cols-3">` — at <1024px collapses to 1 column.
- Three cards, each populated:

  | Position | Icon | Title | Description | CTA | Href |
  |---|---|---|---|---|---|
  | 1 | `<Code2>` (lucide) | "Engineer / team trainee" | "The full curriculum + capstone. About three hours, or one half-day workshop. Best fit for anyone shipping code." | "Start here →" | `/start-here` |
  | 2 | `<Clock>` (lucide) | "Stakeholder demo" | "15-minute scripted walk through the contract → enforcement → propagation thesis. Self-serve, no facilitator needed." | "Watch the demo →" | `/stakeholder` |
  | 3 | `<Users>` (lucide) | "Facilitator guide" | "Prep a half-day workshop in under two hours. Per-lesson timing, common questions, lab-format selection — runnable on day one." | "Open the guide →" | `/facilitator` |

- Page wrapper: `<main class="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 pt-12 pb-24">` — matches the architecture's content-width lock (1280px max for application surfaces).
- The page is a Server Component; no `'use client'` directive.
- Existing `<StartCapstoneButton>` and `<AudienceCard>` placeholder mocks (if any) are removed. Pre-existing audience-card source from Story 1.x (the original 3-color tiles) is deleted entirely; Story 11.2's new component replaces it.

**AC3 — Original 3-color audience-card source removed cleanly**
- Story 11.2 explicitly deletes the prior `<AudienceCard>` if it exists (per Epic 1 / Story 1.x naming). The new `src/components/audience-card.tsx` is a fresh implementation; no `git mv` or rename.
- Any references to the old card from `src/app/page.tsx` are replaced with the new import path.
- Tests for the old card are deleted alongside.

**AC4 — Vitest unit coverage at `src/components/audience-card.test.tsx`**
- Renders default state with all four props (icon + title + description + cta + href); asserts each is in the rendered DOM.
- Renders link target correctly: `<a href={href}>`.
- Asserts the title is rendered as the link's accessible name (via `aria-label` OR via the link text containing the title — pick one and lock).
- Asserts the icon container renders the icon prop's content.
- Asserts hover state classes are present (regex match on the rendered `class` attribute for `hover:border-border-strong`).
- Asserts focus-visible ring classes are present.
- Snapshot test for the rendered HTML (one snapshot per the three real instances) so a future refactor can't silently break visual contract.

**AC5 — Vitest unit coverage at `src/app/page.test.ts`**
- Renders the home page (Server Component); asserts the hero `<h1>` is present with the locked copy.
- Asserts three `<AudienceCard>` instances are rendered.
- Asserts the three cards' hrefs are `/start-here`, `/stakeholder`, `/facilitator` in order.
- Asserts NO color tokens that would differentiate the cards individually (loop through the three; assert their `class` attribute has the same `bg-` and `border-` value).

**AC6 — Playwright E2E at `tests/e2e/home-page.spec.ts`**
- Loads `/`. Asserts:
  - Page renders within 2s (NFR-P1 cold-clone proxy; soft assertion).
  - Hero text visible.
  - Three cards visible. Each card's title is announced by accessibility tree (use `page.getByRole('link', { name: /Engineer/ })` etc.).
  - Hovering the first card produces `translate(-1px)` transform on the card AND `translate(2px)` on the inner arrow. Soft assertion (CSS computed style read).
  - Clicking the first card navigates to `/start-here` (which renders `training/00-start-here.md` per existing FR-1.6).
  - Tab key cycles through the three cards in order; each shows focus ring.
  - All three cards meet WCAG AA contrast: invokes `@axe-core/playwright`'s `axe.run()` scoped to the home page; AA violations fail.

**AC7 — Existing tests updated**
- `tests/e2e/golden-path.spec.ts` (Epic 1 surface) — verify the trainee golden path still passes after the home rewrite. The page's content changed but the navigation flow (home → start-here → lessons) is unchanged. Update the `expect(page.locator('h1')).toContainText(...)` assertion to match the new hero text.
- `tests/e2e/accessibility.spec.ts` (Epic 1 surface) — verify a11y sweep still passes against the new home.
- `tests/e2e/no-egress.spec.ts` — verify no-egress still holds (no new remote-asset fetches).

**AC8 — Lint, typecheck, quad gate**
- `npm run lint` clean.
- `tsc --noEmit` clean.
- `npm run test:unit` 100% green.
- `npm run test:e2e` 100% green (existing + new home-page spec).
- `npm run lint:links` clean (the home page links to `/start-here`, `/stakeholder`, `/facilitator` — all lesson-link-integrity-checked).

## Tasks/Subtasks

- [ ] **Task 1 — Audit existing home page** — read `src/app/page.tsx` and `src/components/audience-card.tsx` (or wherever the prior tile component lives). Document existing imports for replacement.
- [ ] **Task 2 — Build `<AudienceCard>` (AC1)** — `src/components/audience-card.tsx`. Use Tailwind utilities + `cn()` from Story 11.1. Forward ref. Server-Component-friendly (no `'use client'`).
- [ ] **Task 3 — Vitest unit cases (AC4)** — render + props + hover-class smoke + snapshot.
- [ ] **Task 4 — Rewrite `src/app/page.tsx` (AC2)** — hero + grid + three cards. Delete reference to old component.
- [ ] **Task 5 — Delete old audience-card source (AC3)** — single commit (or part of Task 4's commit) removing the legacy file + its tests.
- [ ] **Task 6 — Page-level Vitest cases (AC5)** — render + hrefs + no-individual-color.
- [ ] **Task 7 — Playwright spec (AC6)** — new `home-page.spec.ts`.
- [ ] **Task 8 — Update existing tests (AC7)** — golden-path + accessibility + no-egress.
- [ ] **Task 9 — Quad gate clean (AC8)**.

### Review Findings

_To be populated by code review after implementation._

## Dev Notes

**Architecture references:**
- §"Frontend Architecture → Routing topology" line 245 — `/` is the home page; static cards rendered as Server Component.

**PRD references:**
- FR-1.1 line 482 — three differentiated audience entry points.
- FR-1.6 line 487 — stakeholder + facilitator + trainee paths.

**Design spec references** (`_bmad-output/planning-artifacts/ux-design.md`):
- §"Component Strategy → Load-bearing custom components → `<AudienceCard>`" — full anatomy + states + accessibility + reduced-motion contract verbatim (AC1).
- §"Visual Design Foundation → Tailwind config" — color tokens used in the card.
- §"Animation Guidelines → Where Animation Lives" — audience tile hover entry (`fast` duration, `out` easing).
- The visualizer at `_bmad-output/planning-artifacts/ux-design-directions.html` Mockup 1 shows the exact rendered design — devs reference for visual fidelity.

**Why Server Component:**

The three cards have no per-card client state. Server Component renders to static HTML; trainee gets faster first paint; client bundle stays leaner. Hover state is pure CSS (no JS); focus ring is `focus-visible` (also pure CSS). No reason to opt into client rendering.

**Why differentiation by icon + headline + CTA only (no hue):**

Per spec — Devbox explicitly disliked the three-color treatment; it violated coherence-over-flair. Each card is structurally identical; readers parse them as parallel options. Hue-coded cards subtly suggest one is "right" (e.g., the brightest one) which we don't want.

**Why the lucide icons specifically:**

- `Code2` for engineer — universal "code" symbol, not too literal (no laptop, no cursor).
- `Clock` for stakeholder — emphasizes the "15 minutes" time-bounded nature of the demo.
- `Users` for facilitator — emphasizes the team / workshop dimension.

These three are tonally restrained, monochrome by default, and read clearly at the 16px container size. Other candidates considered: `Wrench` (engineer — too tool-specific), `Eye` (stakeholder — too passive), `BookOpen` (facilitator — too school-flavored).

**Defensible deviations:**
- The card's `min-h-[140px]` ensures touch target while ALSO ensuring a stable height when descriptions vary in line count. Without it, a 2-line description card would be visibly shorter than a 3-line one and the grid would look ragged.
- The CTA copy varies per card ("Start here →", "Watch the demo →", "Open the guide →") — different verbs reflect the audience-specific action. Could have been uniform ("Open →") but the variance reinforces audience differentiation through copy, exactly aligned with the spec's principle.

**Test approach:**
- Vitest covers component logic + page composition.
- Playwright covers the rendered DOM + a11y + navigation + hover micro-interaction.
- No integration spec (the cards have no backend dependency).

**No-egress / runtime-fs sanity:**
- No new network calls. NFR-S1 holds.
- Lucide icons are tree-shaken from the npm package (Story 11.1's import); no remote asset fetch.

## Dev Agent Record

### Implementation Plan

_To be filled in by the dev agent at implementation time._

### Debug Log

_To be filled in by the dev agent during implementation._

### Completion Notes

_To be filled in by the dev agent after the quad gate is clean._

## File List

**Expected new files:**
- `src/components/audience-card.tsx`
- `src/components/audience-card.test.tsx`
- `tests/e2e/home-page.spec.ts`
- `_bmad-output/implementation-artifacts/11-2-audience-cards-and-home-rewrite.md` (this file)

**Expected modified files:**
- `src/app/page.tsx` (rewritten)
- `src/app/page.test.ts` (rewritten / extended)
- `tests/e2e/golden-path.spec.ts` (hero-text assertion update)
- `tests/e2e/accessibility.spec.ts` (verify still passes; no functional change)
- `tests/e2e/no-egress.spec.ts` (verify still passes)

**Expected deleted files:**
- `src/components/audience-card.tsx` (Epic 1 / Story 1.x version, if present at this path) AND its colocated `.test.tsx`. NOTE: if the path differs, audit Task 1's findings and delete accordingly.

## Change Log

- 2026-05-08 — Story file authored from `ux-design.md` §"Component Strategy → `<AudienceCard>`" + visualizer Mockup 1 + FR-1.1.
