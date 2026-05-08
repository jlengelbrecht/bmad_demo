# Deferred Work

## Deferred from: code review of 1-1-scaffold-nextjs-app (2026-05-07)

- **Default home page boilerplate** (`src/app/page.tsx`, `src/app/layout.tsx`, `src/app/globals.css` Geist-vs-Arial mismatch, `metadata.title = "Create Next App"`) — Story 1.2 replaces the home page with three audience-entry cards.
- **AGENTS.md placeholder content** (refs `node_modules/next/dist/docs/` which doesn't ship in npm package) — Epic 6 customizes AGENTS.md per AC7.
- **tsconfig + eslint exclude/ignore for `_bmad/`, `_bmad-output/`, `training/`** — preventive; address when curriculum content lands in Epic 6.
- **`.gitignore` glob `_bmad-output/capstone/[0-9]*/` brittleness** — works for UTC-timestamp session ids per architecture; re-validate when Capstone harness lands in Epic 4.
- **`next/font/google` build-time fetch vs NFR-S1** — `next/font` self-hosts at runtime so NFR-S1 holds; verify in Epic 5 no-egress E2E test.
- **Port 3000 hardcoded in AC2 smoke** — `next dev` auto-fallback to 3001+ would silently skip the smoke; address in Epic 5 CI tests.
- **`next-env.d.ts` references types generated only after first `next dev`/`next build`** — affects clean-clone `tsc --noEmit` in CI; resolve in Epic 5 by running `next build` once before typecheck.

## Deferred from: code review of 1-2-home-audience-cards (2026-05-07)

- **`<h2>` inside `<a>` with `aria-label` override** — heading-jump SR nav announces bare title without time/blurb; refine in Epic 5 a11y work.
- **Dark-mode badge contrast** (emerald/sky/amber 900/40 + 200 text) may dip below 4.5:1 — verify with axe in Epic 5; adjust alpha or text variant if it fails.
- **`focus-visible:outline-current`** weak-contrast risk in some bg combinations — verify with axe in Epic 5.
- **Three placeholder destination pages are near-identical copy-paste** — rule-of-three would say extract; Epic 2 replaces them with markdown rendering, so extraction now is YAGNI.
- **`next/font/google` vs architecture "no Google Fonts CDN / vendored locally"** — already deferred from Story 1.1; re-raised here by Acceptance Auditor as MED; Epic 5 no-egress E2E will catch.
- **No `not-found.tsx`, no explicit trailing-slash policy, route case-sensitivity** — Next.js defaults 404 ungracefully; future-story.
- **AudienceCard whole-card-link locks out nested interactive elements** — if a future story adds a button inside the card, the pattern needs a refactor (e.g., card-link with `::after` trick).
- **Mixed em-dash encoding in `page.tsx`** (`&mdash;`/`&rsquo;` vs literal `—`) — cosmetic; normalize during next content pass.
- **Stale `public/*.svg` files from scaffold** (`next.svg`, `vercel.svg`, `globe.svg`, `window.svg`, `file.svg`) — unreferenced; remove in a cleanup commit.

## Deferred from: code review of 1-3-readme-author (2026-05-08)

- **README install command rendered multi-line vs the AC's chained one-liner** — multi-line is more readable; AC says "documents the install path," not "verbatim string." LOW.
- **macOS / Windows-via-WSL2 platform claim unverified** — Epic 5 owns the cross-platform install checklist + CI matrix.
- **Node 22 LTS compatibility unverified** — defer real verification to Epic 5 CI matrix.
- **README repo-structure block omits dotfiles + conventional Node configs** — block is "key entries for curriculum"; non-essential entries elided. Defer if a complete tree is desired.
- **Bus-factor disclosure names v1.1 plan elements without linking a tracker** — tracker doesn't exist yet (post-v1).
- **PRD pointer is to file root, not a `#scope` anchor** — PRD lacks a stable scope-section heading suitable for anchoring.
- **"Epic 6" wording on `training/tools-reference.md` reference (line 41)** — minor public-facing jargon; cosmetic next pass.
