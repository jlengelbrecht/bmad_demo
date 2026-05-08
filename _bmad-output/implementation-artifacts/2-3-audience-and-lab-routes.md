# Story 2.3: Audience-entry routes and lab route render their markdown

**Epic:** 2 — Lesson Navigation & Self-Reference Link Integrity
**Story Key:** 2-3-audience-and-lab-routes
**Status:** done

## Story

As a stakeholder, facilitator, trainee, or workshop attendee following a deep link,
I want `/start-here`, `/stakeholder`, `/facilitator`, and `/labs/[slug]` to each render their respective markdown file via the pipeline,
So that the three audience entry points and any lab can be reached directly by URL without going through the lesson sequence.

## Acceptance Criteria

**AC1 — `/start-here` renders `training/00-start-here.md`**
- Visiting `/start-here` returns HTTP 200 and renders the markdown via `<Markdown>` from Story 2.1.

**AC2 — `/stakeholder` renders the stakeholder demo script (no lesson nav)**
- Visiting `/stakeholder` returns HTTP 200 and renders `training/stakeholder-demo-script.md` via `<Markdown>`.
- The page does NOT include the lesson sequential-navigation strip — stakeholders are not on the lesson sequence.

**AC3 — `/facilitator` renders the facilitator guide**
- Visiting `/facilitator` returns HTTP 200 and renders `training/facilitator-guide.md` via `<Markdown>`.

**AC4 — `/labs/[slug]` renders lab markdown**
- A lab markdown at `training/labs/solo.md` is rendered at `/labs/solo` via `<Markdown>` with HTTP 200.

**AC5 — Unknown lab slug 404s**
- Visiting `/labs/some-nonsense` triggers Next.js's `not-found.tsx`.

**AC6 — Server Components + shared loader**
- Each route is a Server Component file at the path expected by the App Router (`src/app/start-here/page.tsx`, `src/app/stakeholder/page.tsx`, `src/app/facilitator/page.tsx`, `src/app/labs/[slug]/page.tsx`).
- All four read their markdown source through a single shared helper at `src/lib/markdown/load-content.ts` so file-loading conventions stay consistent.

## Tasks/Subtasks

- [x] **Task 1 — Audience-entry markdown** — replaced stale `00-start-here.md` (had a `create an account` line that contradicted the no-auth architecture lock + references to fictional `lab-instructions/` and `../content/lessons/` paths) with a clean placeholder consistent with the lesson placeholders. Created `stakeholder-demo-script.md` + `facilitator-guide.md` as fresh placeholders. All three carry frontmatter `title:` and an h1 that matches the audience-card title (so deep-link → audience-card stays consistent).
- [x] **Task 2 — Lab stubs** — `training/labs/{solo,sync,async-story-review}.md` authored with frontmatter titles per the architecture's three named labs.
- [x] **Task 3 — `src/lib/markdown/load-content.ts`** — `loadContent(relPath)` returns `{ source, sourcePath }` (absolute) or `null`. `import "server-only"` guard.
- [x] **Task 4–6 — Audience routes rewritten** — `start-here/`, `stakeholder/`, `facilitator/` all now read their markdown via `loadContent` and render via `<Markdown>`. Robots `noindex, nofollow` metadata removed — these are real audience pages now, not placeholders.
- [x] **Task 7 — `/labs/[slug]/page.tsx`** — Server Component with `generateStaticParams` (driven by a small `src/lib/labs/sequence.ts` helper that scans `training/labs/*.md`), `generateMetadata` reading frontmatter title with fallback, `notFound()` on miss.
- [x] **Task 8 — `load-content.test.ts`** — 3 Vitest cases via tmpdir fixtures: hit returns `{ source, sourcePath: <absolute> }`, miss returns `null`, sourcePath resolution against `process.cwd()`.
- [x] **Task 9 — E2E updates** — `home.spec.ts` placeholder-route tests renamed to "audience-entry routes (Story 2.3)" and switched from `toHaveText` → `toContainText` (the markdown pipeline prepends a `#` autolink anchor inside h1, so exact match no longer holds). `noindex, nofollow` assertions dropped. New `audience-and-labs.spec.ts`: 3 lab-slug 200 tests, 1 unknown-lab 404 test, 1 regression guard that `/stakeholder` does NOT contain a `Lesson N of M` position indicator (AC2).
- [x] **Task 10 — Triple gate** — `test:unit` 25/25 (was 22), `test:e2e` 16/16 (was 11), lint clean.

### Review Findings

**Patches (resolved):**

- [x] [Review][Patch] **Path-traversal defense — two layers landed (HIGH)** — `loadContent` now rejects any resolved path that doesn't stay under `process.cwd()` via a `startsWith(root + path.sep)` containment check. Independently, `/labs/[slug]/page.tsx` validates slug against `getLabSlugs()` allowlist BEFORE calling `loadContent`. Both `LabPage` and `generateMetadata` apply the allowlist guard. New Vitest case proves the helper's containment guard refuses a relative path that escapes the root.
- [x] [Review][Patch] **`existsSync` + `readFileSync` TOCTOU collapsed** — `loadContent` is now single-syscall: `try { readFileSync } catch (ENOENT → null; else rethrow)`.
- [x] [Review][Patch] **`generateMetadata` wraps `matter()` in try/catch** — bad-frontmatter lab degrades to the slug-derived fallback title rather than 500ing the route.
- [x] [Review][Patch] **`getLabSlugs()` filename regex tightened** — now `/^[a-z0-9][a-z0-9-]*\.md$/i` plus `withFileTypes` + `entry.isFile()` so dotfiles, AppleDouble files, directories named `foo.md`, and editor backups are excluded.
- [x] [Review][Patch] **Vitest `process.chdir` → `vi.spyOn(process, "cwd")`** — eliminates the worker-thread cwd race.
- [x] [Review][Patch] **Global not-found e2e assertion switched to `toContainText`** — consistent with the rest of this diff's heading-assertion policy.
- [x] [Review][Patch] **`/stakeholder` no-lesson-nav guard now structural** — `getByRole("navigation", { name: /Lesson navigation/ })` asserts count 0 against LessonNav's `aria-label`. Belt-and-suspenders: the literal label-text count assertion is kept too.
- [x] [Review][Patch] **`getLabSlugs()` warns on unexpected `readdirSync` errors** — ENOENT continues to silently return `[]` (expected when there's no labs dir yet); other errors surface a dev warning.

**Deferred:**

- [x] [Review][Defer] **`loadContent` is synchronous and re-reads on every request — no `React.cache` / `unstable_cache`** — perf pass; revisit when load surfaces. Source: blind.
- [x] [Review][Defer] **`getLabSlugs()` has no direct unit test** — same shape as `getLessonSequence`'s coverage; deferred per Story 2.2 precedent. Source: auditor (LOW).
- [x] [Review][Defer] **`getLabSlugs()` `LABS_DIR = path.join(process.cwd(), …)` captured at module import time** — cwd drift between import and call breaks silently. Same shape as the `LESSONS_DIR` issue already deferred in Story 2.2 review. Track together. Source: edge.
- [x] [Review][Defer] **Empty-body markdown silently ships a blank route** — Story 2.4's static link/integrity scan is the right home for content-health checks. Source: edge.
- [x] [Review][Defer] **`rehype-autolink-headings` `#` text node is announced by screen readers** — already deferred from Story 2.1; Epic 5 axe will surface. Source: blind.
- [x] [Review][Defer] **`gray-matter` parses the same source twice per request (once in `generateMetadata`, once in `<Markdown>`)** — perf concern, not correctness; revisit alongside the caching pass. Source: blind.
- [x] [Review][Defer] **AC5 only one nonsense slug tested** — adequate per the auditor's own LOW grade; defer expansion until needed. Source: auditor (LOW).

**Dismissed:**

- "Frontmatter rendered into page body if `<Markdown>` doesn't strip it" — false positive; `<Markdown>` calls `parseFrontmatter` and renders only the body (verified in Story 2.1).
- "`generateStaticParams` return type sync vs `Promise<params>` page signature" — Next.js supports both; the inconsistency is cosmetic.

## Dev Notes

**Architecture references** (`_bmad-output/planning-artifacts/architecture.md`):
- §"Routing topology": `/start-here` → renders `training/00-start-here.md`; `/stakeholder` → `training/stakeholder-demo-script.md`; `/facilitator` → `training/facilitator-guide.md`; `/labs/[slug]` → `training/labs/<slug>.md`. One-to-one URL → markdown mapping.
- §"Frontend Architecture": Server Components by default.
- The architecture's project structure documents three labs: solo, sync, async-story-review.

**Existing `training/00-start-here.md`:**
The file already exists from the v1 baseline but contains stale content that contradicts the locked architecture (mentions "create an account" — there is no auth in v1; references `lab-instructions/` and `../content/lessons/` which are not the actual layout). Story 2.3 replaces it with a clean placeholder consistent with the lesson placeholders authored in Story 2.2. The full content authoring lands in Epic 6.

**Robots metadata:**
Story 1.2's review patches added `robots: { index: false, follow: false }` to the three placeholder routes because they were temporary thin pages. Now they are real audience-entry pages that should be indexable; Story 2.3 removes those overrides and lets the route inherit the layout's default robots posture.

**Why a shared `loadContent` helper:**
AC6 explicitly demands a single helper to keep file-loading conventions consistent. Without it, four routes would each grow their own `readFileSync` + path-resolve idioms — the kind of drift that breaks the "everything is a file" pedagogy when one page resolves paths differently from another.

**Test approach:**
- Vitest covers the helper (pure-function-of-disk; tmpdir fixture mirroring the dev-link-check + sequence test pattern).
- Playwright covers the route layer.

## Dev Agent Record

### Implementation Plan

1. Author markdown placeholders so all four routes have content to render.
2. Build `loadContent` as the shared file-loading helper called by every route.
3. Rewrite the three audience-entry pages and add the lab dynamic route, all using `loadContent` + `<Markdown>`.
4. Lab `generateStaticParams` is filesystem-driven via a small `getLabSlugs()` helper — same pattern as the lesson sequence module.
5. Update the e2e suite: switch h1 assertions from exact match to containment (autolink anchor is prepended by the markdown pipeline), drop the obsolete `noindex` checks, add labs + the `/stakeholder` no-lesson-nav regression guard.

### Debug Log

- The markdown pipeline's `rehype-autolink-headings` configuration prepends a `#` text node inside each heading. `page.locator("h1").toHaveText("Trainee — Start Here")` would fail because the visible text becomes `#Trainee — Start Here`. Switched all heading assertions in `home.spec.ts` and the new lab/audience specs to `toContainText`.
- `/stakeholder` lesson-nav regression guard uses `^Lesson \d+ of \d+$` regex bound to text-content match — anchored to avoid accidental matches in body copy that mentions "Lesson 5".
- Lab `generateStaticParams` reads from disk; `getLabSlugs()` is wrapped in try/catch so a missing `training/labs/` directory returns `[]` rather than crashing the build.

### Completion Notes

**ACs satisfied:**
- AC1: `/start-here` → 200, h1 from `training/00-start-here.md` rendered through `<Markdown>`. E2E asserts.
- AC2: `/stakeholder` → 200, content from `training/stakeholder-demo-script.md`. E2E asserts AND adds a negative assertion that no `Lesson N of M` indicator is rendered (LessonNav is not imported by the route file).
- AC3: `/facilitator` → 200, content from `training/facilitator-guide.md`. E2E asserts.
- AC4: `/labs/solo` → 200, h1 visible. Plus `/labs/sync` and `/labs/async-story-review`.
- AC5: `/labs/this-slug-does-not-exist` → 404 with global not-found h1.
- AC6: All four routes are Server Component files at the AC-mandated paths and read through the single `loadContent` helper. Verified by inspection.

**Defensible deviations:**
- AC6 names the helper "e.g., `src/lib/markdown/load-content.ts`" — implemented at exactly that path. Plus a sibling `src/lib/labs/sequence.ts` that exposes `getLabSlugs()` for `generateStaticParams`. The labs helper does not duplicate the loading concern (no `readFileSync` of content), it only enumerates slugs — distinct responsibility from `loadContent`.
- The original `training/00-start-here.md` had stale content (auth references, fictional layout paths). Story 2.3's narrow scope is "wire markdown rendering," but rendering a file with factual lies would have been worse than authoring a clean placeholder. The replacement keeps the file's role (trainee entry point) while removing the architecture contradictions; full content ships in Epic 6.

**Robots metadata change:**
The three audience routes had `robots: { index: false, follow: false }` from Story 1.2's review patches because they were thin placeholders. They are now real audience-entry pages and should be indexable; the metadata override is dropped and these routes inherit the layout default.

**Test approach note:**
- Vitest covers `loadContent` (tmpdir fixtures + `process.chdir` to test the `cwd`-relative resolution).
- Playwright covers all four routes' HTTP/heading/title behavior plus the AC2 regression guard.
- The lab `getLabSlugs()` helper is currently exercised only via `/labs/[slug]` E2E (which exercises `generateStaticParams` indirectly). Direct Vitest coverage for that helper is deferred — same shape as `getLessonSequence()`, low marginal value.

## File List

**New files:**
- `training/stakeholder-demo-script.md`
- `training/facilitator-guide.md`
- `training/labs/solo.md`
- `training/labs/sync.md`
- `training/labs/async-story-review.md`
- `src/lib/markdown/load-content.ts`
- `src/lib/markdown/load-content.test.ts`
- `src/lib/labs/sequence.ts`
- `src/app/labs/[slug]/page.tsx`
- `tests/e2e/audience-and-labs.spec.ts`
- `_bmad-output/implementation-artifacts/2-3-audience-and-lab-routes.md` (this file)

**Modified files:**
- `training/00-start-here.md` (whole-file refresh — stale auth references and fictional paths replaced with a clean placeholder)
- `src/app/start-here/page.tsx` (placeholder JSX → `<Markdown>` rendering via `loadContent`; robots noindex dropped)
- `src/app/stakeholder/page.tsx` (same)
- `src/app/facilitator/page.tsx` (same)
- `tests/e2e/home.spec.ts` (placeholder-route tests retitled "audience-entry routes (Story 2.3)"; `toHaveText` → `toContainText`; noindex assertion dropped)

## Change Log
- 2026-05-08 — Story file authored from epics.md §Epic 2 / Story 2.3
- 2026-05-08 — Implementation completed; `test:unit` 25/25, `test:e2e` 16/16, lint clean; status `review`
- 2026-05-08 — Code review run: 0 decision-needed; 8 patches applied (path-traversal defenses ×2, TOCTOU collapse, frontmatter try/catch, getLabSlugs regex tightening, getLabSlugs error surfacing, Vitest cwd spy, structural no-lesson-nav guard, not-found containment assertion); 7 deferred; 2 dismissed. `test:unit` now 26/26 (added containment-guard case); `test:e2e` 16/16; lint clean. Status `done`.
