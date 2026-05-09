# Deferred Work

## Deferred from: 2026-05-09 PTY pivot (commit `d677123`)

- ✅ **RESOLVED in 7dc0388** — Codex positional-argv passthrough validated. `codex [PROMPT]` is forwarded to the agent which independently routes slash commands to its skills layer (verified via `codex exec --skip-git-repo-check "/skills"`). Lifted `SUPPORTS_INITIAL_PROMPT_ARGV.codex` to `true`. Launch shape: `codex --dangerously-bypass-approvals-and-sandbox "<bmad-skill>"`.
- ✅ **RESOLVED in 7dc0388** — GitHub Copilot positional-argv passthrough validated via `copilot --help` + empirical drive: `-i "<prompt>"` is documented as "Start interactive mode and automatically execute a prompt". Lifted `SUPPORTS_INITIAL_PROMPT_ARGV["github-copilot"]` to `true`. Launch shape: `copilot --allow-all-tools -i "<bmad-skill>"`.
- ✅ **RESOLVED** — chat-phase PTY spawn e2e landed at `tests/e2e/capstone-chat-phase-pty.spec.ts`. Three parameterized tests (one per tool) verify the per-tool preview renders + the spawn route forwards `chosenDir`/`tool`/`phase` to the spawned process. Backed by `CAPSTONE_CHAT_PTY_FIXTURE_SCRIPT` env override + `tests/fixtures/pty-fake-chat-phase.mjs`. Same pattern as bootstrap-PTY.
- **Stories 7a.2, 7b.1, 7b.2, 7b.3, 8.1 (primer files) — decide whether to delete `src/lib/capstone/primers/*.md`.** The PTY pivot removed the chat-stream that loaded these primers as system context. They're now dead weight. Delete the directory + the primer files unless someone wants them as reference material. Defer the decision. **2026-05-09 status:** confirmed unreferenced (`grep -rln "primers/" src/` returns nothing); 6 .md files totaling ~13 KB. The content is high-quality teaching material on what each phase produces — could be repurposed into curriculum content (`training/lessons/`) before deletion.
- ✅ **RESOLVED via Playwright walkthrough on 2026-05-09** — Story 9.1 + 9.2 (HANDOFF) verified post-PTY pivot. Drove `/capstone/handoff/<seeded-session>`, clicked "Generate HANDOFF.md", got 2.5 KB output with correct phase artifact statuses, tool name (Codex), BMAD version (6.6.0), push instructions. Endpoint `/api/capstone/handoff/generate` works end-to-end.
- ✅ **RESOLVED in 7dc0388** — Codex auth probe replaced (the original `codex exec` agent_message probe charged $$$, took 3-15s, and silently failed for subscription auth). Now uses `codex login status` — free, immediate, accurate for both ChatGPT-subscription and OPENAI_API_KEY paths.
- ✅ **RESOLVED in 7dc0388** — Copilot auth probe replaced (the original `gh api user/copilot_billing` returns 404 regardless of auth state — wrong endpoint). Now reads `~/.copilot/config.json::lastLoggedInUser.login` (JSONC-aware: strips `// ...` line comments before parse). Free, immediate, accurate for both `copilot login` OAuth and gh-token paths.

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

## Surfaced during Epic 3 retro Playwright walkthrough (2026-05-08)

- ✅ **RESOLVED in 725f5a4** — `npm run reset-progress` while the dev server is running used to leak stale state until restart. Cheapest fix landed: the script's success output now includes "If a dev server is running, restart it for the reset to take effect." A stronger fix (connection module watches the file via fs.watch and reopens on unlink) remains deferred; revisit if the manual restart hint proves insufficient.
- ✅ **RESOLVED in 725f5a4** — Tailwind Typography's GitHub-style backtick decorations on inline `<code>` removed via a `content: none !important` rule in globals.css. Lesson prose now renders inline code as monospace without surrounding backtick characters.

## Deferred from: code review of 3-4-reset-progress (2026-05-08)

- **Source-string smokes are bypassable via string concat / template literals** — drift-detection lints, not malicious-code defenses. Fine for a single-maintainer repo.
- **Symlink-pointed-at-arbitrary-file** — `unlinkSync` removes the link, not the target. Safe.
- **`import.meta.dirname` in test file** — Vitest populates it; we're committed to Vitest.
- **AC2 `Deleted: ` prefix** — AC literal says "prints the absolute path"; we print path with a "Deleted:" label that adds context. Defensible.

## Deferred from: code review of 3-3-mark-complete-ui (2026-05-08)

- **AC2 "toast" → inline `<span role="status">`** — original epics.md says "toast surfaces an error message"; impl uses inline span with `role="status" aria-live="polite"`. Architecture's "smallest interactive surface" lock argues against a toast component. Defensible deviation; documented in story.
- **Discarded server error body on non-2xx** — handler returns Zod-flattened `details`; client shows generic "Couldn't save". Parse for richer UX when feedback identifies friction.
- **`fetch` follows redirects by default** — set `redirect: 'error'` if a hosted target ever appears.
- **`SCHEMA_PATH` Turbopack fallback branch has no direct unit test** — covered transitively by Playwright.
- **Module-level `DEFAULT_DB_PATH` evaluated at import time** — env var must be set before module load. Playwright wires this; no other paths need it today.
- **Emerald color contrast on pill text/bg** — borderline AAA; Epic 5 axe is the gate.
- **Comma-in-lesson-title aria-label split** — current 6 titles have no commas.
- **`expect(res.status()).toBe(200)` brittle if route ever returns 201** — current handler always returns 200.

## Deferred from: code review of 3-2-progress-route-handler (2026-05-08)

- **`flatten().fieldErrors` echoes field names back to the client** — fine while the schema only has `kind`, `id`, `completed`. Revisit if `ProgressUpsertRequest` ever gains an internal-only field.
- **`console.error(err)` doesn't normalize non-Error throws** — defensive concern; rare in practice. Address if a real non-Error throw lands in logs.
- **No NODE_ENV gate on `console.error`** — production deployment is local-only per architecture; revisit if v1.1 introduces a hosted target.
- **Concurrent writes to same `(kind, id)` not documented** — better-sqlite3 sync writes serialize on the event loop; last-writer-wins via upsert is fine for a single-trainee local portal.
- **Multiline import statements would slip past the import-discipline test** — current line-oriented filter is naive. Switch to AST parse if the import surface ever grows.

## Deferred from: code review of 3-1-sqlite-progress-store (2026-05-08)

- **Test-side production-singleton pollution risk** — current tests pass `db` arg explicitly; a future test author could forget. Defensive guard would throw from `getDb()` when `NODE_ENV='test'`; revisit if it actually bites.
- **`getProgress` row cast trusts DB shape** — `as ProgressRecord | undefined` would silently lie if schema drifts. Schema is one table, one query shape; Zod-on-read would land if the schema grows.
- **`Date.now()` backward jump (NTP step-back)** — would produce out-of-order ISO strings. Use a monotonic counter when sort-by-recency becomes load-bearing.
- **No `(kind)`-only index for "list completed lessons" queries** — composite PK covers a prefix scan; revisit when Story 3.3 surfaces a query that's actually slow.
- **`mkdirSync` doesn't handle ENOTDIR / EROFS gracefully** — production failure should bubble; clearer error message is polish.
- **`synchronous` pragma not pinned** — default is FULL with WAL; pin explicitly when durability matters.

## Deferred from: code review of 2-5-staleness-banner (2026-05-08)

- **Server Component `new Date()` is captured at build time for SSG'd routes** — pages cached at build never transition to stale until cache invalidates. Address at the consumer's route definition (`export const revalidate = 86400` or `dynamic = "force-dynamic"`); JSDoc on `classifyStaleness` documents the constraint. Wire-up lands when Epic 6 introduces the first consumer (`training/tools-reference.md`).
- **AC4 capitalization "No" vs "no"** — sentence-case normalization is a defensible UI prose choice; flip to lowercase OR amend the AC if the user calls the choice.
- **`toContain('role="status"')` is brittle to JSX refactors** — implementation-detail coupling.
- **i18n / locale formatting of `reviewedAt`** — hardcoded English strings + ISO date format; out of scope at v1.
- **Architecture vs epics threshold drift (`> 120` vs `≥ 120`)** — story sides with epics; reconcile in `architecture.md` separately.
