# Session State — 2026-05-10 (Epic 12 curriculum + Epic 13 devcontainer + UI walkthrough fixes + Epic 11 polish + Story 11.1 deferred AC closure)

**Purpose:** Single document the next session reads first to pick up where we left off. Pairs with `_bmad-output/planning-artifacts/epics.md` (the backlog), the per-story files in this directory, `deferred-work.md` (the running carry-over list), and the prior session-state docs.

This session spanned two calendar days (post-`eebbf04` 2026-05-09 work + 2026-05-10) and was a mostly-autonomous push with a few interactive Playwright walkthroughs sprinkled in. Per the auto-memory rule (`feedback_autonomous_push_dev_records.md`), the per-story Dev Agent Records were not authored as work landed — treat this doc + the 32 commit messages as the synthesized push journal.

---

## What landed — 32 commits since `eebbf04`

Grouped by arc, newest at the top of each group.

### Arc A — Real-install smoke close-out (1 commit)

| Commit | Headline |
|---|---|
| `2e9f48c` | Close real-install smoke (codex + copilot auto-discover BMAD skills) |

`npx bmad-method@6.6.0 install --tools <codex\|github-copilot> --yes` empirically verified to land 42 skills under `.agents/skills/` and both CLIs auto-discover from cwd. The last open question from the codex/copilot lift is now closed — no portal-side wiring needed beyond `cd <chosenDir> && <tool> ... "<bmad-skill>"`.

### Arc B — Epic 12 (curriculum authoring) — orphaned scope reclaimed (12 commits)

| Commit | Headline |
|---|---|
| `0db15a2` | Author Epic 12 — Curriculum Content Authoring (replaces orphaned Epic 6) |
| `3bb8dc6` | Story 12.0 — research foundation for curriculum (3 artifacts) |
| `6c36868` | Stories 12.1, 12.2, 12.3 — foundational lessons + story template |
| `415686f` | Story 12.4 — Lesson 4 (CODEOWNERS + the gate) + lead-review-checklist.md |
| `42d0583` | Story 12.5 — Lesson 5 (working as a team) + team-rituals-checklist.md |
| `eb58e05` | Story 12.6 — Lesson 6 (capstone framing) refined |
| `36542a1` | Story 12.7 — three labs (solo / sync / async-story-review) |
| `ff088c3` | Story 12.8 — AGENTS.md + .github/copilot-instructions.md customized |
| `303b292` | Story 12.9 — audience entries + tools-reference.md |
| `97ff79f` | Story 12.10 — language pass + curriculum verification |
| `abab73e` | Story 12.11 — decision-authority extension to Lesson 5 + checklist |

Net: a complete teaching curriculum (7 lessons + 3 labs + 4 pinnable artifacts + customized AGENTS.md) replacing the orphaned Epic 6 stub. The "what parts of BMAD should be gated / drift in the PRD should be team decisions" thesis was woven into Lesson 5's decision-authority gradient (Story 12.11) so the lessons are tool-agnostic but team-shaped.

### Arc C — Live UI walkthrough feedback batch 1 (4 commits)

| Commit | Headline |
|---|---|
| `ff83e1d` | Fix routable cross-references in curriculum (start-here labs etc.) |
| `d79c6f0` | Stay evergreen against BMAD: drop Discord, drop version pins, install @latest |
| `0e121f1` | Add /source/[...path] viewer; rewrite curriculum file links to use it |
| `3a33584` | Make bootstrap-complete explainer tool-aware (codex/copilot/claude-code) |

User drove the portal end-to-end and surfaced gaps unit/lint/e2e couldn't catch (per `feedback_quad_gate_insufficient.md`). Three labs the lessons mentioned didn't exist as routable links; lessons enumerated specific BMAD agents that drift; bootstrap-complete copy hardcoded "Claude Code" even when the trainee picked codex or copilot; in-repo file references (e.g. `_bmad/bmm/config.yaml`) 404'd because there was no source viewer. All four closed; the new `/source/[...path]` route renders any in-repo file as syntax-highlighted markdown (re-using the existing pipeline).

### Arc D — Capstone phase-gate hardening (5 commits)

| Commit | Headline |
|---|---|
| `29edd2c` | Phase-done UI + PTY cleanup + xterm hardening on chat surface |
| `146cb63` | Pattern-based artifact discovery for the phase-done gate |
| `1fdc51c` | Fix xterm right-edge clipping when scrollbar appears |
| `2448b14` | Phase-done gate respects the trainee's chosen BMAD output_folder |
| `3cd83be` | Drop the ADR phase — it was hallucinated; BMAD has no ADR skill |

After driving Phase 4 (PRD), user reported the terminal column overlapped the scrollbar. Fix went deeper than expected — `scrollbar-gutter: stable` alone doesn't help on overlay-style scrollbars (Linux/Firefox `scrollbarPx === 0`); needed explicit `pr-4` on the xterm container. Then the phase-done gate failed because BMAD writes `PRD.md` not `prd.md` — replaced exact-name lookups with regex pattern matching. Trainees who customize BMAD's `config.yaml::output_folder` away from `_bmad-output/` got 404s on the gate — added `readBmadOutputFolder()` to the resolver. And ADR was a hallucination — BMAD ships no ADR skill. Dropped the phase entirely.

### Arc E — Lesson re-numbering (2 commits)

| Commit | Headline |
|---|---|
| `46d381f` | Lesson 1.5 — The BMAD ecosystem and installer |
| `603ecfa` | Integer-numbered 7 lessons (drop the 1.5 framing) |

I shipped a "Lesson 1.5" interlude. User: "i don't actually like the 1.5 framing of the lessons we should keep even numbers if we need to do 7 lessons then thats what we do." Renumbered to integers — ecosystem became Lesson 6, capstone framing became Lesson 7. All routes, prev/next nav, e2e tests, and source-link references migrated.

### Arc F — Capstone phase ordering (2 commits)

| Commit | Headline |
|---|---|
| `f06edfd` | Add implementation-readiness + sprint-planning capstone phases |
| `ee7b224` | Per-phase teaching panels in capstone + sharpen Lesson 2 backlog/spec split |

User hit "no sprint-status.yaml found" running dev-story-1.1 — BMAD's `module-help.csv` lists `bmad-implementation-readiness` and `bmad-sprint-planning` as required gates between epics+stories and dev-story execution. Both phases added with proper teaching primers. Then user pointed out the capstone "tells trainees what we're running but not the goal" — added per-phase teaching primer panels above the launch button (`PhaseTeachingPanel` + `teaching-primers.ts`). Lesson 2 was also sharpened to make the epics-as-backlog-summary vs `bmad-create-story` per-implementation-spec distinction explicit (user's question: "ok whats the difference between epics-and-stories and dev-story-1.1?").

### Arc G — Epic 13 (devcontainer) — cross-OS distribution (2 commits)

| Commit | Headline |
|---|---|
| `56ad861` | Land Story 13.1 — devcontainer scaffolding (Epic 13: Distribution) |
| `eaea453` | Devcontainer build verified — fix two issues found during smoke |

User raised: "is it worth trying to create a container for our platform" since the portal currently assumes Linux + Node + node-pty + sqlite. Authored Epic 13 and shipped Story 13.1 — `.devcontainer/Dockerfile` + `devcontainer.json` + `.dockerignore` give Mac/Windows trainees a one-command "Reopen in Container" path. Build smoke surfaced two bash-isms (`type -p curl >/dev/null` failed in dash) + a Claude-installed-as-root issue (`USER node` was set after the install) — both fixed.

### Arc H — xterm error suppression refinement (1 commit)

| Commit | Headline |
|---|---|
| `59f03c4` | Widen the xterm error filter to match raw stack frames |

`Cannot read properties of undefined (reading 'dimensions')` from xterm's init race kept slipping through the original filter (I had matched `Viewport.` but the raw stack only has `_innerRefresh`, no class qualifier). Widened to `_innerRefresh \|\| Viewport`. Cosmetic but visible.

### Arc I — Epic 11 (UI overhaul) — focused pass (3 commits)

| Commit | Headline |
|---|---|
| `f119a4a` | Epic 11 — UI pass: brand color, hero, uniform audience cards, polished header |
| `8b660de` | Fix xterm SSR crash: dynamic-import TerminalPane with ssr:false |
| `e85cb90` | Story 11.1 theme toggle + logo: ship the deferred AC5/6/7 |

Scoped Epic 11 down to a focused subset: hero rewrite + stats panel + uniform audience-card chrome with sky-700 brand color + sticky header polish. Commit `f119a4a` introduced an SSR crash because `xterm` reads `self` at module evaluation (Next.js 16 RSC pre-evaluates client modules during prerender) — fixed by switching the bootstrap + chat-phase pages to `next/dynamic({ ssr: false })` for `TerminalPane`. Then user noticed the theme toggle and brand logo weren't shipped at all — went back and closed Story 11.1 AC5/6/7:

- `ThemeProvider` + `THEME_INIT_SCRIPT` — synchronous inline `<head>` script reads localStorage / matchMedia and stamps `data-theme` on `<html>` BEFORE first paint (no FOUC of light flashing on a dark reload).
- `ThemeToggle` — Light/Dark/Auto segmented control, three buttons with aria-pressed + `aria-label="Theme: <Mode>"`, sky-700 active highlight.
- `SiteHeader` — adds the Cargill logo on the left (`public/brand/logo.png`, `dark:invert` for dark v1; AC7's full `<picture>` separate-light/dark variants deferred).
- `globals.css` — switches Tailwind v4 dark variant from `prefers-color-scheme` to `data-theme` via `@custom-variant dark (&:where([data-theme="dark"], [data-theme="dark"] *))`.
- `lessons.spec.ts` — tab-order test now walks past 3 non-anchor theme buttons by `{kind: "link"|"button", href|label}` descriptor.

**Live verification gotcha:** the toggle initially looked broken because a stale `next-server` from a prior dev session was still on port 3000 serving pre-Tailwind-recompile CSS. Killed pid 1639847 + `rm -rf .next` + restart → bundle now contains 81 `data-theme` rules and the toggle drives the full palette (verified via Playwright).

---

## What changed structurally

### 1. Curriculum is now real

Before this session: 7 lesson placeholder routes + a "labs page coming soon" stub. Now: 7 fully-authored lessons (~15 min each), 3 labs (solo / full-team-sync / async-story-review), 4 pinnable artifacts (`story-template.md`, `lead-review-checklist.md`, `team-rituals-checklist.md`, `tools-reference.md`), and a customized `AGENTS.md` + `.github/copilot-instructions.md`. The team-rituals thesis from `project_bmad_training_portal.md` is woven through.

### 2. Capstone is now BMAD-method-faithful

The 8-phase capstone matches BMAD's actual gate sequence: `pre-flight → tool-selection → setup-wizard → bootstrap → brief → prd → architecture → epics-and-stories → implementation-readiness → sprint-planning → dev-story-1.1`. ADR (which I had hallucinated) is gone. Pattern-based artifact discovery means BMAD's actual filenames (`PRD.md`, `architecture.md`, etc.) are matched even when output_folder is customized.

### 3. Cross-OS path now exists (devcontainer, not standalone Docker)

Epic 13's Story 13.1 means Mac/Windows users can "Reopen in Container" and get a working Linux dev environment without the host-side node-pty / sqlite / better-sqlite3 build pain. Build verified end-to-end on a clean container.

### 4. Theme system is the data-theme pattern, not media-query

The portal now respects user choice over OS preference. `data-theme="light\|dark"` on `<html>` is the source of truth; localStorage holds the preference (which may be `auto`); the inline init script resolves auto via `prefers-color-scheme` and stamps the attribute synchronously before paint. Tailwind v4's `@custom-variant dark` directive maps the `dark:` utility classes onto this attribute.

### 5. Brand is forkable via a single file

`public/brand/logo.png` is the slot; adopters who fork swap one file to skin. Cargill is the v1 brand because this repo is for Cargill internal use (per `project_company_cargill.md`).

---

## Open / deferred items still on the board

(Updated state of `deferred-work.md` plus things surfaced this session.)

| Item | Notes | Pointer |
|---|---|---|
| Story 11.1 AC7's separate light/dark `<picture>` logo variants | v1 ships `dark:invert` filter. AC7's full `<picture>` element + separate assets is deferred until a non-monochrome brand needs it. | `src/components/site-header.tsx` |
| Story 11.1 ACs beyond 5/6/7 | Story 11.1 also called for a Radix-based slide-pill responsive toggle + lucide icons. v1 uses three plain buttons + inline SVG. Adequate for now; revisit when a design overhaul lands. | `_bmad-output/implementation-artifacts/11-1-foundation-tokens-and-theme.md` |
| Pre-existing e2e failures (5) | `capstone-overview` (no-prior-session expects "Ready to start?" but DB has a session), 3× `capstone-chat-phase-pty`, `capstone-bootstrap-pty`. Verified pre-existing via `git stash + rerun`. NOT regressions from theme work. Likely a worker-isolation / DB-cleanup issue between specs (suspect: a beforeAll seed not cleaned by a later afterEach). | `tests/e2e/capstone-{overview,bootstrap-pty,chat-phase-pty}.spec.ts` |
| Devcontainer real-trainee smoke | Build is green and tools install correctly. Has not been driven by a fresh user via "Reopen in Container" yet — that's the meaningful test. | `.devcontainer/` |
| Primer files under `src/lib/capstone/primers/*.md` | Confirmed unreferenced. ~13 KB across 6 files. Content is high-quality teaching material; could be repurposed into curriculum or simply deleted. Decision still deferred. | `src/lib/capstone/primers/` |
| Native folder dialog (Story 6.3) | Trainees still type the path. | `_bmad-output/implementation-artifacts/6-3-path-picker-with-allowlist.md` |
| Session-lock helpers + heartbeat (Story 6.1 AC6) | Two-tab race exists; low risk for solo trainee. | Same |
| Adapter integration tests | Env-gated `RUN_ADAPTER_INTEGRATION=1`; still unrun on CI. Local dev box has all three CLIs auth'd — could be driven hands-on. | `src/lib/capstone/adapters/*.integration.test.ts` |
| Epic 11 remaining stories | The focused subset (`f119a4a` + theme/logo follow-up) closed the highest-value items. `epics.md` lists 7 stories total — the rest are component-extraction + design-token work that doesn't block adoption. | `_bmad-output/planning-artifacts/epics.md` Epic 11 section |
| Lesson 5 / decision-authority Lab idea | While writing 12.11 I noted a possible Lab D — a team running through "rate these 10 BMAD areas on the gradient" and reconciling. Not authored. Could be a future Epic 12 addition or a Lab 3 sibling. | `training/labs/` |

---

## Pickup hints for the next session

Patterns established this session — don't rediscover them:

1. **Stale dev-server cache is a real failure mode.** When CSS / JSX changes look like they "didn't take effect," check `ss -tlnp \| grep :3000` for orphan `next-server` processes from prior sessions. `rm -rf .next` + `pkill -9 -f next-server` + restart fixes it.

2. **xterm needs `next/dynamic({ ssr: false })`.** The library reads `self` at module-evaluation time which crashes Next.js 16's RSC prerender. Any new page that imports `xterm` directly must wrap the import. The two existing call sites (`bootstrap/page.tsx`, `chat-phase-pane.tsx`) are the templates.

3. **Theme system is `data-theme` + Tailwind `@custom-variant dark`.** Don't add new `dark:` classes that depend on `prefers-color-scheme` — they won't fire when the user picks Light explicitly on a dark-OS machine. The variant rule in `globals.css` handles routing automatically.

4. **Phase-done gate uses pattern matching.** When adding a new BMAD phase, register its filename pattern in `src/app/api/capstone/handoff/generate/route.ts::ARTIFACT_PATHS` and `src/app/api/capstone/phase-done/route.ts::legacyStepName`. Don't hardcode an exact filename — trainees customize.

5. **`readBmadOutputFolder()` reads the trainee's choice from `config.yaml`.** Use it any time a phase-done check needs to find an artifact path. Same pattern, single helper.

6. **AI-attribution discipline holds.** Per `feedback_no_ai_attribution.md`, none of the 32 commits this session reference Claude/AI. Keep doing this.

7. **Browser walkthrough catches what the quad gate misses.** This session, the user surfaced: missing labs, hardcoded "Claude Code" copy, terminal scrollbar overlap, hallucinated ADR phase, missing sprint-planning gate, no logo, no theme toggle. Per `feedback_quad_gate_insufficient.md` — drive the surface in a real browser before declaring an arc done.

8. **Git identity** — commits use `Devbox <dudeitsdallyboy@gmail.com>` via per-command `GIT_AUTHOR_*` / `GIT_COMMITTER_*` env vars. Don't modify git config (`feedback` from prior session).

To resume, the next session reads in order:

1. This file (`session-state-2026-05-10.md`) — the snapshot
2. `_bmad-output/implementation-artifacts/deferred-work.md` — running carry-overs
3. `_bmad-output/planning-artifacts/epics.md` — for the broader backlog (Epic 11 remaining + Epic 12 closed + Epic 13 has 1 story)
4. `src/lib/capstone/phases/launch-commands.ts` + `shapes.ts` + `teaching-primers.ts` — the per-tool launch-command shape + phase metadata
5. `src/components/theme-provider.tsx` — the theme system surface (read this before adding new color rules anywhere)
6. `_bmad-output/implementation-artifacts/11-1-foundation-tokens-and-theme.md` — Story 11.1's full ACs (we shipped 5/6/7 of them)

---

## Total work this session

```
32 commits on main (since eebbf04 / 2026-05-09 prior session-state).
~+8,189 / -877 lines net.

Epic 12 — Curriculum Content Authoring: COMPLETE (12 stories shipped).
Epic 13 — Distribution: Story 13.1 shipped + build-verified.
Epic 11 — UI overhaul: focused subset shipped + Story 11.1 AC5/6/7 closed.
Capstone — ADR phase removed; implementation-readiness + sprint-planning added.
Lessons — renumbered to integer 7-lesson curriculum.
xterm — three rounds of hardening (clipping, init-race, SSR).
Devcontainer — Mac/Windows trainees now have a one-command path.
Source viewer — /source/[...path] route for in-repo file references.
Theme system — Light/Dark/Auto with no-FOUC inline init.
Brand slot — public/brand/logo.png is forkable.

5 pre-existing e2e failures confirmed unrelated (stash-and-rerun).
436/436 unit tests + lint clean at end of session.
1 session-state doc (this file).
```
