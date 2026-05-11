# Story 14.1: Capstone governance phase — author CODEOWNERS + CONTRIBUTING.md

**Epic:** 14 — Capstone Governance Phase
**Story Key:** 14-1-capstone-governance-phase
**Status:** ready-for-dev

## Story

As a capstone trainee who's just shipped my first BMAD story and now needs to codify how my team will collaborate on this repo going forward,
I want a guided "governance" phase that walks me through decisions about ownership routing, team ceremonies, and the AI-vs-non-AI contribution paths — and writes a `CODEOWNERS` file plus a `CONTRIBUTING.md` to my repo when we're done,
So that the capstone produces real, git-native team-governance artifacts I can `git add` and merge — not just a planning bundle that lives in `_bmad-output/`.

**Sequencing:** Lands AFTER `dev-story-1.1`, BEFORE the HANDOFF page. New phase order: `... → sprint-planning → dev-story-1.1 → governance → (handoff)`.

**Why portal-side prompt-flow rather than a new BMAD skill:** the templated conversation lives in the portal because (a) BMAD core ships no `bmad-create-codeowners` or `bmad-create-contributing` skill, (b) authoring proper skills + shipping upstream is a separate scoped effort, and (c) the existing PTY chat-phase plumbing already supports launching the trainee's chosen AI tool with an arbitrary opening prompt — we just substitute the BMAD slash command for a templated multi-paragraph prompt. Revisit (b) if the pattern proves out.

## Decision-point reference

The four decision points the templated prompt drives the AI to discover (the AI asks; the trainee decides; the AI synthesizes into the files):

1. **Ownership routing** — Who owns which paths? At minimum: who owns `_bmad/` (the BMAD config), who owns the planning artifacts, who owns code by area (e.g. `/src/api/`, `/infrastructure/`). Maps to `CODEOWNERS` rules.
2. **Team ceremonies** — Which BMAD ceremonies does the team commit to? Story-grooming cadence, sprint-planning rhythm, retrospective trigger ("after each epic" vs "monthly"), code-review SLAs. Maps to a "Team Ceremonies" section in `CONTRIBUTING.md`.
3. **AI-vs-non-AI contribution path** — Does the team accept contributions from people who don't use BMAD/AI? If yes, the CONTRIBUTING.md must describe a path that satisfies the same governance gates (CODEOWNERS approval, story exists, tests green) without requiring any AI tool. If no, the doc says so explicitly and the AI-required workflow becomes the single path.
4. **Branch protection** — A summary section reminding the trainee that CODEOWNERS alone doesn't enforce anything until they enable "require review from CODEOWNERS" in the repo's branch protection rules. The portal can't set this for them (no admin auth) — but CONTRIBUTING.md states it as a prerequisite for governance to actually function.

## Acceptance Criteria

**AC1 — `CapstonePhase` union extended**

- File: `src/lib/capstone/adapters/types.ts`.
- Add `"governance"` as a new member of the `CapstonePhase` discriminated union.
- The existing seven members (`brief`, `prd`, `architecture`, `epics-and-stories`, `implementation-readiness`, `sprint-planning`, `dev-story-1.1`) retain their identifiers unchanged.
- All Record-typed objects keyed by `CapstonePhase` (`PHASE_SHAPES`, `PHASE_TEACHING_PRIMERS`, any launch-command tables) become non-exhaustive at compile time and must be extended in subsequent ACs.

**AC2 — `PHASE_ORDER` + `nextPhase` extended**

- File: `src/lib/capstone/phases/shapes.ts`.
- `PHASE_ORDER` becomes `["brief", "prd", "architecture", "epics-and-stories", "implementation-readiness", "sprint-planning", "dev-story-1.1", "governance"]` (governance appended).
- `nextPhase("dev-story-1.1")` returns `"governance"`.
- `nextPhase("governance")` returns `null` (governance is now the terminal phase before HANDOFF).
- Vitest cases at `src/lib/capstone/phases/shapes.test.ts` cover both transitions.

**AC3 — `PHASE_SHAPES.governance` declared**

- File: `src/lib/capstone/phases/shapes.ts`.
- Add a `governance` entry to `PHASE_SHAPES` with:
  - `searchSubdir: "."` (repo root, NOT under `_bmad-output/`).
  - `artifactPatterns: [/^\.github\/CODEOWNERS$/, /^CODEOWNERS$/, /^\.github\/CONTRIBUTING\.md$/, /^CONTRIBUTING\.md$/]` (canonical-first ordering: prefer `.github/` for both files; fall back to repo root).
  - `minSizeBytes: 400` (governance docs that are too short are likely placeholder scaffolding).
- **Multi-file gate:** governance is the first phase that requires *both* CODEOWNERS *and* CONTRIBUTING.md present. The shape's `artifactPatterns` list both, but `validatePhaseShape` as it exists today returns on the first match. Extend `validatePhaseShape` (or add a sibling `validateGovernancePhaseShape` called from the phase-done route when `phase === "governance"`) so the gate requires one match from `[CODEOWNERS, .github/CODEOWNERS]` AND one match from `[CONTRIBUTING.md, .github/CONTRIBUTING.md]`. If only one of the two file types is present, the gate fails with a clear `reason` that names the missing file.
- The single-pattern flow remains the default for the seven prior phases — no behavior change for them.

**AC4 — Phase-done route updated for the multi-file gate**

- File: `src/app/api/capstone/phase-done/route.ts`.
- The route's `legacyStepName` registry adds the governance phase mapping (so the existing phase-done plumbing knows about it).
- When `phase === "governance"`, the route calls the multi-file validator from AC3.
- The route's response shape is unchanged (`{ ok, shapeValid, reason?, candidates?, ...}`); the only difference is `reason` may now name *which* of the two files is missing (e.g., `"CODEOWNERS present but CONTRIBUTING.md not found at .github/CONTRIBUTING.md or CONTRIBUTING.md"`).
- The route reads `outputFolder` from the trainee's BMAD config (existing `readBmadOutputFolder()` helper) but resolves the search dir as `chosenDir` directly (not joined with outputFolder), since governance files live at repo root.

**AC5 — `PHASE_TEACHING_PRIMERS.governance` declared**

- File: `src/lib/capstone/phases/teaching-primers.ts`.
- Add a `governance` entry following the established style guide in the file's header comment:
  - **`goal`** — One sentence: "Codify how your team will work together on this repo — both the *machine gate* (CODEOWNERS) that routes mandatory reviewers and the *human path* (CONTRIBUTING.md) that tells anyone — AI-using or not — how to propose a change."
  - **`skillDoes`** — 2–3 sentences. State explicitly that this phase is portal-driven (no BMAD slash command); it launches the trainee's chosen AI tool with a templated four-decision-point prompt and the AI writes both files when the conversation has enough material.
  - **`whatToExpect`** — 4–5 bullets covering: (1) ownership routing questions, (2) team ceremony decisions, (3) the AI-vs-non-AI contribution path question, (4) branch-protection summary, (5) the AI writes `.github/CODEOWNERS` + `CONTRIBUTING.md` and ends.
  - **`whyThisMatters`** — 1–2 sentences on the team-rituals thesis: planning artifacts in `_bmad-output/` describe *what* you'll build; governance files describe *how the team will build it together* — both are needed for BMAD adoption to survive past the trainee leaving.
  - **`artifactPath`** — `"CODEOWNERS + CONTRIBUTING.md (at repo root or under .github/)"` (literal string; no parameterization).

**AC6 — Templated prompt module**

- New file: `src/lib/capstone/governance/prompt-template.ts`.
- Single named export: `governancePromptTemplate(): string`.
- The returned string is the multi-paragraph opening prompt the AI tool receives at PTY spawn. Required content:
  - **Mission paragraph** — frame the goal: "You are helping the user author the team-governance files for this repo. By the end of this conversation you will write `.github/CODEOWNERS` (preferred path) or `CODEOWNERS` at repo root, AND `CONTRIBUTING.md` at repo root."
  - **Decision-point enumeration** — name all four decision points (ownership, ceremonies, AI-vs-non-AI, branch protection) verbatim so the prompt's structure is auditable.
  - **Non-AI contribution clause (verbatim)** — `"Ask the user explicitly whether the team accepts contributions from people who do NOT use BMAD or any AI tool. If yes, the CONTRIBUTING.md must include a 'Contributing without AI' section that describes a path satisfying the same governance gates — CODEOWNERS approval, a story spec exists in _bmad-output/, tests are green — without requiring any AI tool. If no, state explicitly in CONTRIBUTING.md that BMAD usage is required."`
  - **Write-target instruction (verbatim)** — `"Write CODEOWNERS to .github/CODEOWNERS (preferred) or CODEOWNERS at repo root. Write CONTRIBUTING.md to the repo root."`
  - **Tone instruction** — "Concrete, not placeholder. Reference the user's actual answers. Do not write `<your-team>` or `* @org/team` boilerplate."
- Vitest unit test at `src/lib/capstone/governance/prompt-template.test.ts`:
  - Asserts the template names all four decision points.
  - Asserts the template contains the literal string `".github/CODEOWNERS"` and `"CONTRIBUTING.md"` as write targets.
  - Asserts the template contains the literal phrase `"Contributing without AI"`.
  - Asserts the template contains the literal phrase `"do NOT use BMAD or any AI tool"`.

**AC7 — Launch command wiring**

- File: `src/lib/capstone/phases/launch-commands.ts`.
- Add a `governance` entry to whatever per-tool launch-shape table currently maps phases → argv. The shape replaces the BMAD-skill-as-positional-arg with the prompt-template string from AC6.
- For each of the three tools, the launch shape is:
  - **Claude Code:** `claude "<prompt-template>"` (the existing single-positional-arg shape).
  - **Codex:** `codex --dangerously-bypass-approvals-and-sandbox "<prompt-template>"`.
  - **GitHub Copilot:** `copilot --allow-all-tools -i "<prompt-template>"`.
- The prompt-template string is loaded from `governancePromptTemplate()` at launch time (not hardcoded into `launch-commands.ts`).
- A unit test at `src/lib/capstone/phases/launch-commands.test.ts` adds a case per tool that asserts the governance launch shape includes the prompt-template content.

**AC8 — `ARTIFACT_PATHS` extended in HANDOFF generator**

- File: `src/app/api/capstone/handoff/generate/route.ts`.
- Add TWO new entries to `ARTIFACT_PATHS` (after `sprint-planning`):
  - `{ phase: "governance:codeowners", dir: ".github", pattern: /^CODEOWNERS$/ }` with a fallback that also checks repo root for `CODEOWNERS` (extend the lookup loop to handle the `.github/` → root fallback for governance entries specifically; do not generalize to other phases).
  - `{ phase: "governance:contributing", dir: ".github", pattern: /^CONTRIBUTING\.md$/ }` with the same root fallback.
- Adjust the lookup loop so when a governance entry's `dir` doesn't yield a match, it falls back to checking `chosenDir` (repo root). All other entries retain the strict `outputFolder` join.
- The HANDOFF.md "What was produced" section now lists CODEOWNERS and CONTRIBUTING.md as separate line items (each with its actual resolved path + size).
- If only one of the two governance files exists, the missing one renders `*(not produced)*` per the existing convention.

**AC9 — HANDOFF template updated**

- File: `src/lib/capstone/handoff/render.ts` (or wherever `renderHandoff` resolves its template).
- The template's "What was produced" section is unchanged structurally — it just inherits the two new artifact lines from AC8.
- Add a new "Branch protection reminder" section to the template, placed after "Push instructions". Content (verbatim):
  > **Important:** `CODEOWNERS` only enforces mandatory review when your repo's branch protection rules require it. After pushing, go to **Settings → Branches → Branch protection rules → Add rule** for your default branch and enable **"Require a pull request before merging"** + **"Require review from Code Owners."** Without this, `CODEOWNERS` is documentation only.
- The existing template content for the seven prior phases is unchanged.
- A snapshot or content-assertion test under `src/lib/capstone/handoff/render.test.ts` covers the new section.

**AC10 — Capstone overview page renders the new phase**

- File: `src/app/capstone/page.tsx` (or wherever the phase list is rendered).
- The governance phase appears in the phase list with the same UI affordances as `dev-story-1.1`:
  - Teaching primer rendered above the terminal pane (via the existing `PhaseTeachingPanel` component).
  - Launch button that POSTs to `/api/capstone/chat-phase/spawn` with `phase: "governance"`.
  - Phase-done check button that POSTs to `/api/capstone/phase-done` with the same.
- The phase's "completed" state shows two file links via the existing `/source/[...path]` viewer:
  - `.github/CODEOWNERS` (or `CODEOWNERS` if found at root)
  - `CONTRIBUTING.md` (or `.github/CONTRIBUTING.md` if found there)
- The existing seven phases continue to render unchanged.
- Visual verification per `feedback_quad_gate_insufficient.md`: drive the surface in a browser and confirm the phase renders correctly in both light and dark theme.

**AC11 — Curriculum cross-references**

- Files: `training/lessons/04-codeowners-and-the-gate.md` (and the actual filename — adjust if it differs), `training/lessons/05-working-as-a-team.md`.
- Each lesson gains one short paragraph (~3 sentences) at the end pointing to the new governance phase. Format:
  > **In the capstone:** the governance phase (after you ship `dev-story-1.1`) is where you author your own `CODEOWNERS` / `CONTRIBUTING.md` for the project you just bootstrapped. [Open the capstone →](/capstone)
- No other curriculum content changes.
- The link-integrity scan (`npm run lint:links`) passes with the new internal links.

**AC12 — E2E test coverage**

- New file: `tests/e2e/capstone-governance-phase.spec.ts`.
- Test 1: phase renders. Seed a session through `dev-story-1.1` (reuse existing seed helper), navigate to the governance phase, assert the teaching primer renders and the launch button is present.
- Test 2: PTY spawn forwards prompt template. Using the existing `tests/fixtures/pty-fake-chat-phase.mjs` fixture pattern, click Launch and verify the spawn route forwards `tool`, `chosenDir`, `phase: "governance"`, AND that the spawned argv includes the governance prompt template (assert on the fixture's recorded argv).
- Test 3: phase-done multi-file gate. Programmatically create `.github/CODEOWNERS` (≥400 bytes) AND `CONTRIBUTING.md` (≥400 bytes) in a tmp `chosenDir`, POST to `/api/capstone/phase-done`, assert `shapeValid: true`.
- Test 4: phase-done fails when only CODEOWNERS exists. Same setup as Test 3 but omit CONTRIBUTING.md, assert `shapeValid: false` AND `reason` names CONTRIBUTING.md as the missing file.
- Test 5: phase-done fails when only CONTRIBUTING.md exists. Mirror of Test 4.
- All five tests run with the existing Playwright config; no new fixtures or harness changes beyond the spec file.

**AC13 — No regressions on existing test surface**

- All 436 existing unit tests pass.
- `npm run lint` clean.
- `npm run lint:links` clean (the AC11 cross-references add valid internal links).
- The 5 known pre-existing e2e failures (`capstone-overview` no-prior-session, 3× `capstone-chat-phase-pty`, `capstone-bootstrap-pty`) remain unchanged — Story 14.1 is not in scope for those and must not introduce new e2e failures.

**AC14 — End-to-end smoke (manual, post-implementation)**

- A trainee on a fresh devbox runs the capstone start-to-finish (or seeds a session up to `dev-story-1.1`), drives the new governance phase using their installed AI tool (Claude Code, Codex, or Copilot), and inspects the result:
  - `.github/CODEOWNERS` exists with concrete ownership rules reflecting their conversation answers (NOT placeholder `* @your-org/team` boilerplate).
  - `CONTRIBUTING.md` exists at repo root with concrete ceremony references (e.g., "we run `bmad-create-story` for each new spec; PRs require CODEOWNERS approval per `.github/CODEOWNERS`").
  - If they answered yes to "accept non-AI contributions," CONTRIBUTING.md includes a clearly-labeled "Contributing without AI" section.
  - Both files are valid for `git add` (no leftover prompt scaffolding, no `<placeholder>` strings, no stray markdown fences).
- HANDOFF.md generated post-governance lists both new files in "What was produced" + includes the branch-protection reminder section.

## Out of scope (deferred)

- **`bmad-create-codeowners` / `bmad-create-contributing` BMAD skills.** v1 is portal-side prompt-flow. Promote to proper skills if the pattern proves out and Cargill or BMAD-core wants the skill packaged.
- **Branch-protection automation.** CONTRIBUTING.md mentions it; the actual GitHub API call is the trainee's responsibility (requires repo admin auth the portal doesn't have).
- **Re-running the governance phase to update existing files.** v1 is single-shot; trainees who want to iterate edit the files directly.
- **Translation.** v1 prompt template is English-only.
- **Bot/automation contributor section** (dependabot, renovate, etc.) in CONTRIBUTING.md — out of scope; the AI may include it if the trainee asks, but it's not a required section.

## Notes for the implementer

- **Multi-file gate is the only novel pattern.** Six prior phases use single-pattern matching; governance needs two. Either extend `validatePhaseShape` with an optional "all of these pattern groups must match" mode, OR add a sibling `validateGovernancePhaseShape` called only when `phase === "governance"`. Pick whichever feels less invasive — the pattern only ever needs to support governance, so over-generalizing is a YAGNI risk.
- **Repo-root `searchSubdir`** is also new — every prior phase searches under `outputFolder`. The phase-done route's `chosenDir` join logic needs a small branch for governance.
- **Don't add CODEOWNERS / CONTRIBUTING.md to the bmad_demo repo itself** as part of this story unless explicitly requested separately — this is portal code that helps trainees author governance for *their* repos. The portal's own governance is a different decision.
- **The AI is responsible for the file content quality, not the portal.** The portal validates that files exist and meet a soft minimum size; downstream the trainee `git diff`s them and decides whether to keep, edit, or regenerate.
- **Stale dev-server cache** — per session-state pickup hint #1, when testing visually, kill any orphan `next-server` processes and `rm -rf .next` if changes don't appear.

## Dev Agent Record

(To be filled during implementation per `feedback_autonomous_push_dev_records.md`.)
