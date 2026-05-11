import { governancePromptTemplate } from "../governance/prompt-template";
import type { CapstonePhase, ToolId } from "../adapters/types";

/**
 * Per-tool launch command for an interactive AI-tool session inside
 * the trainee's CHOSEN_DIR. The command is what the trainee SEES in
 * the bootstrap-style preview before clicking "Open terminal" — same
 * teaching shape as Phase 2's `npx bmad-method install`.
 *
 * Each adapter has been validated empirically (2026-05-09 dev box) for
 * (a) what positional/flag shape feeds an initial prompt, and
 * (b) what flag bypasses approval prompts so a trainee following the
 *     happy path isn't interrupted on every file write.
 */
export interface LaunchCommand {
  /** The argv-style command shown in the preview AND spawned by the PTY. */
  cmd: string;
  args: readonly string[];
  /**
   * Human-readable invocation string for the preview block.
   * Includes the implicit `cd <chosenDir>` because the trainee
   * needs to see that the tool is launched from inside their repo.
   */
  preview: (chosenDir: string) => string;
  /**
   * The slash-command (or tool-equivalent) the trainee types INSIDE
   * the launched AI tool to invoke the BMAD skill for the current
   * phase. `null` for phases with no shipped BMAD skill (e.g., adr).
   */
  bmadInvocation: string | null;
  /**
   * When `true`, the BMAD invocation is appended to argv (as positional
   * for claude/codex, or behind `-i` for copilot) so the tool
   * auto-executes it on launch — trainee lands directly in the workflow,
   * no typing required. When `false`, the trainee sees a "type this"
   * hint and runs the command manually.
   */
  autoRun: boolean;
}

/**
 * BMAD skill mapping per phase. Names match the skills installed
 * under `.claude/skills/` (and equivalent dirs for codex / copilot)
 * by `npx bmad-method install`.
 *
 * The dev-story phase is two skills back-to-back (`/bmad-create-story`
 * then `/bmad-dev-story`); the preview surfaces the first.
 */
const BMAD_SKILLS: Record<CapstonePhase, string | null> = {
  brief: "/bmad-product-brief",
  prd: "/bmad-create-prd",
  architecture: "/bmad-create-architecture",
  "epics-and-stories": "/bmad-create-epics-and-stories",
  "implementation-readiness": "/bmad-check-implementation-readiness",
  "sprint-planning": "/bmad-sprint-planning",
  "dev-story-1.1": "/bmad-create-story",
  // Governance has no shipped BMAD skill. The phase substitutes a
  // multi-paragraph templated prompt (see governancePromptTemplate())
  // for the slash command — same launch shape, different payload.
  governance: null,
};

/**
 * Whether a tool's CLI accepts a slash-command at session start that
 * gets executed before handing the prompt to the trainee.
 *
 * Validated empirically (codex 0.130.0 / copilot 1.0.44 / claude 2.1.x):
 *
 * - **claude-code:** positional `prompt` is parsed by the CLI's slash
 *   command router at session start (e.g., `claude "/foo"` invokes the
 *   `foo` skill). ✅
 *
 * - **codex:** `[PROMPT]` positional is forwarded to the agent as the
 *   first user message. The agent independently routes slash commands
 *   to its skills layer (verified via `codex exec --skip-git-repo-check
 *   "/skills"` — the agent listed installed skills rather than treating
 *   `/skills` as natural-language). For trainees this means a BMAD
 *   skill installed under `~/.codex/skills/<skill>/` will be invoked
 *   from the initial prompt. ✅
 *
 * - **github-copilot:** `-i "PROMPT"` ("Start interactive mode and
 *   automatically execute a prompt") feeds the prompt into the chat
 *   input verbatim, the same routing path as if the trainee typed the
 *   slash command at the keyboard. ✅
 */
const SUPPORTS_INITIAL_PROMPT_ARGV: Record<ToolId, boolean> = {
  "claude-code": true,
  codex: true,
  "github-copilot": true,
};

/**
 * For phases without a BMAD skill, the portal substitutes a templated
 * prompt as the initial-prompt argv. The governance phase is the only
 * such phase today; future ones can extend this map.
 *
 * The preview surface trims the prompt to a single short label so the
 * trainee doesn't see a wall of text in the "What the portal will run"
 * pre-block — the full prompt is what the AI receives, not what we
 * teach the trainee to type.
 */
const PORTAL_PROMPTS: Partial<
  Record<CapstonePhase, { fullPrompt: () => string; previewLabel: string }>
> = {
  governance: {
    fullPrompt: governancePromptTemplate,
    previewLabel: "<governance prompt — drives CODEOWNERS + CONTRIBUTING.md authoring>",
  },
};

/** Resolve the launch command for a given (tool, phase) pair. */
export function getLaunchCommand(
  tool: ToolId,
  phase: CapstonePhase,
): LaunchCommand {
  const bmadInvocation = BMAD_SKILLS[phase];
  const portalPrompt = PORTAL_PROMPTS[phase];
  // Effective initial-prompt payload: the BMAD slash command for skill
  // phases, OR the portal-templated prompt for skill-less phases.
  const initialPrompt = bmadInvocation ?? portalPrompt?.fullPrompt() ?? null;
  const autoRun =
    SUPPORTS_INITIAL_PROMPT_ARGV[tool] && initialPrompt !== null;
  // What we render in the preview block. For BMAD-skill phases this is
  // the slash command itself; for portal-templated phases this is the
  // shorter previewLabel so we don't dump the whole prompt on screen.
  const previewPayload =
    bmadInvocation ?? portalPrompt?.previewLabel ?? null;

  if (tool === "claude-code") {
    const args: string[] = ["--dangerously-skip-permissions"];
    if (autoRun && initialPrompt) args.push(initialPrompt);
    return {
      cmd: "claude",
      args,
      preview: (cd) =>
        `cd ${cd}\nclaude --dangerously-skip-permissions${autoRun && previewPayload ? ` "${previewPayload}"` : ""}`,
      bmadInvocation,
      autoRun,
    };
  }

  if (tool === "codex") {
    // `--dangerously-bypass-approvals-and-sandbox` is codex's parallel
    // to claude's `--dangerously-skip-permissions`: same teaching shape
    // (long, named, scary), same effect (no per-action approval prompt).
    // The positional `[PROMPT]` rides along as the agent's first message.
    const args: string[] = ["--dangerously-bypass-approvals-and-sandbox"];
    if (autoRun && initialPrompt) args.push(initialPrompt);
    return {
      cmd: "codex",
      args,
      preview: (cd) =>
        `cd ${cd}\ncodex --dangerously-bypass-approvals-and-sandbox${autoRun && previewPayload ? ` "${previewPayload}"` : ""}`,
      bmadInvocation,
      autoRun,
    };
  }

  // github-copilot
  // `--allow-all-tools` skips per-tool confirmation. `-i "<prompt>"` is
  // documented as "Start interactive mode and automatically execute a
  // prompt" — exactly what we want for the BMAD launch.
  const args: string[] = ["--allow-all-tools"];
  if (autoRun && initialPrompt) args.push("-i", initialPrompt);
  return {
    cmd: "copilot",
    args,
    preview: (cd) =>
      `cd ${cd}\ncopilot --allow-all-tools${autoRun && previewPayload ? ` -i "${previewPayload}"` : ""}`,
    bmadInvocation,
    autoRun,
  };
}

/** Human-readable phase display name (for headings). */
export const PHASE_DISPLAY_NAMES: Record<CapstonePhase, string> = {
  brief: "Brief",
  prd: "PRD",
  architecture: "Architecture",
  "epics-and-stories": "Epics & Stories",
  "implementation-readiness": "Implementation Readiness",
  "sprint-planning": "Sprint Planning",
  "dev-story-1.1": "Dev Story 1.1",
  governance: "Governance",
};
