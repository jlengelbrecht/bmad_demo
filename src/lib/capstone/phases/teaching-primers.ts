import type { CapstonePhase } from "../adapters/types";

/**
 * Trainee-facing teaching content for each capstone phase. Surfaced
 * above the terminal in the chat-phase pane so trainees know
 *
 *  - what they're trying to accomplish in the phase,
 *  - what the BMAD skill we're launching actually does,
 *  - what to expect in the conversation,
 *  - what artifact lands on disk, and
 *  - why this phase exists in the chain.
 *
 * The portal is a TEACHING tool — the per-phase context is the value.
 * Without these primers we'd be telling trainees "click this button to
 * launch a thing" without saying *why*.
 *
 * Style guide for editing:
 *   - `goal`: one sentence. The "I want…" of the user-story for THIS phase.
 *   - `skillDoes`: 2–3 sentences. Plain-English summary of the BMAD
 *     skill's behavior. Reference the skill's slash-command verbatim.
 *   - `whatToExpect`: 3–5 bullets. Each names a recognizable beat of
 *     the conversation so a trainee in the middle of it can map back.
 *   - `whyThisMatters`: 1–2 sentences. The pedagogical "why this is in
 *     the chain at all" — the answer to "couldn't we skip this?"
 *   - `artifactPath`: where the output lands, relative to chosenDir +
 *     output_folder. Keep it stable across phases (no per-trainee
 *     parameterization in this string — the actual file lookup
 *     pattern lives in shapes.ts).
 *
 * If a phase changes shape (new skill, different artifact), update
 * BOTH this file AND `phases/shapes.ts` together.
 */
export interface PhaseTeachingPrimer {
  /** What the trainee is trying to accomplish in this phase. */
  goal: string;
  /** Plain-English summary of what the BMAD skill we just launched does. */
  skillDoes: string;
  /** Repo-relative path of the artifact this phase produces. */
  artifactPath: string;
  /** Recognizable beats of the conversation, ordered. */
  whatToExpect: string[];
  /** Pedagogical "why this phase exists" framing. */
  whyThisMatters: string;
}

export const PHASE_TEACHING_PRIMERS: Record<CapstonePhase, PhaseTeachingPrimer> = {
  brief: {
    goal: "Capture the project's *why* — a 1–2 page executive summary that establishes the customer, the problem, the solution shape, success criteria, and v1 scope.",
    skillDoes:
      "`/bmad-product-brief` runs a Socratic discovery conversation. The agent asks 2–3 questions per turn across five dimensions (customer / problem / solution shape / success / scope), summarizes its understanding periodically, and drafts the brief once enough material has been surfaced. It also produces a separate LLM-optimized *distillate* sibling that downstream phases load as context.",
    artifactPath:
      "_bmad-output/planning-artifacts/product-brief-<project>.md (+ -distillate.md)",
    whatToExpect: [
      "The agent greets you and asks for the product or project idea — brain-dump freely.",
      "It asks 2–3 follow-up questions per turn across the five discovery dimensions.",
      "It periodically summarizes back what it heard so you can catch drift early.",
      "When discovery feels complete (~10–15 turns), it asks if you'd like to write the brief.",
      "It writes the brief + a distillate, then ends the conversation.",
    ],
    whyThisMatters:
      "The brief is the upstream contract for the entire chain. Vague answers here become guessing PRDs, which become guessing architectures, which become guessing stories. Push for specificity now and every downstream phase gets easier.",
  },

  prd: {
    goal: "Turn the brief's *why* into a concrete *what* — functional requirements (what the system must do) and non-functional requirements (constraints it must hold) the team can quote by ID downstream.",
    skillDoes:
      "`/bmad-create-prd` runs a strict 12-step facilitated workflow. Each step builds one section of `prd.md` — vision, success criteria, journeys, project type, scoping, functional requirements, non-functional requirements, etc. The skill enforces step ordering: it never produces multiple sections in one turn, halts at menus, and refuses to skip ahead.",
    artifactPath: "_bmad-output/planning-artifacts/prd.md",
    whatToExpect: [
      "The agent loads the brief from disk as context (not from chat history).",
      "It walks 12 numbered steps, asking targeted questions per step.",
      "Each step appends to `prd.md` — you can read along as it grows.",
      "Requirements get traceable IDs (FR-1, FR-2, NFR-S1, …) so downstream artifacts can cite them by name.",
      "It pauses at menus and waits for your input rather than running ahead.",
    ],
    whyThisMatters:
      "Every downstream artifact (architecture, epics, stories) reads the PRD by FR/NFR ID. A vague PRD requirement becomes a vague story; a missing requirement strands a downstream story without a backing rationale.",
  },

  architecture: {
    goal: "Turn the PRD's requirements into concrete technical decisions — stack choices, data model, API surface, threat model, deployment shape — with the rationale recorded inline.",
    skillDoes:
      "`/bmad-create-architecture` runs a step-by-step decision workflow that reads the PRD as context. Each technical decision is presented with options + trade-offs; you pick, the agent records the rationale inline in `architecture.md`. Decision records embedded in the doc replace what other frameworks call ADRs.",
    artifactPath: "_bmad-output/planning-artifacts/architecture.md",
    whatToExpect: [
      "The agent loads brief + PRD as context, then walks the architecture sections.",
      "For each meaningful decision, it presents 2–3 options with trade-offs and asks you to choose.",
      "Your choice + the trade-off context becomes a decision record inline in the doc.",
      "Threat model, NFR realization (subprocess discipline, no-egress, etc.), and deployment-shape sections come at the end.",
      "Final review pass — agent asks if anything in the doc surprises you.",
    ],
    whyThisMatters:
      "Architecture is the contract for the epics + stories phase. The decomposer reads each architecture decision and produces stories that *implement* the decision; ambiguity here becomes guessing in the implementation phase.",
  },

  "epics-and-stories": {
    goal: "Decompose PRD requirements + architecture decisions into a *backlog* — every story the project needs, organized by user value into epics.",
    skillDoes:
      "`/bmad-create-epics-and-stories` reads PRD + architecture, asks if you want to include other docs (UX design, etc.), then produces a single `epics.md` that lists every epic with its summary-level stories. Each story entry has a user-story statement + brief acceptance criteria — the **backlog index**, not the implementation specs.",
    artifactPath: "_bmad-output/planning-artifacts/epics.md",
    whatToExpect: [
      "The agent loads PRD + architecture + (optional) UX design as context.",
      "It builds `epics.md` from a template, then walks epic-by-epic decomposition with you.",
      "Each epic becomes a section; stories within get summary-level entries (~10–20 lines each).",
      "It asks for sign-off at epic boundaries before moving to the next.",
      "The final document lists every story you'll implement — the project backlog.",
    ],
    whyThisMatters:
      "This is the **backlog**, not the implementation specs. Phase 9 (Dev Story) takes ONE entry off this list and expands it into a 100–300-line implementation-ready spec. BMAD splits these on purpose: most stories never get implemented (teams ship ~60% of plans), and lazy expansion at implementation time pulls *current* architecture context rather than stale plans.",
  },

  "implementation-readiness": {
    goal: "Validate that the planning chain is internally consistent before implementation kicks off — every PRD requirement has story coverage, every architecture decision traces to a story, no silent gaps.",
    skillDoes:
      "`/bmad-check-implementation-readiness` is BMAD's gate between planning (3-solutioning) and implementation (4-implementation). It walks every PRD requirement and asks: is there a story for this? Does the architecture support it? Surfaces requirements that don't have story coverage and architecture decisions that don't trace to stories. Produces a dated report.",
    artifactPath:
      "_bmad-output/planning-artifacts/implementation-readiness-report-<date>.md",
    whatToExpect: [
      "The agent reads PRD, architecture, epics, and (if present) UX design.",
      "It walks every FR/NFR + every architecture decision systematically.",
      "Gaps surface as bullet items in the report: \"FR-3.4 has no story coverage\", \"Architecture decision X isn't reflected in any story.\"",
      "If gaps surface, you'll typically loop back to epics-and-stories or the architecture phase to close them.",
      "The report is dated so you can re-run readiness after revisions and compare.",
    ],
    whyThisMatters:
      "Drift between planning artifacts is the most expensive failure mode in spec-driven work — you discover it during implementation, after the cost of producing the misaligned plan is sunk. Catching it here is cheap; catching it at PR time isn't.",
  },

  "sprint-planning": {
    goal: "Build the sprint-status tracking that the dev-story phase reads to know which story to start with.",
    skillDoes:
      "`/bmad-sprint-planning` parses your epic files and produces `sprint-status.yaml` — a structured listing of every epic and story with status fields (todo / in-progress / done). It's the tracker that `bmad-create-story` reads to pick the next story.",
    artifactPath: "_bmad-output/implementation-artifacts/sprint-status.yaml",
    whatToExpect: [
      "The agent loads `epics.md` and parses every story.",
      "It builds the sprint-status structure with every story listed and status=todo.",
      "It may ask whether you want to mark any pre-existing work as in-progress or done (relevant for re-installs against existing repos).",
      "It writes `sprint-status.yaml` to the implementation-artifacts directory.",
    ],
    whyThisMatters:
      "Without `sprint-status.yaml` the next phase (`bmad-create-story`) doesn't know which story to start with — it stalls and asks you to run sprint-planning first. This is also where teams running BMAD natively track their work-in-flight across multiple PRs.",
  },

  "dev-story-1.1": {
    goal: "Pick story 1.1 (Epic 1, Story 1) off the backlog, expand it into an implementation-ready spec, then write the code that makes it ship.",
    skillDoes:
      "Two BMAD skills run back-to-back here. `/bmad-create-story` reads `sprint-status.yaml` + `epics.md`, picks the first todo story, and expands its summary-level entry from `epics.md` into a comprehensive per-story file at `_bmad-output/implementation-artifacts/<epic>-<story>-<slug>.md` — the implementation spec the dev agent will execute against. Then `/bmad-dev-story` reads that spec, writes the code, runs the test suite, and updates the story's Dev Agent Record with what shipped.",
    artifactPath:
      "_bmad-output/implementation-artifacts/<epic>-<story>-<slug>.md (+ code in your repo)",
    whatToExpect: [
      "`/bmad-create-story` runs first: it picks story 1.1 from the backlog and expands it into a 100–300 line spec with full Given/When/Then ACs, dev notes lifted from architecture, and a tasks/subtasks checklist.",
      "Review the expanded story — request changes if anything looks wrong.",
      "Once the spec is good, the agent invokes `/bmad-dev-story` (or asks you to).",
      "The dev skill executes single-shot: it modifies code, adds tests, runs the test suite, and ticks off tasks.",
      "It updates the story file's Dev Agent Record (debug log, completion notes, file list, change log).",
      "Halts only on a HALT condition (red tests after retry, missing tooling) or when the story is fully implemented.",
    ],
    whyThisMatters:
      "This is the moment Lesson 3's *story-as-tool-agnostic-contract* becomes physical. The expanded story file is what your team's lead will read at the gate to compare against the produced code. The same file works whether the implementer used Claude Code, Codex, or GitHub Copilot — that's the whole point.",
  },
};
