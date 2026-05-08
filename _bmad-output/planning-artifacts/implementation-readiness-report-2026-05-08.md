---
date: 2026-05-08
status: complete
stepsCompleted: ["discovery", "prd", "epics", "ux", "quality", "final"]
mode: synthesis
---

# Implementation Readiness Report

**Date:** 2026-05-08
**Scope:** Validate PRD ↔ Architecture ↔ Epics alignment ahead of Epic 3 kickoff (Stories 1.1–2.5 already shipped).
**Mode:** Single-pass synthesis covering all six step-file dimensions (discovery, PRD analysis, epic coverage, UX alignment, epic quality, final assessment). The skill's interactive multi-menu structure is consolidated here for solo-dev velocity.

---

## 1. Document inventory

| Doc | Path | Format | Status |
|---|---|---|---|
| PRD | `_bmad-output/planning-artifacts/prd.md` | Whole | ✅ Present |
| Product Brief | `_bmad-output/planning-artifacts/product-brief-bmad_demo.md` | Whole | ✅ Present |
| Product Brief Distillate | `_bmad-output/planning-artifacts/product-brief-bmad_demo-distillate.md` | Whole | ✅ Present |
| Architecture | `_bmad-output/planning-artifacts/architecture.md` | Whole | ✅ Present |
| Epics | `_bmad-output/planning-artifacts/epics.md` | Whole | ✅ Present |
| UX Design | (none) | — | ⚪ Not authored — narrow Server-Component UI; UX sufficient via architecture's "Frontend Architecture" section + the audience-card / lesson-nav patterns established in code |

**No duplicate (whole + sharded) versions.** No conflicts to resolve.

---

## 2. PRD requirements coverage — every FR maps to an epic/story

PRD lists 30 functional requirements (FR-1.1 through FR-6.6) plus NFRs across performance, accessibility, security, maintainability, reliability, and traceability axes.

### Functional requirements

| FR | Description (abbreviated) | Owning epic / story |
|---|---|---|
| FR-1.1 | Home with 3 audience entry points | Story 1.2 ✅ |
| FR-1.2 | Sequential 6-lesson navigation + completion state | Story 2.2 ✅ (nav) · Story 3.3 (completion) |
| FR-1.3 | Deep links to any lesson/lab/capstone step | Story 2.2/2.3 ✅ · Story 4.4 |
| FR-1.4 | Browser back/forward preserves state | Story 2.2 ✅ (Server Components → no client state) |
| FR-1.5 | Lesson links to repo artifacts via relative path | Story 2.1 ✅ (pipeline preserves verbatim) · Story 6.x (lesson content) |
| FR-1.6 | Stakeholder demo path | Story 2.3 ✅ (route) · Story 6.1 (content) |
| FR-1.7 | Facilitator guide path | Story 2.3 ✅ (route) · Story 6.1 (content) |
| FR-2.1 | Mark lesson complete | Story 3.3 |
| FR-2.2 | Mark lab run | Story 3.3 |
| FR-2.3 | Mark capstone steps complete | Story 4.1/4.4 |
| FR-2.4 | Progress in local SQLite | Story 3.1 |
| FR-2.5 | `npm run reset-progress` | Story 3.4 |
| FR-2.6 | No auth (intentional non-capability) | Story 3.5 (architectural enforcement) |
| FR-3.1 | Capstone start from lesson 6 | Story 4.3 (overview + resume) |
| FR-3.2–3.5 | Brief, epic, 2 stories, ADR via capstone | Story 4.4 |
| FR-3.6 | Capstone artifacts saved as files in working tree | Story 4.2 |
| FR-3.7 | Capstone resume from last completed step | Story 4.3 |
| FR-4.1–4.3 | Three labs (solo, sync, async) | Story 2.3 ✅ (routes/stubs) · Story 6.6 (content) |
| FR-4.4 | Facilitator selects lab format | Story 6.1 (facilitator guide content) |
| FR-5.1 | Markdown rendered at request time | Story 2.1 ✅ |
| FR-5.2 | Lesson prose links to repo artifacts | Story 6.x |
| FR-5.3 | Lesson 4 produces lead-review-checklist artifact | Story 6.3 |
| FR-5.4 | Lesson 5 — five named recovery loops | Story 6.4 |
| FR-5.5 | Per-tool friction notes (with reviewedAt header) | Story 6.7 (consumes Story 2.5 ✅ banner) |
| FR-5.6 | Team-rituals checklist | Story 6.7 |
| FR-5.7 | Coding-skill-neutral framing | Story 6.x (cross-cutting) |
| FR-5.8 | Stakeholder demo — procurement/SSO/lock-in objections | Story 6.1 |
| FR-5.9 | Facilitator guide — timing + prompts + common-Qs | Story 6.1 |
| FR-5.10 | Canonical story-file template | Story 6.7 |
| FR-5.11 | `AGENTS.md` shared-context template | Story 1.1 ✅ (placeholder) · Story 6.8 (customized) |
| FR-5.12 | `.github/copilot-instructions.md` | Story 5.1 (file shell) · Story 6.8 (content) |
| FR-6.1 | `.github/CODEOWNERS` real artifact | Story 5.1 |
| FR-6.2 | Branch-protection notes | Story 5.1 |
| FR-6.3 | PR template with story-link field | Story 5.1 |
| FR-6.4 | Top-level README | Story 1.3 ✅ |
| FR-6.5 | `npm install && npm run dev` works on macOS/Linux/WSL2 | Story 1.1 ✅ (Linux verified; macOS/WSL2 deferred to Story 5.6 cross-platform install checklist) |
| FR-6.6 | Discoverable npm scripts | Story 1.1 ✅ + Story 3.4 + Story 5.3 |

**Verdict:** ✅ Every FR maps to at least one epic/story. No orphaned requirements.

### Non-functional requirements

| NFR cluster | Owning epic / story |
|---|---|
| NFR-P1 cold-clone-to-running <5min | Story 1.1 ✅ + Story 5.6 cross-platform smoke |
| NFR-P2 lesson render <200ms | Story 5.4 (perf E2E) |
| NFR-P3 capstone save <500ms | Story 5.4 |
| NFR-P4 facilitator prep <2h | Story 6.1 (content quality) |
| NFR-A1 WCAG AA | Story 5.4 (axe E2E) |
| NFR-A2 axe-core in E2E | Story 5.4 |
| NFR-S1 zero runtime egress | Story 5.5 (network-interception E2E) |
| NFR-S2 no auth surface | Story 3.5 (architectural enforcement) |
| NFR-S3 npm audit | Story 5.6 |
| NFR-M1 any teammate can author content | Story 2.1 ✅ (plain markdown) |
| NFR-M2 facilitator self-sufficient | Story 6.1 |
| NFR-M3 bus factor disclosed | Story 1.3 ✅ |
| NFR-M4 staleness banner for tool-notes | Story 2.5 ✅ + Story 6.7 |
| NFR-R1 trainee golden path E2E | Story 5.3 |
| NFR-R2 lesson-to-artifact link integrity | Story 2.4 ✅ (static) + Story 5.5 (E2E DOM) |
| NFR-R3 reset-progress doesn't touch capstone outputs | Story 3.4 |

**Verdict:** ✅ Every NFR has an owning story. NFRs primarily concentrated in Epic 5 (governance + verification), which is correct sequencing.

---

## 3. Architecture alignment — locked decisions present in epics

| Architecture decision | Where it lands in epics |
|---|---|
| Next.js v16 App Router + Turbopack + TypeScript strict | Story 1.1 ✅ |
| Tailwind v4 (postcss + `@theme inline`) | Story 1.1 ✅ |
| `better-sqlite3` SQLite driver, hand-written SQL, single inline schema | Story 3.1 |
| Zod for server-side validation | Story 3.2 |
| App Router Route Handlers (no Server Actions) | Story 3.2, 4.2 |
| Server Components by default | All stories ✅ (consistently honored) |
| `remark` + `rehype` markdown pipeline (no MDX) | Story 2.1 ✅ |
| Playwright + `@axe-core/playwright` for E2E | Story 5.3, 5.4 |
| Vitest for pure functions | Story 5.2 (already partially landed in Stories 2.1 ✅, 2.2 ✅, 2.3 ✅, 2.4 ✅, 2.5 ✅) |
| Two paired CI pipelines (Vela + GHA mirror) | Story 5.7 |
| `_bmad-output/capstone/<utc-timestamp>/` capstone session id | Story 4.1, 4.2 |

**Architecture decisions outside locked epic stories — flagged for reconciliation:**

- 🔶 **Threshold inequality drift** — `architecture.md:231` says staleness fires at `now - reviewedAt > 120 days`; `epics.md:565` says "120 or more days" (≥). Story 2.5 sided with epics (≥). Architecture doc should be updated to match.
- 🔶 **AGENTS.md customization timing** — architecture treats AGENTS.md as a v1 deliverable; Story 1.1 ✅ shipped the create-next-app placeholder; Story 6.8 customizes content. Acceptable two-step landing.

---

## 4. UX alignment

No standalone UX design document exists. The `architecture.md` § "Frontend Architecture" section + the established component patterns (AudienceCard, LessonNav, StalenessBanner) carry the UX surface.

**UX-relevant assertions verified in shipped code:**

- ✅ Three-card audience pattern from FR-1.1 → AudienceCard with three accent variants (emerald/sky/amber)
- ✅ Sequential lesson nav from FR-1.2 → LessonNav top + bottom with "Lesson N of M"
- ✅ Server Components by default → all eight shipped stories
- ✅ All assets vendored locally → no external image hosts; Geist via `next/font/google` (build-time vendored)
- ✅ Color is not the only signal → AudienceCard (badge + icon + border), StalenessBanner (icon + "Stale" label + border-left)

**UX gaps surfaced by visual smoke (5/8 of this validation pass):**

- 🔴 `@tailwindcss/typography` plugin not installed → `prose` classes have no effect → all markdown content renders as a wall of unstyled text
- 🔴 `rehype-autolink-headings` `#` content visible to sighted users in heading text

These are filed as action items in §6 below. They are AC-passing per the literal AC text but a real UX regression.

---

## 5. Epic quality review

### Story shape

All 33 stories follow the same shape: title, "As a / I want / So that", AC list (Given/When/Then), no implementation details polluting the AC. Reviewed in spot checks on Stories 2.1, 2.2, 3.1, 4.3, 5.1, 6.4 — uniform.

### Dependency graph (high level)

```
Epic 1 (foundation) → Epic 2 (markdown + lesson nav) ↘
                                                       Epic 6 (content authoring)
Epic 3 (progress state) → Epic 4 (capstone)         ↗
                          ↓
                          Epic 5 (governance + CI verification)
```

**Verified dependencies:**
- ✅ Epic 2's Story 2.1 (markdown pipeline) is consumed by Stories 2.2, 2.3 — sequencing is right.
- ✅ Epic 3 starts with 3.1 (SQLite layer); 3.2 (API) and 3.3 (UI) build on it.
- ✅ Epic 4 explicitly notes the capstone-session schema-shape design point (architecture flagged this for resolution); Story 4.1 owns it.
- ✅ Epic 5 lands axe-core, no-egress, link-integrity DOM check, and CI — sequenced after content surface is mostly stable.
- ✅ Epic 6 is content authoring — placed last so the structural surface is stable before authors invest in real prose.

### AC quality

Spot-checked Stories 3.1, 3.4, 4.1, 5.4, 5.5, 6.4 for AC quality:

- ✅ ACs use Given/When/Then consistently.
- ✅ ACs name the artifacts they touch (file paths, route paths, npm scripts).
- ✅ "(intentional non-capability)" framing on FR-2.6 carries through to Story 3.5's AC structure.
- 🔶 Some Epic 5/6 ACs reference content that doesn't exist yet (`training/lead-review-checklist.md`, `training/team-rituals-checklist.md`, etc.) — that's correct; those stories author the content.

### Architecture-flagged design points

Architecture explicitly flags three "design points" needing resolution before/during implementation:

| Design point | Owning story | Status |
|---|---|---|
| Capstone-session schema shape | Story 4.1 | 🔶 Pending — Epic 4 |
| `src/db/` consolidation (single dir for schema + connection) | Story 3.1 | 🔶 Pending — Epic 3 |
| `audience-card` promotion (rule of three) | Story 1.2 | ✅ Resolved |

---

## 6. Final assessment

### Readiness verdict for Epic 3 kickoff

**✅ READY** — Epic 3 (Trainee Progress State & Reset) can start immediately. No spec gaps prevent the first story.

### Readiness sub-scores

| Dimension | Score | Notes |
|---|---|---|
| Document completeness | ✅ 5/5 | All required artifacts present; no duplicates |
| FR coverage | ✅ 5/5 | Every FR-X.Y maps to a story |
| NFR coverage | ✅ 5/5 | Every NFR has an owning story (mostly Epic 5) |
| Architecture↔epics alignment | 🔶 4/5 | One drift point (threshold inequality) |
| UX surface | 🔶 3/5 | Two visual regressions surfaced; AC-passing but UX-broken |
| Epic quality | ✅ 5/5 | Sequencing, dependencies, AC shape all consistent |
| Pre-Epic-3 prep | ✅ 5/5 | Epic 1+2 deliver a stable scaffold; no blockers |

**Overall readiness: 32/35.** Strong. Two filed action items to clear before Epic 3 closes (not blocking the kickoff).

### Action items from this readiness check

| # | Action | Severity | Where it lands |
|---|---|---|---|
| R1 | **Install `@tailwindcss/typography` plugin** so `prose` classes apply to markdown-rendered routes | HIGH | Should land before any Epic 6 content authoring; otherwise lessons read as walls of unstyled text |
| R2 | **Hide the `rehype-autolink-headings` `#` from sighted users** via CSS (e.g. `.heading-anchor { @apply opacity-0 group-hover:opacity-100; }` on the heading) OR drop the `content` and rely on `aria-label` only | HIGH | Same scope as R1; address together |
| R3 | **Reconcile architecture-doc threshold drift** (`> 120` vs `≥ 120`) | LOW | Architecture-doc edit; quick |
| R4 | **`better-sqlite3` build smoke** before Story 3.1 commits app code | MED | Single command (`npm i better-sqlite3 && node -e "require('better-sqlite3')"`); land in Story 3.1's first commit |

### Pre-existing carry-overs from `deferred-work.md`

29 items. Highest-leverage clusters mapped to Epic 5: cross-platform install verification · Node 22 LTS verification · port-collision guards · axe-core a11y · `next/font/google` no-egress · paired CI · `next-env.d.ts` typecheck-before-build.

### Significant discoveries flag

🚨 **Two HIGH visual regressions** (R1, R2 above) flagged by the visual-smoke pass. These slipped past the Epic 1+2 string-based test net because no test asserts on rendered CSS. Recommend addressing them BEFORE Epic 6 content authoring, otherwise authors will be writing prose that renders as unreadable text.

### Recommendation

Proceed to Epic 3 / Story 3.1. Park R1+R2 as a small follow-on commit (or fold into the start of Epic 3). R3 is a doc edit. R4 is a one-line spike that fits inside Story 3.1.
