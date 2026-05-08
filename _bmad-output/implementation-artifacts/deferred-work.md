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

## Deferred from: code review of 2-1-markdown-pipeline (2026-05-08)

- **`rehype-stringify` `allowDangerousHtml: true`** re-opens raw-HTML emission for non-pretty-code plugins; current chain is safe and the `<script>` regression test covers the boundary. Re-evaluate if a plugin that uses `raw` nodes is added.
- **Pipeline rebuilt per call** — Shiki re-init cost under concurrency. Revisit when a perf pass surfaces it.
- **AC3 WCAG AA contrast claim asserted, not measured** — Epic 5 axe + manual contrast pass on rendered code blocks.
- **Dark-themed code in light-mode page** — visual design call; revisit when Story 2.2/2.3 surfaces actual lesson rendering.
- **AC2 universal h1–h6 only tested for h2** — `rehype-slug`'s contract is universal; expand coverage cheaply if/when the universal claim becomes load-bearing.
- **Frontmatter shape may be array/scalar** — current `as Record<string, unknown>` cast lies for non-object frontmatter. Tighten with a runtime shape check when Story 2.5 (staleness banner) consumes the field.
- **`Markdown` component discards parsed frontmatter** — Story 2.5 needs the seam; expose then.
- **rehype-slug collision suffixes `-1`/`-2` shift on heading reorder** — link-integrity stability concern; surface a warning in Story 2.4's static link scan.
- **Case-insensitive FS bugs in `dev-link-check`** — Story 2.4's static link scan owns the cross-platform contract; the dev-mode helper is best-effort.
- **`dev-link-check` skipped during `next build`** — Story 2.4 owns CI/build-time link integrity.
- **No warning when inline HTML is silently stripped from markdown** — minor authoring-feedback gap; queue for the same dev-mode helper pass.
- **Empty href `[a]()` slips through dev-link-check silently** — minor; queue with the previous item.

## Deferred from: code review of 2-2-lesson-route (2026-05-08)

- **`generateMetadata` returns "Lesson not found" title for unknown slugs** — covered by global `not-found.tsx` metadata in practice; cosmetic.
- **Vitest sequence tests couple to the real production fixture** (`toHaveLength(6)`, literal slugs) — refactor to a tmpdir fixture when the suite grows.
- **404 e2e brittle to Next.js dev overlay** — passes against `next dev` today; revisit if e2e config switches to `next build && next start`.
- **`generateStaticParams` SSG export-mode caveat** — pure SSG export wouldn't pick up post-build lesson additions; project doesn't use `output: 'export'`.
- **Lesson contiguity / duplicate-number validation** — silent on `[1,2,3,5,6]` (missing 4) or two `3-*.md` files; Story 2.4's static link-integrity scan is the right home.
- **`FILENAME_PREFIX` regex captures slug suffix unused** — minor dead code; cleanup pass.
- **`LESSONS_DIR` resolved against `process.cwd()`** — works for current single-package layout; revisit if monorepo split happens.
- **Top + bottom nav landmarks duplicate links** — distinct `aria-label`s mitigate; deeper a11y refinement is Epic 5 axe work.
- **`/lessons/[slug]/not-found.tsx` could surface "did you mean…?"** — UX improvement, not a correctness gap.
- **AC2 visible text "2. The artifact chain" vs AC literal "Lesson 2 — The artifact chain"** — `aria-label` carries the AC literal verbatim; visible text is a stylization choice.
- **Slug not validated against an explicit allowlist before any fs use** — current code is safe (cache lookup); harden if a future refactor derives paths from URL input.

## Deferred from: code review of 2-3-audience-and-lab-routes (2026-05-08)

- **`loadContent` is synchronous + no `React.cache` / `unstable_cache`** — re-reads on every request; perf pass when load surfaces.
- **`getLabSlugs()` has no direct unit test** — same shape as `getLessonSequence()` coverage; aligns with the Story 2.2 precedent.
- **`getLabSlugs()` `LABS_DIR` was previously captured at module import time** — the Story 2.3 review patches move the path computation INTO the function, but the `LESSONS_DIR` in `src/lib/lessons/sequence.ts` still has the original module-scope shape. Track unifying when convenient.
- **Empty-body markdown silently ships a blank route** — Story 2.4's static link-integrity scan is the right home.
- **`rehype-autolink-headings` `#` text node read by screen readers** — already deferred from Story 2.1; Epic 5 axe will surface.
- **`gray-matter` parses the same source twice per request** (once in `generateMetadata`, once in `<Markdown>`) — perf concern; revisit alongside the caching pass.
- **AC5 only one nonsense slug tested** — adequate per the auditor's LOW grade.

## Deferred from: code review of 2-4-link-integrity-scan (2026-05-08)

- **Extension-less link `[X](./README)` not probed for `.md` fallback** — GitHub-style implicit-extension matching is ambiguous; `existsSync` matching the verbatim path matches the AC literal. Revisit if the curriculum starts using ext-less links.
- **Case-insensitive FS skew (macOS APFS vs Linux ext4)** — same shape across all link-checking helpers. Address alongside Epic 5's cross-platform CI matrix.
- **No Vitest assertion of stdout-summary string or stream-split for the CLI** — live-tree smoke covers it; format string isn't AC-mandated verbatim.
- **Failure-path summary doesn't print `linksScanned`** — cosmetic; defer the format polish.
- **Embedded raw HTML `<a href>` / `<img src>` in markdown not extracted** — remark parses these as `html` nodes; visit on `link/image/definition` skips them. Curriculum is plain-markdown by convention; document explicitly if curriculum ever leans on inline HTML.
