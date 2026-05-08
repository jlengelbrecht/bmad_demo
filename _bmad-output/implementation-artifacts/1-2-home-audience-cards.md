# Story 1.2: Render home page with three audience-entry cards

**Epic:** 1 — Project Foundation & One-Command Boot
**Story Key:** 1-2-home-audience-cards
**Status:** done

## Story

As a trainee, stakeholder, or facilitator visiting the portal for the first time,
I want the home page at `localhost:3000/` to present three differentiated audience-entry cards,
So that I can self-select my path (start-here / stakeholder demo / facilitator guide) without reading any onboarding prose first.

## Acceptance Criteria

**AC1 — Three cards visible**
- Given the running dev server, navigating to `http://localhost:3000/` shows three audience-entry cards
- Each has a distinct title: "Trainee — Start Here", "Stakeholder — 15-minute Demo", "Facilitator — Workshop Guide"
- Each has a short descriptive blurb naming the audience and time investment
- Each is rendered as an accessible link (clickable, keyboard-focusable, has an accessible name)

**AC2 — Cards navigate to expected routes**
- Trainee card → `/start-here`
- Stakeholder card → `/stakeholder`
- Facilitator card → `/facilitator`

**AC3 — Destination routes exist (placeholders OK)**
- `/start-here`, `/stakeholder`, `/facilitator` render either Next.js's default not-found OR a minimal placeholder page (full markdown rendering deferred to Epic 2)

**AC4 — Implementation shape**
- `src/app/page.tsx` is a Server Component
- `src/components/audience-card.tsx` exists; the home page uses it for all three cards (rule-of-three promotion)
- No remote fonts or images — all assets vendored locally

**AC5 — Accessibility & non-color differentiation**
- Semantic markup exposes the audience label to a screen reader (e.g., `<a>` with accessible name, heading-then-blurb structure)
- Color is not the only signal differentiating the three cards — icon, label, or border also differentiates them

## Tasks/Subtasks

- [x] **Task 1 — Add the `AudienceCard` component (AC4)**
  - [x] `src/components/audience-card.tsx` is a Server Component
  - [x] Props: `href`, `title`, `blurb`, `audience`, `timeInvestment`, `accent`, `icon`
  - [x] Whole card is one `<a>` with `aria-label="<audience>: <title> — <timeInvestment>"`
  - [x] Tailwind utilities + inline SVG glyphs (no external image hosts)

- [x] **Task 2 — Replace `src/app/page.tsx` with the audience-card grid (AC1, AC2)**
  - [x] Default boilerplate removed
  - [x] Three `<AudienceCard>` renderings with locked titles/hrefs/accents
  - [x] Page is a Server Component (no `"use client"`)
  - [x] `<main>` + `<h1>BMAD Demo</h1>` + tagline + `<section aria-label="Choose your path">`

- [x] **Task 3 — Drop the create-next-app metadata + body font fix (AC4)**
  - [x] `metadata.title` = `BMAD Demo — Training Portal`, `metadata.description` updated
  - [x] `globals.css` body `font-family: var(--font-sans), system-ui, -apple-system, sans-serif;` (resolves the Geist-vs-Arial Story-1.1 code-review item)

- [x] **Task 4 — Placeholder destination routes (AC3)**
  - [x] `src/app/start-here/page.tsx`
  - [x] `src/app/stakeholder/page.tsx`
  - [x] `src/app/facilitator/page.tsx`
  - [x] Each placeholder uses `next/link` for the back link (per `@next/next/no-html-link-for-pages`)

- [x] **Task 5 — Vendor icon assets locally (AC4)**
  - [x] Icons are inline `<svg>` in `page.tsx` — no external image host, no `public/icons/` needed
  - [x] No new fonts added; existing Geist via `next/font/google` (build-time vendored) per architecture

- [x] **Task 6 — Smoke test (AC1, AC2, AC3, AC5)**
  - [x] `curl http://localhost:3000/` → HTTP 200; body contains all three titles
  - [x] `curl http://localhost:3000/start-here` → HTTP 200
  - [x] `curl http://localhost:3000/stakeholder` → HTTP 200
  - [x] `curl http://localhost:3000/facilitator` → HTTP 200
  - [x] Verified in rendered HTML: three accent borders (`border-emerald-500`, `border-sky-500`, `border-amber-500`), three correct `href`s, four `aria-label`s, `<h1>BMAD Demo</h1>` on home, per-page `<h1>` on placeholders, no `http(s)://` URLs in rendered HTML

- [x] **Task 7 — Lint + File List + Completion Notes**
  - [x] `npm run lint` clean (after switching placeholder back-links to `next/link`)
  - [x] File List + Completion Notes populated
  - [x] Status set to `review`

### Review Findings

**Patches (resolved):**

- [x] [Review][Patch] **`AudienceCard` switched to `next/link`** — `<a>` → `<Link>`; preserves prefetch + client-side routing; matches placeholder convention.
- [x] [Review][Patch] **Body font fallback chain hardened** [`src/app/globals.css:26`] — now `var(--font-sans, var(--font-geist-sans, system-ui)), system-ui, -apple-system, sans-serif`. Geist degrades cleanly through Tailwind v4 `@theme inline` indirection AND through the raw `next/font` variable AND finally to system-ui.
- [x] [Review][Patch] **Composite `aria-label` redundancy fixed** — dropped audience prefix; now `${title} (${timeInvestment})`. Verified rendered HTML: `aria-label="Trainee — Start Here (~3 hours · self-paced)"` etc.
- [x] [Review][Patch] **Per-route metadata on placeholders** — each placeholder exports `Metadata` with a distinct title and `robots: { index: false, follow: false }`. Verified: `<title>Trainee — Start Here · BMAD Demo</title>` and `<meta name="robots" content="noindex, nofollow"/>`.

**Deferred (real but out-of-Story-1.2 scope):**

- [x] [Review][Defer] **`<h2>` inside `<a>` with `aria-label` override** — `aria-label` becomes the link's accessible name, but heading-jump SR navigation still announces the bare title without time/blurb. Refine when axe + a11y stories land in Epic 5. Source: blind+edge.
- [x] [Review][Defer] **Dark-mode badge contrast may dip below 4.5:1** — `dark:bg-{accent}-900/40` + `dark:text-{accent}-200`. Verify via axe in Epic 5; bump alpha or text variant if it fails. Source: edge.
- [x] [Review][Defer] **`focus-visible:outline-current` may have weak contrast on certain bgs** — currently fine on the white/dark-zinc card backgrounds (text vs bg passes), but Epic 5 axe should verify. Source: blind+edge.
- [x] [Review][Defer] **Three placeholder pages are near-identical copy-paste** — rule-of-three says extract; Epic 2 replaces all three with markdown rendering, so extracting now is YAGNI. Source: blind.
- [x] [Review][Defer] **`next/font/google` vs architecture "no Google Fonts CDN / vendored locally"** — re-raised by auditor (MED); deferred from Story 1.1; verification lands with Epic 5 no-egress E2E. Source: auditor+edge.
- [x] [Review][Defer] **No `not-found.tsx`, no trailing-slash policy, case-sensitivity** — Next.js defaults handle 404 ungracefully; future-story concern. Source: edge.
- [x] [Review][Defer] **AudienceCard nested-interactive landmine for future** — if a future story adds a button inside the card, the whole-card-as-link pattern fails. Refactor when that need arrives. Source: edge.
- [x] [Review][Defer] **Mixed em-dash encoding in `page.tsx` (`&mdash;`/`&rsquo;` vs literal `—`)** — cosmetic; can normalize during the next content pass. Source: blind.
- [x] [Review][Defer] **Stale `public/*.svg` files from scaffold (`next.svg`, `vercel.svg`, etc.)** — unreferenced; safe to remove; defer cleanup pass to a follow-up commit. Source: auditor.

**Dismissed:**

- "Story claims 4 `aria-label`s but only 3 exist" — actual count is 4 (section's `aria-label="Choose your path"` + 3 cards). Auditor missed the section.
- "`aria-hidden` boolean without value" — React JSX emits this as the canonical truthy value; modern SRs treat it correctly.
- "`HomePage` removed outer wrapping `<div>` with `bg-zinc-50 dark:bg-black`" — intentional design simplification; body bg is set via `globals.css` and `var(--background)`.
- "`accent` is a string union but not validated at runtime" — TS protects, internal call site only, no untrusted input reaches it.
- "`flex-1` on `<main>` with no flex parent shown" — body in `layout.tsx` IS `flex flex-col`; `flex-1` works.
- "Smoke test 'no `http(s)://` URLs in rendered HTML' is unverifiable" — claim is true for the grep that ran; not asserting beyond that.

## Dev Notes

**Architecture references** (`_bmad-output/planning-artifacts/architecture.md`):
- §"Frontend Architecture": Server Components by default; client components only for interactivity (none needed here)
- §"Routing topology": `/` (home) + `/start-here`, `/stakeholder`, `/facilitator` map directly to `training/*.md` (rendering lands in Epic 2; this story only needs placeholder routes)
- §"Frontend Architecture → Fonts and assets": all fonts and assets vendored locally — NFR-S1 (no runtime egress)

**Code-review carry-overs from Story 1.1** (addressed here):
- `metadata.title = "Create Next App"` and "Generated by create next app" description → updated in Task 3
- `globals.css` body `font-family: Arial, ...` not actually applying the loaded Geist → fix in Task 3
- Default scaffold `page.tsx` boilerplate → replaced in Task 2

**Test approach:**
No Vitest/Playwright frameworks yet (Epic 5). Smoke tests are HTTP 200 + grep for expected card titles in rendered HTML. This is intentional; proper component tests + Playwright a11y land later.

**Boring-tech notes:**
- No client components for this story (Server Components handle everything)
- No state management (static page)
- No design-system library — Tailwind utilities only

## Dev Agent Record

### Implementation Plan

1. Build `src/components/audience-card.tsx` as a Server Component. Single `<a>` wrapping the whole card; `aria-label` composes audience + title + time so screen readers get a complete name. Three accent variants drive border color + badge styling, paired with an audience-name badge so color is never the sole differentiator.
2. Replace `src/app/page.tsx` with a `<main>` + `<h1>` + tagline + 3-column responsive grid of `<AudienceCard>` instances. All three audiences hard-coded per AC's locked titles.
3. Update `src/app/layout.tsx` metadata to match the project (resolves Story-1.1 code-review item).
4. Update `src/app/globals.css` body font to use the Geist variable (resolves Story-1.1 code-review item).
5. Stub three placeholder pages at `/start-here`, `/stakeholder`, `/facilitator` so the cards have somewhere to land. Each uses `next/link` back to home for lint compliance.
6. Smoke-test: HTTP 200 on all four routes; grep rendered HTML for card titles, accent classes, hrefs, aria-labels, h1s.
7. `npm run lint`.

### Debug Log

- First lint pass: 3 errors from `@next/next/no-html-link-for-pages` (placeholder pages used `<a href="/">`). Fixed by switching to `<Link>` from `next/link`.
- All four routes return HTTP 200. Tailwind v4 + minimal `tailwind.config.ts` from Story 1.1 still warns at boot about MODULE_TYPELESS_PACKAGE_JSON — cosmetic, no functional impact.

### Completion Notes

**ACs satisfied:**
- AC1: Three cards render at `/`. Titles match exactly: `Trainee — Start Here`, `Stakeholder — 15-minute Demo`, `Facilitator — Workshop Guide`. Each has audience badge + blurb + time-investment line. Whole card is one `<a>` with composite `aria-label`.
- AC2: Cards link to `/start-here`, `/stakeholder`, `/facilitator` — all verified in rendered HTML.
- AC3: All three destination routes render an HTTP 200 placeholder with `<h1>` + body + back link.
- AC4: `page.tsx` is a Server Component (no `"use client"`); `audience-card.tsx` is reused for all three cards (rule-of-three promotion); icons are inline SVG (vendored, no external host); fonts are Geist via `next/font/google` (build-time vendored — runtime self-hosted, NFR-S1 compatible).
- AC5: Each card has an audience-name badge ("Trainee" / "Stakeholder" / "Facilitator"), a unique inline icon, and a unique border color — three non-color differentiators in addition to color. `aria-label` exposes the audience name to screen readers explicitly.

**Code-review carry-overs from Story 1.1 — resolved here:**
- Default `metadata.title = "Create Next App"` → now `BMAD Demo — Training Portal`.
- Default boilerplate description → updated to a one-line project blurb.
- `globals.css` body `font-family: Arial, ...` not using the loaded Geist → now `var(--font-sans), system-ui, -apple-system, sans-serif;`.
- Default `page.tsx` boilerplate → fully replaced.

**Defer carry-overs still open** (originally from Story 1.1, still relevant):
- AGENTS.md customization → Epic 6.
- tsconfig + eslint excludes for non-app dirs → Epic 6.
- `next-env.d.ts` typecheck-before-build, port-3000 hardcode, capstone gitignore glob → Epic 5.
- `next/font/google` build-time fetch verification → Epic 5 no-egress test.

**Test approach note:** Same as Story 1.1 — Vitest/Playwright frameworks land in Epic 5. Smoke verification here is `curl` + grep against rendered HTML.

## File List

**New files:**
- `src/components/audience-card.tsx`
- `src/app/start-here/page.tsx`
- `src/app/stakeholder/page.tsx`
- `src/app/facilitator/page.tsx`
- `_bmad-output/implementation-artifacts/1-2-home-audience-cards.md` (this file)

**Modified files:**
- `src/app/page.tsx` (boilerplate → audience-card grid)
- `src/app/layout.tsx` (metadata title/description)
- `src/app/globals.css` (body font-family uses `var(--font-sans)`)

## Change Log

- 2026-05-07 — Story file authored from epics.md §Epic 1 / Story 1.2
- 2026-05-07 — Implementation completed; lint clean; HTTP 200 on all four routes; status set to `review`
- 2026-05-07 — Code review run: 0 decision-needed; 4 patches applied (Link migration, font fallback chain, aria-label cleanup, per-route placeholder metadata); 9 deferred to `deferred-work.md`; 6 dismissed. Re-smoke + re-lint clean. Status set to `done`.

