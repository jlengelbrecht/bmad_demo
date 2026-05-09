import type { CapstonePhase, ToolId } from "../adapters/types";

/**
 * Per-tool launch command for an interactive AI-tool session inside
 * the trainee's CHOSEN_DIR. The command is what the trainee SEES in
 * the bootstrap-style preview before clicking "Open terminal" — same
 * teaching shape as Phase 2's `npx bmad-method install`.
 *
 * For Claude Code we pass `--dangerously-skip-permissions` so the
 * trainee isn't prompted for every file write during the BMAD-driven
 * artifact generation. For codex / github-copilot the launch shape
 * is best-effort pending hands-on validation; the preview text below
 * makes that explicit so the trainee isn't surprised.
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
   * When `true`, the BMAD invocation is appended as a positional argv
   * so the tool auto-executes it on launch — trainee lands directly
   * in the workflow, no typing required. When `false`, the trainee
   * sees a "type this" hint and runs the command manually.
   */
  autoRun: boolean;
}

/**
 * BMAD skill mapping per phase. Names match the skills installed
 * under `.claude/skills/` (and equivalent dirs for codex / copilot)
 * by `npx bmad-method install`.
 *
 * The ADR phase has no shipped BMAD skill — the trainee writes the
 * ADR by hand following the conventions taught in lessons. The
 * dev-story phase is two skills back-to-back (`/bmad-create-story`
 * then `/bmad-dev-story`); the preview surfaces the first.
 */
const BMAD_SKILLS: Record<CapstonePhase, string | null> = {
  brief: "/bmad-product-brief",
  prd: "/bmad-create-prd",
  architecture: "/bmad-create-architecture",
  "epics-and-stories": "/bmad-create-epics-and-stories",
  adr: null,
  "dev-story-1.1": "/bmad-create-story",
};

/**
 * Whether a tool's CLI accepts a slash-command as a positional argv
 * that gets executed on launch. When true, the launch command appends
 * the BMAD invocation to argv and the trainee lands directly in the
 * BMAD workflow — no extra typing.
 *
 * Validated for Claude Code 2.1.x: the positional `prompt` argument
 * IS routed through the slash-command parser at session start.
 *
 * TODO(codex / github-copilot): the equivalent flag/positional shape
 * has NOT been validated against a real install. Until then we launch
 * those tools bare and the trainee types the BMAD invocation by hand
 * (the chat-phase page surfaces it as a "type this" hint).
 */
const SUPPORTS_INITIAL_PROMPT_ARGV: Record<ToolId, boolean> = {
  "claude-code": true,
  codex: false,
  "github-copilot": false,
};

/** Resolve the launch command for a given (tool, phase) pair. */
export function getLaunchCommand(
  tool: ToolId,
  phase: CapstonePhase,
): LaunchCommand {
  const bmadInvocation = BMAD_SKILLS[phase];
  const autoRun =
    SUPPORTS_INITIAL_PROMPT_ARGV[tool] && bmadInvocation !== null;

  if (tool === "claude-code") {
    const args: string[] = ["--dangerously-skip-permissions"];
    if (autoRun && bmadInvocation) args.push(bmadInvocation);
    return {
      cmd: "claude",
      args,
      preview: (cd) =>
        `cd ${cd}\nclaude --dangerously-skip-permissions${autoRun ? ` "${bmadInvocation!}"` : ""}`,
      bmadInvocation,
      autoRun,
    };
  }

  if (tool === "codex") {
    return {
      cmd: "codex",
      args: [],
      preview: (cd) => `cd ${cd}\ncodex`,
      bmadInvocation,
      autoRun: false,
    };
  }

  // github-copilot
  return {
    cmd: "copilot",
    args: [],
    preview: (cd) => `cd ${cd}\ncopilot`,
    bmadInvocation,
    autoRun: false,
  };
}

/** Human-readable phase display name (for headings). */
export const PHASE_DISPLAY_NAMES: Record<CapstonePhase, string> = {
  brief: "Brief",
  prd: "PRD",
  architecture: "Architecture",
  "epics-and-stories": "Epics & Stories",
  adr: "ADR",
  "dev-story-1.1": "Dev Story 1.1",
};
