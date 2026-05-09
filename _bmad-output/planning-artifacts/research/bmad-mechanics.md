# BMAD Mechanics — Research Artifact

> Research input for the 6-lesson `bmad_demo` curriculum. **Not** trainee-facing prose. Every claim is grounded in either (a) the official BMAD documentation at `bmadcode.com` / `docs.bmad-method.org` / the public GitHub repo, or (b) the BMAD 6.6.0 source installed in this repo at `_bmad/` and `.claude/skills/bmad-*/`. Open questions are flagged at the end.
>
> Frozen on **BMAD v6.6.0** — the version installed in this repo (`_bmad/_config/manifest.yaml`, `_bmad/bmm/config.yaml` header, `_bmad/core/config.yaml` header).

---

## 1. What BMAD is

### 1.1 Name and origin

"BMAD" is overloaded across the ecosystem and the official sources expand the acronym two different ways depending on context:

- The bmadcode.com landing page renders the framework name as **"BMad Method"** — *Build More, Architect Dreams* — and credits **Brian Madison** ("BMad") as creator and maintainer ([bmadcode.com](https://bmadcode.com/)).
- The public GitHub README expands BMAD as **"Breakthrough Method for Agile AI Driven Development"** ([github.com/bmad-code-org/BMAD-METHOD](https://github.com/bmad-code-org/BMAD-METHOD)).

Both expansions describe the same project. In curriculum prose treat "BMAD" and "BMad Method" as the same thing; if disambiguation is needed, reserve "BMM" for the *BMad Method module* (one of several modules — see §1.4).

### 1.2 What problem it solves

From the GitHub README ([github.com/bmad-code-org/BMAD-METHOD](https://github.com/bmad-code-org/BMAD-METHOD)): BMAD is

> "the best and most comprehensive Agile AI Driven Development framework that has true scale-adaptive intelligence that adjusts from bug fixes to enterprise systems."

Stated philosophy (same source): rather than letting AI think *for* the user, "BMad agents and facilitated workflows act as expert collaborators who guide you through a structured process."

Operationally this resolves to: a fixed, opinionated chain of artifacts (brief → PRD → architecture → epics → stories → dev story) authored through facilitated AI workflows, with the artifacts themselves carrying enough structured context that a downstream "dev" agent can implement them without re-discovering scope. The framework's central bet is that *context engineering*, not prompt engineering, is what makes AI-assisted development reliable at team scale (paraphrased from the bmadcode.com landing copy: "context engineering killed prompt engineering").

### 1.3 Maintainer and license

- **Maintainer:** Brian Madison ("BMad"), via the `bmad-code-org` GitHub organization ([github.com/bmad-code-org](https://github.com/bmad-code-org/BMAD-METHOD)).
- **License:** Open source ("100% open source. Always free." — bmadcode.com).
- **Community:** Discord at `discord.com/invite/gk8jAdXWmj` (linked from bmadcode.com).

### 1.4 Modules in the v6 ecosystem

BMAD v6 is modular. The official documentation home ([docs.bmad-method.org](https://docs.bmad-method.org/)) and corroborating search results identify these top-level modules:

| Module | Code | Purpose |
|---|---|---|
| BMad Method | **BMM** | Core methodology — the four-phase analysis→implementation pipeline. |
| BMad Builder | **BMB** | Meta-module: author new BMad agents, workflows, and publishable modules. |
| Test Architect | **TEA** | Risk-based test strategy and automation. |
| Game Dev Studio | **BMGD** | Unity / Unreal / Godot game-dev workflows. |
| Creative Intelligence Suite | **CIS** | Innovation, brainstorming, design thinking. |

This portal installs only the first two layers — `core` and `bmm` — per `_bmad/_config/manifest.yaml`:

```yaml
modules:
  - name: core
    version: 6.6.0
    source: built-in
  - name: bmm
    version: 6.6.0
    source: built-in
ides:
  - claude-code
```

So when this curriculum talks about BMAD it is in practice talking about **BMM 6.6.0 + Core 6.6.0**, integrated against Claude Code as the IDE host. BMB, TEA, BMGD, CIS are referenced for completeness but not installed here.

### 1.5 Version pinning

Three independent sources in the installed tree confirm 6.6.0:

- `_bmad/_config/manifest.yaml` → `installation.version: 6.6.0`, `installDate: 2026-05-07T19:51:18.364Z`.
- `_bmad/bmm/config.yaml` header comment: `# Version: 6.6.0`.
- `_bmad/core/config.yaml` header comment: `# Version: 6.6.0`.

The installed version was current as of May 2026 (search corroborates "v6.6.0 (April 29, 2026)"). The curriculum should describe the framework as it exists at this pin and avoid forward-looking claims about features only present on `main`.

---

## 2. The methodology phase model

### 2.1 The four phases

BMM organizes work into a strictly ordered four-phase pipeline. The ordering is encoded in the directory structure under `_bmad/bmm/` and in the `phase` column of the per-module skill manifest (`_bmad/bmm/module-help.csv`):

| # | Phase directory | Phase token in manifest | What it produces |
|---|---|---|---|
| 1 | `_bmad/bmm/1-analysis/` | `1-analysis` | Brainstorming output, market/domain/technical research, product brief or PRFAQ. |
| 2 | `_bmad/bmm/2-plan-workflows/` | `2-planning` | PRD; optional UX design. |
| 3 | `_bmad/bmm/3-solutioning/` | `3-solutioning` | Architecture; epics-and-stories list; project context; implementation-readiness report. |
| 4 | `_bmad/bmm/4-implementation/` | `4-implementation` | Sprint plan; per-story spec files; dev-story execution; code review; retrospective. |

Note: in this installed copy the four phase directories exist as scaffolding but are mostly empty — the actual `SKILL.md` files for BMM skills live under `.claude/skills/bmad-*/SKILL.md` (Claude Code's skill location). The phase grouping survives in the `path` column of `_bmad/_config/skill-manifest.csv` and the `phase` column of `_bmad/bmm/module-help.csv`. The phase directories under `_bmad/bmm/` are the *canonical* phase home for source distributions; this repo's IDE-specific install reflects them by reference rather than by physical location.

### 2.2 Phase-by-phase grounding

Each row below is grounded in `_bmad/bmm/module-help.csv` and the skill manifest at `_bmad/_config/skill-manifest.csv`.

**Phase 1 — Analysis** (`_bmad/bmm/1-analysis/`)

| Skill | Menu code | Output | Owning agent |
|---|---|---|---|
| `bmad-brainstorming` | BP | brainstorming session | (core, surfaced via Mary) |
| `bmad-market-research` | MR | research documents | Mary (analyst) |
| `bmad-domain-research` | DR | research documents | Mary |
| `bmad-technical-research` | TR | research documents | Mary |
| `bmad-product-brief` | CB | product brief | Mary |
| `bmad-prfaq` | WB | PRFAQ document | Mary |
| `bmad-document-project` | DP | project knowledge | Paige (tech writer) |

PRFAQ and Product Brief are alternatives — the manifest description for `bmad-prfaq` calls itself "alternative to product brief" and for `bmad-product-brief` "a gentler approach than PRFAQ when you are already sure of your concept".

**Phase 2 — Planning** (`_bmad/bmm/2-plan-workflows/`)

| Skill | Menu code | Output | Owning agent | Required? |
|---|---|---|---|---|
| `bmad-create-prd` | CP | PRD | John (PM) | **required** |
| `bmad-validate-prd` | VP | PRD validation report | John | optional, after CP |
| `bmad-edit-prd` | EP | updated PRD | John | optional, after VP |
| `bmad-create-ux-design` | CU | UX design | Sally (UX) | optional, after CP |

`required=true` on `bmad-create-prd` per `_bmad/bmm/module-help.csv` — the PRD is a hard gate before phase 3.

**Phase 3 — Solutioning** (`_bmad/bmm/3-solutioning/`)

| Skill | Menu code | Output | Owning agent | Required? |
|---|---|---|---|---|
| `bmad-create-architecture` | CA | architecture | Winston (architect) | **required** |
| `bmad-create-epics-and-stories` | CE | epics and stories | John / shared | **required**, after CA |
| `bmad-check-implementation-readiness` | IR | readiness report | John | **required**, after CE |
| `bmad-generate-project-context` | GPC | project context | (cross-cutting) | optional |

The chain `bmad-create-architecture` → `bmad-create-epics-and-stories` → `bmad-check-implementation-readiness` is enforced by the `after` column in the manifest — each step lists its predecessor explicitly. `IR` is the gate before phase 4.

**Phase 4 — Implementation** (`_bmad/bmm/4-implementation/`)

| Skill | Menu code | Output | Owning agent | Required? |
|---|---|---|---|---|
| `bmad-sprint-planning` | SP | sprint status | Amelia (dev) | **required** |
| `bmad-sprint-status` | SS | (status summary) | Amelia | optional, after SP |
| `bmad-create-story` (action: `create`) | CS | story | Amelia | **required**, after SP |
| `bmad-create-story` (action: `validate`) | VS | story validation report | Amelia | optional, after CS |
| `bmad-dev-story` | DS | (implementation) | Amelia | **required**, after VS |
| `bmad-code-review` | CR | (review) | Amelia | optional, after DS |
| `bmad-correct-course` | CC | change proposal | (cross-cutting) | anytime |
| `bmad-retrospective` | (n/a in BMM CSV) | retrospective | Amelia | post-epic |
| `bmad-quick-dev` | QQ | spec + implementation | Amelia | shortcut path, anytime |

The phase-4 inner loop is `CS → VS → DS → CR` per story, repeated until the epic is complete. `QQ` (quick-dev) is an off-pipeline single-shot path that produces both spec and implementation in one workflow run — used for bug fixes and small changes that don't justify the full chain. Source: `_bmad/bmm/module-help.csv` and `_bmad/bmm/4-implementation/bmad-quick-dev/SKILL.md`.

### 2.3 Phase ordering is hard

The phase ordering is enforced *structurally* through three independent mechanisms in the source:

1. **Directory naming.** Phase directories are numerically prefixed (`1-analysis`, `2-plan-workflows`, `3-solutioning`, `4-implementation`).
2. **Manifest `phase` column.** Every BMM skill in `_bmad/bmm/module-help.csv` is tagged with one of `anytime` or a numbered phase token.
3. **Manifest `after` / `before` / `required` columns.** Within and across phases, `after` declares predecessor skills, `before` declares successors, and `required=true` marks gates.

The `bmad-help` skill uses these columns (per `_bmad/core/bmad-help/SKILL.md` referenced in `_bmad/_config/skill-manifest.csv`) to answer "where am I" and "what's next" by scanning artifact outputs against the phase manifest. This means the curriculum can ground "what comes next" on the same data the framework itself uses, rather than restating the rules as folklore.

---

## 3. The artifact chain

### 3.1 The chain at a glance

The pipeline produces this chain of artifacts. Each row's "produced by" cites the canonical skill name; "constrains" names the downstream skill that uses the artifact as input. Output paths are taken from the `output-location` column of `_bmad/bmm/module-help.csv` resolved against `_bmad/bmm/config.yaml` (`planning_artifacts: "{project-root}/_bmad-output/planning-artifacts"`, `implementation_artifacts: "{project-root}/_bmad-output/implementation-artifacts"`).

| Artifact | Produced by | Output path | Constrains (consumed by) |
|---|---|---|---|
| Brainstorming session | `bmad-brainstorming` | `{output_folder}/brainstorming` | product brief / PRFAQ |
| Market / domain / technical research | `bmad-market-research`, `bmad-domain-research`, `bmad-technical-research` | `planning_artifacts` (or `project_knowledge`) | product brief / PRFAQ |
| **Product brief** *(or PRFAQ)* | `bmad-product-brief` (or `bmad-prfaq`) | `planning_artifacts/product-brief-<project>.md` | `bmad-create-prd` |
| **PRD** | `bmad-create-prd` | `planning_artifacts/prd.md` | `bmad-create-ux-design`, `bmad-create-architecture`, `bmad-create-epics-and-stories` |
| UX design (optional) | `bmad-create-ux-design` | `planning_artifacts/ux-design.md` | `bmad-create-architecture` |
| **Architecture** | `bmad-create-architecture` | `planning_artifacts/architecture.md` | `bmad-create-epics-and-stories` |
| Project context | `bmad-generate-project-context` | `output_folder/project-context.md` | every downstream agent (loaded as persistent fact) |
| **Epics + stories list** | `bmad-create-epics-and-stories` | `planning_artifacts/epics.md` | `bmad-check-implementation-readiness`, `bmad-sprint-planning` |
| Implementation-readiness report | `bmad-check-implementation-readiness` | `planning_artifacts/implementation-readiness-report-*.md` | gate to phase 4 |
| **Sprint plan** | `bmad-sprint-planning` | `implementation_artifacts/` | `bmad-create-story` |
| **Story file** (per story) | `bmad-create-story` (action `create`) | `implementation_artifacts/<story>.md` | `bmad-dev-story` |
| Story validation report | `bmad-create-story` (action `validate`) | `implementation_artifacts/` | gate before `bmad-dev-story` |
| Dev story execution (code) | `bmad-dev-story` | (modifies repo + story file) | `bmad-code-review` |
| Code review | `bmad-code-review` | (review output) | next story or epic-end retro |
| Retrospective (post-epic) | `bmad-retrospective` | (retro output) | next epic |

The bolded rows are the artifacts the curriculum will most directly teach.

### 3.2 Each artifact in detail

**Product brief** — `bmad-product-brief` ([`.claude/skills/bmad-product-brief/SKILL.md`](../.claude/skills/bmad-product-brief/SKILL.md))

Produces a "1-2 page executive product brief" plus an optional "token-efficient LLM distillate capturing all the detail for downstream PRD creation" (skill SKILL.md). Has three activation modes — `--autonomous` / `--yolo` / guided (default). The dual-output design — human brief + LLM distillate — is what lets downstream PRD creation skip rediscovering scope. Output goes to `planning_artifacts/`.

**PRD** — `bmad-create-prd` ([`.claude/skills/bmad-create-prd/SKILL.md`](../.claude/skills/bmad-create-prd/SKILL.md))

Twelve-step facilitated workflow under `steps-c/step-01-init.md` … `step-12-complete.md`. The skill enforces "step-file architecture": only one step file is loaded at a time, sequence is strict, document is built append-only, and a `stepsCompleted` array in the output frontmatter tracks state. Outputs to `planning_artifacts/prd.md`.

The skill SKILL.md states the critical rules verbatim:
> "🛑 NEVER load multiple step files simultaneously … 🚫 NEVER skip steps or optimize the sequence … ⏸️ ALWAYS halt at menus and wait for user input … 📋 NEVER create mental todo lists from future steps."

This is the same `step-file architecture` pattern used by `bmad-create-architecture`, `bmad-create-epics-and-stories`, `bmad-check-implementation-readiness`, `bmad-dev-story`, `bmad-quick-dev`, and others — see §4.4.

**UX design** — `bmad-create-ux-design`. Optional. Output: `planning_artifacts/ux-design.md` (this repo also produces a sibling `ux-design-directions.html` artifact, observed in `_bmad-output/planning-artifacts/`). Owned by Sally.

**Architecture** — `bmad-create-architecture` ([`.claude/skills/bmad-create-architecture/SKILL.md`](../.claude/skills/bmad-create-architecture/SKILL.md))

Phrased in the SKILL.md as a "collaborative step-by-step discovery that ensures AI agents implement consistently." Owned by Winston. Same micro-file step architecture as PRD. Output: `planning_artifacts/architecture.md`.

**Epics + stories list** — `bmad-create-epics-and-stories` ([`.claude/skills/bmad-create-epics-and-stories/SKILL.md`](../.claude/skills/bmad-create-epics-and-stories/SKILL.md))

> "Transform PRD requirements and Architecture decisions into comprehensive stories organized by user value, creating detailed, actionable stories with complete acceptance criteria for the Developer agent."

Output: `planning_artifacts/epics.md`. Required input: PRD + architecture. The skill explicitly frames itself as a *requirements decomposer* — translating requirements into ACs that Amelia (dev agent) can execute without ambiguity.

**Implementation-readiness report** — `bmad-check-implementation-readiness` ([`.claude/skills/bmad-check-implementation-readiness/SKILL.md`](../.claude/skills/bmad-check-implementation-readiness/SKILL.md))

> "Validate that PRD, UX, Architecture, Epics and Stories are complete and aligned before Phase 4 implementation starts, with a focus on ensuring epics and stories are logical and have accounted for all requirements and planning."

Hard gate before Phase 4. Acts as a traceability check. This is the artifact that closes the loop from PRD → architecture → epics, surfacing requirements that don't yet have story coverage.

**Sprint plan** — `bmad-sprint-planning`. Output to `implementation_artifacts`. The plan sequences stories for execution.

**Story file** — `bmad-create-story` ([`.claude/skills/bmad-create-story/SKILL.md`](../.claude/skills/bmad-create-story/SKILL.md))

The most critical artifact in the chain, and the skill SKILL.md emphasizes that explicitly:
> "Your purpose is NOT to copy from epics — it's to create a comprehensive, optimized story file that gives the DEV agent EVERYTHING needed for flawless implementation."
> "EXHAUSTIVE ANALYSIS REQUIRED: You must thoroughly analyze ALL artifacts to extract critical context — do NOT be lazy or skim! This is the most important function in the entire development process!"

Has two actions: `create` (new story file) and `validate` (story validation report). Output: `implementation_artifacts/<story>.md`.

The story file is the "tool-agnostic contract" that the curriculum's three-tool capstone is meant to demonstrate (see §6).

**Dev-story execution** — `bmad-dev-story` ([`.claude/skills/bmad-dev-story/SKILL.md`](../.claude/skills/bmad-dev-story/SKILL.md))

Owned by Amelia. Reads the story file produced by `bmad-create-story`, executes its tasks/subtasks, modifies code, updates story file's "Dev Agent Record" section. The skill enforces single-shot execution:
> "Absolutely DO NOT stop because of 'milestones', 'significant progress', or 'session boundaries'. Continue in a single execution until the story is COMPLETE (all ACs satisfied and all tasks/subtasks checked) UNLESS a HALT condition is triggered or the USER gives other instruction."

Story file regions Amelia is allowed to modify: "Tasks/Subtasks checkboxes, Dev Agent Record (Debug Log, Completion Notes), File List, Change Log, and Status."

**Code review** — `bmad-code-review` ([`.claude/skills/bmad-code-review/SKILL.md`](../.claude/skills/bmad-code-review/SKILL.md))

Per `_bmad/bmm/module-help.csv`: "If issues back to DS if approved then next CS or ER if epic complete." The skill SKILL.md describes its operating model:
> "You are an elite code reviewer. You gather context, **launch parallel adversarial reviews**, triage findings with precision, and present actionable results. No noise, no filler."

Three named review layers, per the skill's frontmatter description:
- **Blind Hunter** — adversarial reviewer that doesn't see the spec; tries to break the code from cold.
- **Edge Case Hunter** — walks every branching path and boundary condition (orthogonal to adversarial — method-driven, not attitude-driven; the same name appears in the core skill `bmad-review-edge-case-hunter`).
- **Acceptance Auditor** — checks the code against the story's acceptance criteria for traceability.

The three layers run in parallel as separate analyses, then findings are triaged into "structured … actionable categories" (frontmatter wording). This pattern — multiple reviewers operating from different stances against the same artifact — is the same shape used by `bmad-party-mode` for multi-agent discussion (see §5.6).

**Retrospective** — `bmad-retrospective`. Post-epic. "Extract lessons and assess success" (skill description).

### 3.3 ADR — open question

The task spec asks the artifact chain to cover "ADR" (Architecture Decision Record). I could not find a dedicated `bmad-create-adr` or `bmad-adr` skill in the installed manifest (`_bmad/_config/skill-manifest.csv`) or the `.claude/skills/` tree. The architecture artifact produced by `bmad-create-architecture` is a single `architecture.md` document, not an ADR series.

Open question — flagged in §8 — whether ADRs are produced inside `architecture.md` as sections, or whether there's a dedicated ADR skill on `main` that 6.6.0 doesn't expose, or whether ADRs are simply not first-class in BMM 6.6.0.

### 3.4 What "constrains" means in practice

Each artifact constrains the next via two distinct mechanisms:

1. **Persistent facts.** Every `customize.toml` in this install ships with `persistent_facts = ["file:{project-root}/**/project-context.md"]`. When a downstream agent activates, it loads this file as foundational context (per the Step 4 of activation in every SKILL.md). Authoring teams add the upstream artifact path here so it's always present.
2. **Workflow input discovery.** Each step-file workflow (`bmad-create-prd`, `bmad-create-architecture`, `bmad-create-epics-and-stories`, etc.) opens with a `step-01-init.md` that scans `planning_artifacts/` for upstream artifacts and refuses to proceed if required predecessors are missing. The `bmad-check-implementation-readiness` skill formalizes this as a standalone validation pass.

The result is that the chain is enforced both *prospectively* (downstream activation can fail-fast if upstream missing) and *retrospectively* (the readiness check catches drift).

---

## 4. Skills, agents, workflows — the structural layer

### 4.1 Two kinds of installed object

Every `bmad-*` directory under `.claude/skills/` and the manifest at `_bmad/_config/skill-manifest.csv` is one of two things:

- **An agent skill** — by convention named `bmad-agent-<role>` — defines a named persona (Mary, John, Winston, Amelia, Sally, Paige) and a menu of callable workflow skills. The `customize.toml` for an agent skill carries an `[agent]` block.
- **A workflow skill** — every other `bmad-*` skill (`bmad-create-prd`, `bmad-dev-story`, `bmad-quick-dev`, etc.) — is a step-driven workflow that produces a specific artifact. Its `customize.toml` carries a `[workflow]` block (mirror of the `[agent]` block, minus persona fields).

Both kinds use the same activation contract (§4.3) and the same three-layer customization (§4.2).

The 42 BMAD-related skills surfaced by Claude Code's skill list in this install correspond exactly to the rows in `_bmad/_config/skill-manifest.csv` plus a few core skills. The skill manifest splits them by `module` column: 12 `core` + 30 `bmm` = 42.

### 4.2 The three-layer customization contract

Source of truth: `_bmad/scripts/resolve_customization.py`. Every customizable agent/workflow skill ships a `customize.toml` next to its `SKILL.md`. At activation, the resolver merges three TOML files in this order (highest priority last):

1. `{skill-root}/customize.toml` — **defaults**, shipped with the skill, regenerated on every BMAD update.
2. `{project-root}/_bmad/custom/{skill-name}.toml` — **team / org overrides**, committed to the repo.
3. `{project-root}/_bmad/custom/{skill-name}.user.toml` — **personal overrides**, gitignored (`_bmad/custom/.gitignore` blocks `*.user.toml`).

The resolver implements *structural* (not field-name-special-cased) merge rules:

- **Scalars** (string, int, bool, float): override wins.
- **Tables**: deep merge.
- **Arrays of tables** where every item shares the *same* identifier field (every item has `code` *or* every item has `id`): merge by that key — matching keys replace, new keys append.
- **All other arrays** (including mixed-key arrays): append.
- **No removal mechanism.** Overrides cannot delete base items. To suppress a default, fork the skill or override-by-code with a no-op.

The resolver requires Python 3.11+ (uses stdlib `tomllib`). Fallback: every SKILL.md spells out a manual three-file read in case the resolver fails (see e.g. `bmad-agent-pm/SKILL.md` Step 1).

A second customization surface — *central config* — handles cross-cutting concerns:

- `_bmad/config.toml` — installer-managed base config (project name, agent roster, paths). Header explicitly says: "Direct edits to this file will be overwritten on the next install."
- `_bmad/config.user.toml` — installer-managed personal scope (`user_name`, `communication_language`, `user_skill_level`).
- `_bmad/custom/config.toml` — committed team override of central config.
- `_bmad/custom/config.user.toml` — gitignored personal override of central config.

The agent roster and per-agent descriptors live in the central `_bmad/config.toml` under `[agents.bmad-agent-*]` blocks (verified in this repo's installed copy). Per-skill `customize.toml` files contain the *behavior* of that skill; the central config carries the *roster* — which agents exist, what team they belong to, which module they ship in.

### 4.2.1 Resolver edge cases worth surfacing in curriculum

Reading `_bmad/scripts/resolve_customization.py` directly surfaces a few non-obvious behaviors:

- **No removal mechanism, intentionally.** From the script docstring: "Overrides cannot delete base items. To suppress a default, fork the skill or override the item by code with a no-op description/prompt." Curriculum implication: a team can't *remove* a menu item via override; they can only replace its description/prompt with a no-op. This is a deliberate immutability guarantee — base behavior is always present, customizations only *add or replace*.
- **Mixed-key arrays fall through to append.** If an array of tables has *some* items with `code` and *others* with `id`, the resolver does not attempt to merge by key — it just concatenates. Authoring a `customize.toml` override that mixes keys is therefore a schema smell that silently produces append semantics rather than the keyed merge the user might expect.
- **Project-root discovery prefers the skill's location, not cwd.** The resolver walks up from the skill directory looking for `_bmad/` or `.git/`, only falling back to `find_project_root(Path.cwd())` if the skill isn't inside a recognized project tree. Quoting the script comment: "Using cwd first is unsafe when an ancestor of cwd happens to have a stray `_bmad/` from another project." Curriculum implication: a skill installed inside a project always merges against *that* project's `_bmad/custom/`, even when invoked from a different working directory.
- **Python 3.11+ hard requirement.** The resolver uses stdlib `tomllib` — no `pip install`, no virtualenv. If Python < 3.11 is the only Python available, every skill's SKILL.md provides a fallback contract: hand-merge the three TOML files using the same structural rules.
- **Three layers, last wins.** Final order applied: skill defaults → team override → user override. User override wins. Team override wins over defaults but is overridden by user. Defaults always lose if either override touches the field (with the array exceptions above).

### 4.3 The activation contract — eight steps

Every agent SKILL.md and every workflow SKILL.md follows the same activation skeleton. From `bmad-agent-pm/SKILL.md` (canonical example):

1. **Resolve the agent / workflow block** — call `resolve_customization.py --skill {skill-root} --key agent` (or `--key workflow` for workflow skills). Fallback: hand-merge the three TOML files.
2. **Execute prepend steps** — every entry in `{agent.activation_steps_prepend}` runs *before* persona adoption / config / greeting. Used for pre-flight loads, compliance checks.
3. **Adopt persona** *(agents only — workflow skills replace this with "Load Persistent Facts")*. Layer the customized `role`, `identity`, `communication_style`, `principles` over the hardcoded persona (e.g. "John / Product Manager").
4. **Load persistent facts** — every entry in `{agent.persistent_facts}` is loaded as foundational session context. Entries prefixed `file:` are paths or globs under `{project-root}`; everything else is a literal fact.
5. **Load config** — read `_bmad/bmm/config.yaml`; resolve `{user_name}`, `{communication_language}`, `{document_output_language}`, `{planning_artifacts}`, `{project_knowledge}`.
6. **Greet user** — by `{user_name}`, in `{communication_language}`, prefixed with `{agent.icon}`. Workflow skills greet generically.
7. **Execute append steps** — every entry in `{agent.activation_steps_append}` runs after greet, before menu. Used for context-heavy setup the user shouldn't wait blank-screen for.
8. **Dispatch or present menu** — agents render `{agent.menu}` as a numbered table (`Code` / `Description` / `Action`) and **stop, waiting for input**, unless the user's initial message already names an intent that maps to a menu item. Workflow skills skip this step and start the workflow.

The `prepend` / `append` ordering is critical and the `bmad-agent-pm/SKILL.md` makes the rationale explicit:

> "[prepend] runs before greeting so the agent can load context it needs to personalize the greeting. [append] runs after greeting so the user isn't staring at a blank terminal while heavy scans complete."

### 4.4 Step-file architecture — workflow execution

Multi-step workflow skills (PRD, architecture, epics, dev-story, etc.) use what their SKILL.md files call **"step-file architecture"** or **"micro-file architecture"**. The discipline, quoted from `bmad-create-prd/SKILL.md`:

- **Micro-file Design** — each step is a self-contained instruction file.
- **Just-In-Time Loading** — only the current step file is in memory; never load future step files until told to do so.
- **Sequential Enforcement** — order in step files is strict; no skipping, no optimization.
- **State Tracking** — progress captured in the output document's frontmatter `stepsCompleted` array.
- **Append-Only Building** — documents grow by appending content per step direction, never re-writing earlier sections.

Critical-rules block (verbatim from `bmad-create-prd/SKILL.md`, also in `bmad-create-epics-and-stories/SKILL.md`):

> "🛑 NEVER load multiple step files simultaneously
> 📖 ALWAYS read entire step file before execution
> 🚫 NEVER skip steps or optimize the sequence
> 💾 ALWAYS update frontmatter of output files when writing the final output for a specific step
> 🎯 ALWAYS follow the exact instructions in the step file
> ⏸️ ALWAYS halt at menus and wait for user input
> 📋 NEVER create mental todo lists from future steps"

Concrete file layout, from `.claude/skills/bmad-create-prd/`:

```
SKILL.md
customize.toml
data/
templates/
steps-c/
  step-01-init.md
  step-01b-continue.md
  step-02-discovery.md
  step-02b-vision.md
  step-02c-executive-summary.md
  step-03-success.md
  step-04-journeys.md
  …
  step-12-complete.md
```

The `steps-c/` prefix encodes the activation mode (here, "create"). Other modes (e.g. validate, edit) get sibling directories like `steps-v/`. The PRD skill in particular has 13 step files for the create flow.

### 4.5 Anatomy of an agent customize.toml

Authoritative example: `.claude/skills/bmad-agent-pm/customize.toml` (verified in install). Schema:

```toml
[agent]
# Hardcoded identity — non-configurable. Forking is required to change name/title.
name = "John"
title = "Product Manager"

# Configurable scalars — overrides win.
icon = "📋"
role = "Translate product vision into a validated PRD…"
identity = "Thinks like Marty Cagan and Teresa Torres…"
communication_style = "Detective's 'why?' relentless. Direct, data-sharp…"

# Configurable arrays — overrides append.
activation_steps_prepend = []
activation_steps_append = []
persistent_facts = ["file:{project-root}/**/project-context.md"]
principles = [
  "PRDs emerge from user interviews, not template filling.",
  "Ship the smallest thing that validates the assumption.",
  "User value first; technical feasibility is a constraint.",
]

# Configurable array of tables, keyed by `code`.
[[agent.menu]]
code = "CP"
description = "Expert led facilitation to produce your Product Requirements Document"
skill = "bmad-create-prd"

[[agent.menu]]
code = "VP"
description = "Validate a PRD is comprehensive, lean, well organized and cohesive"
skill = "bmad-validate-prd"
# … etc.
```

Each `[[agent.menu]]` item carries either `skill = "<bmad-skill-name>"` (registered skill, dispatched by name) or `prompt = "<text>"` (executed as inline prompt) — exactly one of the two, per the comment in the customize.toml header.

The `name` and `title` fields are explicitly marked non-configurable in every shipped `customize.toml`:

> "non-configurable skill frontmatter, create a custom agent if you need a new name/title"

This is the constraint that lets BMAD claim *persona continuity*: a team can override behavior all they want, but Mary stays Mary.

### 4.6 Anatomy of a workflow customize.toml

Authoritative example: `.claude/skills/bmad-create-prd/customize.toml`. Schema mirrors the agent block under `[workflow]`:

```toml
[workflow]
activation_steps_prepend = []
activation_steps_append = []
persistent_facts = ["file:{project-root}/**/project-context.md"]
# Workflow-specific scalars (e.g., template paths, post-completion hooks)
# are listed below the standard fields.
```

Workflow customize.toml files do **not** carry persona fields (`role`, `identity`, `communication_style`, `principles`, `icon`) because those come from whichever agent dispatched the workflow. The `bmad-create-prd/SKILL.md` makes the inheritance explicit:

> "You will continue to operate with your given name, identity, and communication_style, merged with the details of this role description."

This is how a single workflow skill can be invoked by different agents and adopt their voice — Mary running `bmad-brainstorming` sounds like Mary; if a custom agent invokes the same skill they sound like that agent.

---

## 5. Dispatch — agents, slash-commands, menus

### 5.1 Two entry paths

A user can invoke any skill in two ways:

1. **Slash-command** — Claude Code surfaces every installed skill as `/bmad-<name>`. Direct invocation jumps straight into the skill's activation. Examples present in this install: `/bmad-product-brief`, `/bmad-create-prd`, `/bmad-create-architecture`, `/bmad-create-epics-and-stories`, `/bmad-dev-story`, `/bmad-quick-dev`, `/bmad-help`, `/bmad-customize`, etc.
2. **Agent dispatch** — the user invokes an agent (`/bmad-agent-pm`, or natural-language "hey John"), the agent activates with persona, and presents its menu. Selecting a menu item invokes the registered skill in-place. The agent persona continues to wrap the workflow.

The `bmad-agent-pm/SKILL.md` Step 8 spells out the dispatch logic:

> "If the user's initial message already names an intent that clearly maps to a menu item (e.g. 'hey John, let's write the PRD'), skip the menu and dispatch that item directly after greeting. Otherwise render `{agent.menu}` as a numbered table … **Stop and wait for input.** Accept a number, menu `code`, or fuzzy description match."

### 5.2 The agent roster (this install)

Source: `_bmad/config.toml` (`[agents.*]` blocks). Six named agents in the BMM module, all in `team = "software-development"`:

| Skill | Persona | Title | Icon | Phase | One-liner |
|---|---|---|---|---|---|
| `bmad-agent-analyst` | Mary | Business Analyst | 📊 | 1-analysis | "Channels Porter's strategic rigor and Minto's Pyramid Principle…" |
| `bmad-agent-tech-writer` | Paige | Technical Writer | 📚 | 1-analysis | "Master of CommonMark, DITA, and OpenAPI…" |
| `bmad-agent-pm` | John | Product Manager | 📋 | 2-planning | "Drives Jobs-to-be-Done over template filling…" |
| `bmad-agent-ux-designer` | Sally | UX Designer | 🎨 | 2-planning | "Balances empathy with edge-case rigor…" |
| `bmad-agent-architect` | Winston | System Architect | 🏗️ | 3-solutioning | "Favors boring technology for stability…" |
| `bmad-agent-dev` | Amelia | Senior Software Engineer | 💻 | 4-implementation | "Test-first discipline (red, green, refactor)…" |

The official docs ([docs.bmad-method.org/explanation/named-agents](https://docs.bmad-method.org/explanation/named-agents/)) corroborate the same six "named agents," tying each to the same phase. The persona descriptors in this repo are identical to the shipped 6.6.0 defaults — confirming this install hasn't customized the agent roster (`_bmad/custom/config.toml` only contains comments and examples).

The phase column is the user-visible mapping the curriculum can lean on: "to start phase N, talk to agent X."

### 5.3 Each agent's menu (this install)

From the `customize.toml` of each agent skill. Menu codes are stable identifiers — overrides merge by `code`, so a team override for code `CP` replaces the default item without touching siblings.

**Mary** (`bmad-agent-analyst`):

| Code | Skill | Description |
|---|---|---|
| BP | `bmad-brainstorming` | Expert guided brainstorming facilitation |
| MR | `bmad-market-research` | Market analysis, competitive landscape |
| DR | `bmad-domain-research` | Industry domain deep dive |
| TR | `bmad-technical-research` | Technical feasibility, architecture options |
| CB | `bmad-product-brief` | Create or update product briefs |

**John** (`bmad-agent-pm`):

| Code | Skill | Description |
|---|---|---|
| CP | `bmad-create-prd` | Expert led facilitation to produce your PRD |
| VP | `bmad-validate-prd` | Validate a PRD is comprehensive, lean, organized |
| EP | `bmad-edit-prd` | Update an existing PRD |
| CE | `bmad-create-epics-and-stories` | Create the epics and stories listing |
| IR | `bmad-check-implementation-readiness` | Ensure PRD/UX/Architecture/Epics aligned |
| CC | `bmad-correct-course` | How to proceed if major change discovered mid-implementation |

**Winston** (`bmad-agent-architect`):

| Code | Skill | Description |
|---|---|---|
| CA | `bmad-create-architecture` | Document technical decisions |
| IR | `bmad-check-implementation-readiness` | Alignment check |

**Amelia** (`bmad-agent-dev`):

| Code | Skill | Description |
|---|---|---|
| DS | `bmad-dev-story` | Write the next or specified story's tests and code |
| QD | `bmad-quick-dev` | Unified quick flow — clarify, plan, implement, review, present |
| QA | `bmad-qa-generate-e2e-tests` | Generate API and E2E tests |
| CR | `bmad-code-review` | Comprehensive code review across quality facets |
| SP | `bmad-sprint-planning` | Sprint plan that sequences tasks |

**Sally** (`bmad-agent-ux-designer`):

| Code | Skill | Description |
|---|---|---|
| CU | `bmad-create-ux-design` | UX design plan to inform architecture and implementation |

(One-item menu in the shipped 6.6.0 default — Sally is intentionally narrow.)

**Paige** (`bmad-agent-tech-writer`):

| Code | Skill / Prompt | Description |
|---|---|---|
| DP | `bmad-document-project` | Brownfield analysis + architecture scan |
| WD | *prompt* `write-document.md` | Author a document via guided conversation |
| MG | *prompt* `mermaid-gen.md` | Generate a Mermaid-compliant diagram |
| VD | *prompt* `validate-doc.md` | Validate against documentation standards |
| EC | *prompt* `explain-concept.md` | Explain a concept with examples + diagrams |

Paige is the clearest example of the `prompt` form of menu items: four of her five entries don't dispatch a registered skill — they execute a prompt file in the agent's own `{skill-root}/`. Paige's menu also corresponds to the multi-action `bmad-agent-tech-writer` rows in `_bmad/bmm/module-help.csv` (`WD` write, `US` update-standards, `MG` mermaid, `VD` validate, `EC` explain) — those manifest rows surface the same actions as slash-commands at the IDE layer with `--action` shortcuts.

Note that `IR` (implementation readiness) appears on both John's and Winston's menus — that's intentional. Menu codes are scoped per-agent, not globally unique.

### 5.3.1 Persona descriptors as one-line ground truth

The persona blocks shipped in each agent's `customize.toml` (`role`, `identity`, `communication_style`, `principles`) are concise enough that the curriculum can quote them verbatim. They constrain the *voice* of every workflow that agent dispatches. Excerpts (verified, full text in `customize.toml`):

- **Mary** — `role`: "Help the user ideate research and analyze before committing to a project in the BMad Method analysis phase." `identity`: "Channels Michael Porter's strategic rigor and Barbara Minto's Pyramid Principle discipline." `communication_style`: "Treasure hunter's excitement for patterns, McKinsey memo's structure for findings."
- **John** — `role`: "Translate product vision into a validated PRD, epics, and stories that development can execute during the BMad Method planning phase." `identity`: "Thinks like Marty Cagan and Teresa Torres. Writes with Bezos's six-pager discipline." `communication_style`: "Detective's 'why?' relentless. Direct, data-sharp, cuts through fluff to what matters."
- **Sally** — `role`: "Turn user needs and the PRD into UX design specifications that inform architecture and implementation during the BMad Method planning phase." `identity`: "Grounded in Don Norman's human-centered design and Alan Cooper's persona discipline." `communication_style`: "Paints pictures with words. User stories that make you feel the problem. Empathetic advocate."
- **Paige** — `role`: "Capture and curate project knowledge so humans and future LLM agents stay in sync during the BMad Method analysis phase." `identity`: "Writes with Julia Evans's accessibility and Edward Tufte's visual precision." `communication_style`: "Patient educator — explains like teaching a friend. Every analogy earns its place."
- **Winston** — `role`: "Convert the PRD and UX into technical architecture decisions that keep implementation on track during the BMad Method solutioning phase." `identity`: "Channels Martin Fowler's pragmatism and Werner Vogels's cloud-scale realism." `communication_style`: "Calm and pragmatic. Balances 'what could be' with 'what should be.' Answers with trade-offs, not verdicts."
- **Amelia** — `role`: "Implement approved stories with test-first discipline and ship working, verified code during the BMad Method implementation phase." `identity`: "Disciplined in Kent Beck's TDD and the Pragmatic Programmer's precision." `communication_style`: "Ultra-succinct. Speaks in file paths and AC IDs — every statement citable. No fluff, all precision."

The `principles` arrays are similarly compact (3 entries each by default) and act as the agent's value system — see Amelia's "No task complete without passing tests / Red, green, refactor — in that order / Tasks executed in the sequence written" as a clean example. Overrides *append* to principles (per the shipped comment "Overrides append to defaults"), which means a team that wants to add domain rules ("All AWS-only — never propose GCP/Azure") can do so without disturbing the universal defaults.

### 5.4 Persona persistence into workflows

Once an agent is active, the persona "carries through" when a menu item invokes a workflow skill. From `bmad-agent-pm/SKILL.md` Step 3:

> "Adopt the John / Product Manager identity established in the Overview. Layer the customized persona on top: fill the additional role of `{agent.role}`, embody `{agent.identity}`, speak in the style of `{agent.communication_style}`, and follow `{agent.principles}`. Fully embody this persona so the user gets the best experience. Do not break character until the user dismisses the persona. **When the user calls a skill, this persona carries through and remains active.**"

And the corresponding line on the workflow side, from `bmad-create-prd/SKILL.md`:

> "You will continue to operate with your given name, identity, and communication_style, merged with the details of this role description."

This is what the curriculum can teach as "the persona is sticky" — invoking John and then choosing CP gives you John-running-PRD-creation, not generic-PRD-creation.

### 5.5 Party mode — multi-agent collaboration

`bmad-party-mode` ([`.claude/skills/bmad-party-mode/SKILL.md`](../.claude/skills/bmad-party-mode/SKILL.md)) is a core-module skill that orchestrates multiple agents in a single conversation. The contract is explicit about *why* it spawns subagents rather than roleplaying:

> "Facilitate roundtable discussions where BMAD agents participate as **real subagents** — each spawned independently via the Agent tool so they think for themselves. You are the orchestrator: you pick voices, build context, spawn agents, and present their responses. **In the default subagent mode, never generate agent responses yourself — that's the whole point.**"

> "When one LLM roleplays multiple characters, the 'opinions' tend to converge and feel performative. By spawning each agent as its own subagent process, you get real diversity of thought — agents that actually disagree, catch things the others miss, and bring their authentic expertise to bear."

Two modes:
- **Default (subagent)** — each chosen agent is a separate Agent-tool invocation.
- **`--solo`** — single LLM roleplays all selected agents in one response. Used when subagents aren't available.

A `--model` flag forces all subagents to a specific model (e.g. `--model haiku` for fast reactive rounds, default for deep rounds).

This is the only BMAD skill that crosses agent boundaries within a single user turn, and the only one whose contract leans on the underlying IDE's subagent capability rather than just step-file discipline. Curriculum-relevant because it's the most concrete demonstration of agents-as-personas-with-independence rather than agents-as-prompts.

### 5.6 The `bmad-help` orientation skill

`bmad-help` ([`.claude/skills/bmad-help/SKILL.md`](../.claude/skills/bmad-help/SKILL.md)) is the meta-orientation skill. It reads `_bmad/_config/bmad-help.csv` (assembled from each module's `module-help.csv`), walks the `phase` / `after` / `before` / `required` columns, scans `planning_artifacts` and `implementation_artifacts` for completed outputs, and tells the user what they've completed and what's required next. Every agent SKILL.md reminds the user: "they can invoke the `bmad-help` skill at any time for advice."

This is how a confused user gets re-oriented mid-pipeline without re-reading the curriculum.

---

## 6. What this portal extends or deviates

### 6.1 Customization currently in use

`_bmad/custom/` contents (verified):

```
_bmad/custom/
├── .gitignore           — blocks *.user.toml
├── config.toml          — comments + examples only (no actual overrides)
└── config.user.toml     — comments + examples only
```

So as of the current commit on `main`, **this portal ships zero behavioral overrides** of the BMAD defaults. No team-level agent persona changes, no menu changes, no persistent-facts additions, no activation hooks. The 6.6.0 defaults are running unmodified.

This is significant for curriculum design: every claim about how an agent behaves can be grounded directly in the shipped `customize.toml` files without the curriculum needing to footnote "in this repo specifically." If teams adopting this portal as a template ever override anything, that's where it would surface.

### 6.2 Portal-specific structure (not BMAD)

The portal layers these things *on top of* BMAD without changing how BMAD works:

- **`training/`** — six lesson markdown files (`1-what-is-bmad.md` through `6-from-lessons-to-capstone.md`), labs, facilitator + stakeholder guides. These are curriculum content, not BMAD skills.
- **`src/`** — Next.js + Express portal that renders training content and hosts the capstone interface.
- **`AGENTS.md`** — shared agent context for the AI tool actually editing this repo (Claude Code, Codex, Copilot, OpenCode). Not a BMAD construct — `AGENTS.md` is the OpenAI/Anthropic cross-tool convention. It's where the Next.js-version warning lives.
- **`CODEOWNERS`** — repo-level governance, taught in the curriculum (lesson 4) but not produced by BMAD.
- **`_bmad-output/`** — the directory BMAD writes into. Contents in this repo:
  - `planning-artifacts/` — `product-brief-bmad_demo.md`, `product-brief-bmad_demo-distillate.md`, `prd.md`, `ux-design.md`, `ux-design-directions.html`, `architecture.md`, `epics.md`, `implementation-readiness-report-2026-05-08.md`. **The portal eats its own dogfood.** Every artifact taught in the curriculum exists in this repo as a real produced artifact.
  - `implementation-artifacts/` — per-story specs from the build of the portal itself.
  - `capstone/` — historical artifacts from the retired Epic 4 textarea capstone (per `_bmad-output/capstone/README.md`); the rebuilt Epic 5-9 capstone writes outside the repo to a trainee-chosen path.

### 6.3 The three-tool capstone

The README lists supported AI tooling: **Claude Code, GitHub Copilot, OpenAI Codex (CLI + ChatGPT agent), OpenCode**. The capstone is the portal's way of demonstrating BMAD's "tool-agnostic contract" claim — that a story file produced by `bmad-create-story` is detailed enough to be implemented by any of these three tools, not just Claude Code.

How this maps to BMAD's design: the *output* of `bmad-create-story` is a structured markdown story file with ACs, tasks, and Dev Agent Record sections. *Reading and implementing* that story file doesn't require the BMAD skills system — it just requires an AI coding agent that can follow markdown instructions. Codex and Copilot don't have BMAD skills installed; they only have the story file. Claude Code has both.

Curriculum hook: this is concrete evidence for the claim "the artifact is the contract." The capstone proves you can hand a Codex or Copilot user a story file produced by BMAD-on-Claude-Code and they can ship it without ever activating an agent persona.

### 6.4 The pipeline as actually run on this repo

Walking `_bmad-output/planning-artifacts/` (verified directory listing) produces this concrete trace of what `bmad_demo` itself ran through:

| File present | Phase | Producing skill | Notes |
|---|---|---|---|
| `product-brief-bmad_demo.md` | 1-analysis | `bmad-product-brief` | Human-readable brief |
| `product-brief-bmad_demo-distillate.md` | 1-analysis | `bmad-product-brief` (distillate output) | LLM-optimized version for downstream PRD facilitation |
| `prd.md` | 2-planning | `bmad-create-prd` | Required gate met |
| `ux-design.md` | 2-planning | `bmad-create-ux-design` | Optional but produced |
| `ux-design-directions.html` | 2-planning | `bmad-create-ux-design` | Sibling HTML output (rendered direction visuals) |
| `architecture.md` | 3-solutioning | `bmad-create-architecture` | Required gate met |
| `epics.md` | 3-solutioning | `bmad-create-epics-and-stories` | Required gate met |
| `implementation-readiness-report-2026-05-08.md` | 3-solutioning | `bmad-check-implementation-readiness` | Phase-4 gate cleared |
| `research/` | 1-analysis | `bmad-market-research` / `bmad-domain-research` / `bmad-technical-research` | Research artifacts (this artifact lives here too, alongside originals) |
| `cargill-logo.png` | (n/a) | not BMAD | Brand asset for the portal |

This is the practical artifact set the curriculum can point at as "here's what the chain looks like when run end-to-end." Lesson 2 ("the artifact chain") in particular has concrete files to load and inspect.

The `implementation-artifacts/` tree contains the per-story output of `bmad-create-story` and `bmad-dev-story` runs that built the portal itself. The historical capstone tree (`_bmad-output/capstone/`) is documented as retired (see `_bmad-output/capstone/README.md`) — the rebuilt capstone writes outside the repo.

### 6.5 Areas where the portal extends BMAD

- **The curriculum itself.** BMAD ships the framework; the portal ships the lessons.
- **Multi-tool labs.** BMAD doesn't include per-tool setup notes; the portal will (per README, `training/tools-reference.md`, "coming once Epic 6 authors them").
- **CODEOWNERS + branch protection layer.** BMAD covers code review (`bmad-code-review`); CODEOWNERS / branch protection / merge-gating are governance the team applies *around* BMAD, taught in lesson 4.

The portal does not modify BMAD's phase model, artifact chain, agent roster, or skill behaviors. It is BMAD-as-installed plus a curriculum + a portal UI + governance scaffolding.

---

## 7. Glossary

Terms the curriculum will reference, with sources.

- **Agent** — a named persona (Mary, John, Winston, Amelia, Sally, Paige) defined by a `bmad-agent-<role>` skill. Wraps a menu of workflow skills with a consistent voice, principles, and visual icon. Source: `.claude/skills/bmad-agent-*/customize.toml`, [docs.bmad-method.org/explanation/named-agents](https://docs.bmad-method.org/explanation/named-agents/).
- **Skill** — a unit of installed BMAD capability under `.claude/skills/bmad-*/`. Always has a `SKILL.md` + (usually) a `customize.toml`. Two kinds: agent skills and workflow skills. Source: `_bmad/_config/skill-manifest.csv`.
- **Workflow** — a multi-step skill that produces an artifact (PRD, architecture, story, etc.), executed via step-file architecture. Source: `bmad-create-prd/SKILL.md`.
- **Module** — a grouping of skills shipped together. This install has `core` (12 cross-cutting skills) and `bmm` (30 method skills). Source: `_bmad/_config/manifest.yaml`, `_bmad/_config/skill-manifest.csv`.
- **BMM (BMad Method)** — the core methodology module that owns the four-phase pipeline. Version 6.6.0 in this install. Source: `_bmad/bmm/config.yaml`.
- **BMB (BMad Builder)** — meta-module for authoring custom agents/workflows/modules. Not installed in this repo. Source: official docs.
- **TEA (Test Architect)**, **BMGD (Game Dev Studio)**, **CIS (Creative Intelligence Suite)** — additional v6 modules; not installed here. Source: official docs.
- **Phase** — one of the four BMM stages: `1-analysis`, `2-planning`, `3-solutioning`, `4-implementation`. Source: directory layout under `_bmad/bmm/`, `phase` column of `_bmad/bmm/module-help.csv`.
- **Artifact** — a produced document that constrains downstream work. Brief, PRD, architecture, epics, story, dev-agent-record, etc. Source: §3 above.
- **Brief / Product Brief** — short executive document produced by `bmad-product-brief`. Output: `planning_artifacts/product-brief-*.md`.
- **PRFAQ** — alternative to product brief, "Working Backwards" Amazon-style press release + FAQ format. Produced by `bmad-prfaq`.
- **PRD (Product Requirements Document)** — phase-2 artifact produced by `bmad-create-prd`. Output: `planning_artifacts/prd.md`. Required gate.
- **Architecture** — phase-3 artifact produced by `bmad-create-architecture`. Output: `planning_artifacts/architecture.md`. Required gate.
- **Epic** — a unit of related stories grouped by user value. Produced as a section of `epics.md`.
- **Story** — a single implementable unit with ACs, tasks, and Dev Agent Record. Produced by `bmad-create-story` (cycle: `create` → `validate`). Output: `implementation_artifacts/<story>.md`. Read by `bmad-dev-story` for execution.
- **AC (Acceptance Criterion)** — a Given/When/Then assertion attached to a story. Source: `bmad-quick-dev/SKILL.md` "Ready for Development" standard: "All ACs use Given/When/Then."
- **Dev Agent Record** — section of a story file the dev agent (Amelia) is allowed to modify during execution: Tasks/Subtasks checkboxes, Debug Log, Completion Notes, File List, Change Log, Status. Source: `bmad-dev-story/SKILL.md`.
- **Sprint plan** — phase-4 artifact produced by `bmad-sprint-planning` that sequences stories for execution. Output: `implementation_artifacts/`.
- **ADR (Architecture Decision Record)** — *open question.* No dedicated `bmad-adr` skill in 6.6.0 manifest; may be sections inside `architecture.md` (see §3.3 + §8).
- **Persona** — the `name`/`title`/`icon`/`role`/`identity`/`communication_style`/`principles` block in an agent's `customize.toml`. Source: `bmad-agent-*/customize.toml`.
- **Persistent fact** — entry in `persistent_facts` array; loaded as session context on activation. Either a literal sentence or a `file:` reference. Source: every `customize.toml`.
- **Activation hook** — entries in `activation_steps_prepend` (run before greet) and `activation_steps_append` (run after greet, before menu/workflow). Source: every agent/workflow SKILL.md Steps 2 and 7.
- **Menu** — the `[[agent.menu]]` array of tables in an agent's `customize.toml`. Each item carries a `code`, `description`, and exactly one of `skill` or `prompt`. Rendered as a numbered table when the agent activates without a direct intent.
- **Slash-command** — Claude Code's `/bmad-<skill-name>` direct-invocation form. Bypasses agent menu. Each installed skill surfaces one.
- **Step-file architecture** / **micro-file architecture** — workflow execution discipline: one step file in memory, sequential, append-only output, frontmatter state tracking. Source: `bmad-create-prd/SKILL.md`, `bmad-create-architecture/SKILL.md`, etc.
- **`stepsCompleted`** — frontmatter array in workflow output documents that records progress through steps. Source: `bmad-create-prd/SKILL.md`.
- **`customize.toml`** — per-skill defaults file. Three-layer override: skill defaults → team override (`_bmad/custom/<skill>.toml`) → user override (`_bmad/custom/<skill>.user.toml`). Resolved by `_bmad/scripts/resolve_customization.py`.
- **`resolve_customization.py`** — Python 3.11+ script that performs the three-layer TOML merge with structural rules. Called by every customizable skill on activation. Source: `_bmad/scripts/resolve_customization.py`.
- **Central config** — `_bmad/config.toml` (installer-managed) + `_bmad/config.user.toml` (installer-managed personal scope) + `_bmad/custom/config.toml` (committed team override) + `_bmad/custom/config.user.toml` (gitignored personal). Carries cross-cutting concerns including the agent roster.
- **Project context** — `project-context.md` produced by `bmad-generate-project-context`, loaded as a persistent fact by every agent (default `persistent_facts` glob in shipped `customize.toml` files).
- **Implementation readiness** — gate before phase 4. Produced by `bmad-check-implementation-readiness`.
- **Quick-dev** — `bmad-quick-dev`, off-pipeline shortcut that does intent-clarify → plan → implement → review → present in one workflow. Used for bug fixes / small changes that don't justify the full chain.
- **Party mode** — `bmad-party-mode`, multi-agent group discussion skill. Multiple personas talk to each other through subagents. Core module.
- **Brownfield** — BMAD term for an existing project being adopted (vs greenfield = new). The `bmad-document-project` and `bmad-generate-project-context` skills target brownfield onboarding.
- **Auto-attribution skills (analytical)** — `bmad-advanced-elicitation`, `bmad-review-adversarial-general`, `bmad-review-edge-case-hunter`, `bmad-editorial-review-prose`, `bmad-editorial-review-structure`. Cross-cutting; phase = `anytime`.
- **`bmad-help`** — orientation skill. Reads the assembled module manifests + scans output dirs to tell the user where they are and what's next.
- **`bmad-customize`** — meta-skill that authors `_bmad/custom/<skill>.toml` overrides without hand-writing TOML.
- **Tool-agnostic contract** — *portal-specific framing, not an official BMAD term.* The claim that a story file produced by `bmad-create-story` is structured enough that any AI coding tool (Claude Code, Codex, Copilot, OpenCode) can implement it without needing BMAD installed. Demonstrated via the three-tool capstone.

---

## 8. Open questions

Items the artifact author could not ground confidently in 6.6.0 source or official docs. The curriculum author should resolve before writing trainee-facing copy.

1. **ADR (Architecture Decision Record) status.** No dedicated `bmad-create-adr` or `bmad-adr` skill in 6.6.0 manifest (`_bmad/_config/skill-manifest.csv`). Possibilities: (a) ADRs are emitted as sections inside `architecture.md` by `bmad-create-architecture` — would need to inspect `_bmad-output/planning-artifacts/architecture.md` and the skill's step files to confirm; (b) ADRs are produced by a sibling skill on `main` post-6.6.0 that this repo doesn't ship; (c) ADRs are not first-class in BMM 6.6.0 and the curriculum should reframe. Recommend the curriculum author either inspect the produced `architecture.md` in this repo or drop ADR from the artifact chain.

2. **Workflow persona inheritance semantics.** The PRD SKILL.md says "you will continue to operate with your given name, identity, and communication_style." Unclear whether this works when the workflow is invoked via slash-command (`/bmad-create-prd`) with no agent active. Hypothesis: the workflow falls back to a generic facilitator voice when no persona is loaded. Could not confirm in source.

3. **`_bmad/bmm/<phase>/` empty directories.** In this install the four phase directories exist but contain only `module-help.csv` and `config.yaml` — actual SKILL.md files live under `.claude/skills/bmad-*/`. The skill manifest `path` column points to the conceptual `_bmad/bmm/<phase>/<skill>/SKILL.md` location. Is the `_bmad/bmm/` tree the *source* directory (only populated for raw distributions) and `.claude/skills/` the IDE-rendered installed location? The `ides: [claude-code]` line in `_bmad/_config/manifest.yaml` is consistent with this hypothesis but not confirmed.

4. **The 12 vs 9 vs 6 agent count discrepancy.** Search results referenced "12+ domain experts" and "9 agents with standardized menus (pm, analyst, architect, dev, ux-designer, tech-writer, sm, tea, quick-flow-solo-dev)" while the official Named Agents page lists "six named agents," matching this install exactly. The extra agents (sm = Scrum Master?, tea = Test Architect, quick-flow-solo-dev) likely come from add-on modules (TEA, possibly others) not installed here. Curriculum should describe the six in this install, not the larger superset.

5. **Step-file mode prefixes.** `bmad-create-prd` ships `steps-c/` (create mode). The skill description implies other modes (`bmad-edit-prd`, `bmad-validate-prd`) are separate skills, not different modes of the same skill. The prefix convention may be vestigial or may be used by other workflow skills with multiple modes — `bmad-create-story` ships `discover-inputs.md` style flat, and `bmad-product-brief` ships `prompts/` instead of `steps-*/`. The mode-prefix pattern isn't fully consistent across workflow skills; the curriculum should treat `steps-*/` as one of several patterns, not the single rule.

6. **Memory sidecar.** Two `customize.toml` comments mention "the runtime memory sidecar" as distinct from `persistent_facts` ("Distinct from the runtime memory sidecar — these are static context loaded on activation"). The `bmad-bmm/module-help.csv` references `_bmad/_memory/tech-writer-sidecar` for the tech-writer's "Update Standards" action. The memory sidecar appears to be a separate per-agent runtime store, but its contract isn't documented in the install. Could be a v6.6 feature with docs only in `bmad-builder-docs.bmad-method.org`. Curriculum can probably omit unless explicitly relevant.

---

## Sources

### Repo paths cited

- `_bmad/_config/manifest.yaml` — version pin, installed modules, IDE binding
- `_bmad/_config/skill-manifest.csv` — full skill inventory with module + path columns
- `_bmad/bmm/config.yaml` — module config (planning_artifacts, implementation_artifacts paths)
- `_bmad/bmm/module-help.csv` — phase + after/before/required + output-location for every BMM skill
- `_bmad/core/config.yaml` — core module config
- `_bmad/core/module-help.csv` — core skills inventory
- `_bmad/config.toml` — central config, agent roster
- `_bmad/config.user.toml` — central config personal scope
- `_bmad/custom/.gitignore` — confirms `*.user.toml` gitignored
- `_bmad/custom/config.toml`, `_bmad/custom/config.user.toml` — verified empty of overrides
- `_bmad/scripts/resolve_customization.py` — three-layer merge contract
- `_bmad/bmm/1-analysis/` (directory shape)
- `_bmad/bmm/2-plan-workflows/` (directory shape)
- `_bmad/bmm/3-solutioning/` (directory shape)
- `_bmad/bmm/4-implementation/` (directory shape)
- `.claude/skills/bmad-agent-pm/SKILL.md` — canonical agent activation contract
- `.claude/skills/bmad-agent-pm/customize.toml` — canonical agent customize.toml schema
- `.claude/skills/bmad-agent-analyst/customize.toml` — Mary
- `.claude/skills/bmad-agent-architect/customize.toml` — Winston
- `.claude/skills/bmad-agent-dev/customize.toml` — Amelia
- `.claude/skills/bmad-create-prd/SKILL.md` — step-file architecture, critical rules
- `.claude/skills/bmad-create-prd/customize.toml` — workflow customize.toml schema
- `.claude/skills/bmad-create-prd/steps-c/` — actual step-file layout
- `.claude/skills/bmad-create-architecture/SKILL.md`
- `.claude/skills/bmad-create-epics-and-stories/SKILL.md`
- `.claude/skills/bmad-create-story/SKILL.md`
- `.claude/skills/bmad-dev-story/SKILL.md`
- `.claude/skills/bmad-quick-dev/SKILL.md`
- `.claude/skills/bmad-product-brief/SKILL.md`
- `.claude/skills/bmad-product-brief/customize.toml`
- `.claude/skills/bmad-check-implementation-readiness/SKILL.md`
- `.claude/skills/bmad-checkpoint-preview/SKILL.md`
- `.claude/skills/bmad-help/SKILL.md`
- `.claude/skills/bmad-customize/SKILL.md`
- `_bmad-output/planning-artifacts/` — verified produced artifacts (prd.md, architecture.md, epics.md, etc.)
- `_bmad-output/capstone/README.md` — capstone history note
- `README.md` — portal scope, supported tools
- `training/lessons/` — lesson titles (curriculum scope only)
- `AGENTS.md` — cross-tool context convention

### URLs fetched

- [bmadcode.com](https://bmadcode.com/) — BMAD landing, maintainer, philosophy
- [docs.bmad-method.org](https://docs.bmad-method.org/) — official docs root, module list
- [docs.bmad-method.org/explanation/named-agents](https://docs.bmad-method.org/explanation/named-agents/) — six named agents, activation flow
- [docs.bmad-method.org/how-to/customize-bmad](https://docs.bmad-method.org/how-to/customize-bmad/) — three-layer override, activation hooks, persistent_facts, resolver
- [github.com/bmad-code-org/BMAD-METHOD](https://github.com/bmad-code-org/BMAD-METHOD) — README, version, expansion of acronym

### URLs found but not directly fetched (returned 404 or referenced via search)

- `https://docs.bmadcode.com` — 404 (alternate domain; canonical is `docs.bmad-method.org`)
- `https://docs.bmad-method.org/explanation/skills-architecture` — 404
- `https://docs.bmad-method.org/explanation/agents` — 404 (canonical page is `/explanation/named-agents/`)
- `discord.com/invite/gk8jAdXWmj` — community link from bmadcode.com
- `github.com/bmad-code-org/BMAD-METHOD/blob/main/CHANGELOG.md` — surfaced by search; 6.6.0 release notes
- `bmad-builder-docs.bmad-method.org` — BMB-specific docs subdomain (referenced by search; not BMM)
- `deepwiki.com/bmad-code-org/BMAD-METHOD` — third-party indexed wiki of the BMAD repo
