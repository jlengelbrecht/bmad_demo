# Story 2.1: Markdown rendering pipeline as a Server Component utility

**Epic:** 2 — Lesson Navigation & Self-Reference Link Integrity
**Story Key:** 2-1-markdown-pipeline
**Status:** review

## Story

As a curriculum author committing a markdown file under `training/`,
I want a single Server Component `<Markdown source={…} />` that renders my markdown into accessible HTML using a fixed remark/rehype pipeline,
So that any lesson, lab, or audience-entry route can render content with one consistent rendering contract.

## Acceptance Criteria

**AC1 — Pipeline shape and plugin order**
- `src/lib/markdown/pipeline.ts` exports a configured pipeline using these plugins in this order: `remark-parse`, `remark-gfm`, `remark-rehype`, `rehype-slug`, `rehype-autolink-headings`, a syntax-highlighting plugin (`rehype-pretty-code` chosen — uses Shiki).
- `src/lib/markdown/frontmatter.ts` exports a YAML frontmatter parser returning `{ frontmatter: Record<string, unknown>, body: string }`. Missing frontmatter returns `{ frontmatter: {}, body: <full input> }`.
- `src/lib/markdown/render.tsx` exports a Server Component `<Markdown source={…} sourcePath?={…} />` that runs the pipeline and renders HTML.

**AC2 — GFM, headings, anchors**
- A markdown input with GFM tables, footnotes, fenced code blocks renders correctly.
- Every `h1`–`h6` heading has an `id` slug.
- Each heading has an in-page anchor link (rehype-autolink-headings).

**AC3 — Syntax highlighting**
- Fenced code blocks with language tags receive syntax highlighting that meets WCAG AA contrast (rehype-pretty-code default theme satisfies this — verified: `github-dark-dimmed` or `one-dark-pro` both pass).
- Rendered code blocks use `<pre><code>` semantics, not div-soup (rehype-pretty-code default).

**AC4 — Relative-link preservation + dev-mode warning**
- A markdown link `[CODEOWNERS](.github/CODEOWNERS)` or `../foo/bar.md` renders as `<a href="<verbatim>">` — NOT rewritten to absolute URL, NOT converted to `next/link`.
- In dev mode (`process.env.NODE_ENV !== "production"`), if a relative link's target file does not exist on disk (resolved against `sourcePath`), a console warning is emitted naming the missing target and the source file.

**AC5 — No MDX**
- Imports do NOT include `@next/mdx`, `next-mdx-remote`, `mdx-bundler`, or any MDX-related package. Plain markdown stays plain markdown.

**AC6 — Vitest tests co-located**
- `src/lib/markdown/pipeline.test.ts` (Vitest) covers: GFM rendering (table + footnote + fenced code), heading slug + autolink, relative link preservation (not rewritten), frontmatter parsing of present-and-missing cases.
- `npm run test:unit` script runs Vitest.

## Tasks/Subtasks

- [x] **Task 1 — Install pipeline dependencies** — `unified@11`, `remark-parse@11`, `remark-gfm@4`, `remark-rehype@11`, `rehype-slug@6`, `rehype-autolink-headings@7`, `rehype-pretty-code@0.14`, `rehype-stringify@10`, `gray-matter@4`, `unist-util-visit@5` (runtime); `vitest@4` (dev). Confirmed: no `@next/mdx`, `next-mdx-remote`, `mdx-bundler`, or `@mdx-js/*` in lockfile.
- [x] **Task 2 — `frontmatter.ts`** — wraps `gray-matter`; `parseFrontmatter(source)` → `{ frontmatter, body }`; missing case returns `{}` + full input.
- [x] **Task 3 — `pipeline.ts`** — `renderMarkdownToHtml(body, { sourcePath })` chains plugins exactly as ACd. `rehype-autolink-headings` config: `behavior: "prepend"`, `aria-label: "Permalink to this section"`, `class: "heading-anchor"`, content `#`. `rehype-pretty-code` config: `theme: "github-dark-dimmed"`, `keepBackground: true`.
- [x] **Task 4 — `dev-link-check.ts`** — custom rehype plugin; no-op in production OR without `sourcePath`; resolves relative `href`s against `path.dirname(sourcePath)`; warns once per missing target with both target and source named.
- [x] **Task 5 — `render.tsx` Server Component** — async function `Markdown`; splits frontmatter, renders body, wraps in `<article className="prose prose-zinc dark:prose-invert max-w-none">` with `dangerouslySetInnerHTML`. Trusted-content rationale documented in Dev Notes.
- [x] **Task 6 — Vitest** — `vitest.config.ts` with `node` env, `src/**/*.test.{ts,tsx}` includes, excludes `tests/e2e/**`. `test:unit` script wired. Vitest and Playwright surfaces are disjoint.
- [x] **Task 7 — `pipeline.test.ts`** — 9 cases across 4 describe blocks: GFM (table, footnote, fenced code), heading slug + autolink, relative-link preservation (`../a/b.md`, `.github/CODEOWNERS`, plus negative cases for `/abs`, `#anchor`, `https://...`), frontmatter present + missing.
- [x] **Task 8 — Smoke + lint** — `npm run test:unit` 9/9 in 257ms; `npm run test:e2e` 6/6 in ~2.5s; `npm run lint` clean; no MDX packages in lockfile.
- [x] **Task 9 — Story finalization** — File List + Implementation Plan + Completion Notes populated; status set to `review`.

## Dev Notes

**Architecture references** (`_bmad-output/planning-artifacts/architecture.md`):
- §"Markdown pipeline" line ~230: "remark + remark-rehype + rehype plugins in a Server Component (no MDX). Plugins: remark-gfm (tables, footnotes), rehype-slug + rehype-autolink-headings (deep links per FR-1.3), rehype-pretty-code or rehype-shiki (accessible syntax highlighting), a custom plugin to verify relative links resolve to existing files at request time (dev-only warning). Plain markdown stays plain markdown — preserves the brief's 'readable in editor when portal is broken' property."
- Server Components by default; Markdown is a Server Component.

**Rendering safety:** content under `training/` is trusted authoring (committed to the repo by maintainers, not user input). `dangerouslySetInnerHTML` is acceptable; rehype-stringify with `allowDangerousHtml: false` upstream gives an additional guard.

**Test approach:**
- Vitest for the pipeline unit tests (matches Story 2.1 AC6 verbatim; matches architecture's "Vitest for pure functions").
- Playwright covers route-level rendering once Story 2.3 wires content through routes — out of Story 2.1's scope.

**File-system access in dev-link-check plugin:**
- The plugin uses `node:fs` and `node:path` synchronously; this runs at build/render time on the server, not the client. Server Components are allowed to do this.

## Dev Agent Record

### Implementation Plan

1. Install runtime + dev deps; confirm zero MDX packages.
2. `frontmatter.ts` first (smallest surface; foundation for `render.tsx`).
3. `dev-link-check.ts` second (it's a unified plugin used by the pipeline).
4. `pipeline.ts` chains plugins in spec order; `rehype-autolink-headings` configured for prepend + aria-label.
5. `render.tsx` is the user-facing seam: async Server Component, splits frontmatter, renders body via the pipeline, hands HTML to `<article>` via `dangerouslySetInnerHTML`.
6. Vitest config + script.
7. Tests cover all six AC bullets in §Vitest tests co-located.
8. Final triple gate: unit + e2e + lint.

### Debug Log

- `vitest.config.ts` `resolve.alias["@"]` set to `./src` so future tests can import via `@/lib/...` (mirrors `tsconfig.json` paths).
- Initial run failed `npm run test:unit` because the script wasn't wired yet; added it post-config.
- `parseFrontmatter` test asserts `frontmatter.reviewedAt instanceof Date` because gray-matter parses YAML date scalars to `Date` objects — this is the tested behavior, not a workaround.
- `rehype-pretty-code` emits `data-language="ts"` plus internal `data-line` / `data-rehype-pretty-code-figure` attrs; the test asserts the language attribute since it's the durable contract.
- E2E unaffected: home + 3 placeholder routes pass; markdown surface isn't wired into routes yet (Story 2.3 wires the audience-entry routes to render their markdown, Story 2.2 wires lessons).

### Completion Notes

**ACs satisfied:**
- AC1: All three modules exist (`pipeline.ts`, `frontmatter.ts`, `render.tsx`); plugin order verbatim; frontmatter contract matches.
- AC2: GFM tables/footnotes/fenced code, heading slug + autolink — all asserted in tests.
- AC3: `rehype-pretty-code` theme `github-dark-dimmed` (WCAG AA dark); `<pre><code>` semantics confirmed by `<pre[^>]*>` + `<code[^>]*>` regex assertion.
- AC4: relative-link preservation tested for both `../a/b.md` and `.github/CODEOWNERS`; dev-link-check plugin gated on NODE_ENV + sourcePath presence.
- AC5: lockfile verified MDX-free.
- AC6: Vitest co-located at `src/lib/markdown/pipeline.test.ts`; 9 tests passing; `npm run test:unit` script in place.

**Defensible deviation:**
- AC2 says "every h1–h6 has an id slug" — slug behavior comes from `rehype-slug`, which slugs every heading by default. Tests cover h2; not exhaustively all six levels because the plugin's contract is universal.

**Trust model for `dangerouslySetInnerHTML`:**
- Markdown sources are committed authoring content under `training/` — same threat model as the rest of the repo. `remark-rehype` is invoked with `allowDangerousHtml: false`, so embedded raw HTML in markdown is dropped at the boundary. `rehype-stringify` `allowDangerousHtml: true` is set so syntax-highlighted code (which produces raw HTML attributes) survives — but this only re-emits hast nodes the pipeline itself produced, not arbitrary user HTML. This is the documented unified pattern.

**Test approach note:**
Component-level tests (rendering the React component itself) are intentionally out of scope per architecture's "No React-component-level tests at v1" — Playwright covers route-level rendering, Vitest covers the pipeline.

## File List

**New files:**
- `src/lib/markdown/frontmatter.ts`
- `src/lib/markdown/pipeline.ts`
- `src/lib/markdown/render.tsx`
- `src/lib/markdown/dev-link-check.ts`
- `src/lib/markdown/pipeline.test.ts`
- `vitest.config.ts`
- `_bmad-output/implementation-artifacts/2-1-markdown-pipeline.md` (this file)

**Modified files:**
- `package.json` (10 runtime deps + vitest dev dep + `test:unit` script)
- `package-lock.json` (transitive)

## Change Log
- 2026-05-08 — Story file authored from epics.md §Epic 2 / Story 2.1
- 2026-05-08 — Implementation completed; `test:unit` 9/9, `test:e2e` 6/6, lint clean; status set to `review`
