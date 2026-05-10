import type { ToolId } from "@/lib/capstone/adapters/types";

/**
 * Per-tool BMAD install layout. The skill-dir column is what
 * `npx bmad-method install --tools <tool>` actually writes:
 *   - claude-code → `.claude/skills/`
 *   - codex / github-copilot → `.agents/skills/` (BMAD's cross-tool default)
 *
 * If a future tool ships with a different layout, add a row here.
 * The bootstrap-complete page reads this map; the explainer prose
 * resolves to whichever tool the trainee actually used.
 */
const TOOL_LAYOUT: Record<ToolId, { displayName: string; skillDir: string }> = {
  "claude-code": { displayName: "Claude Code", skillDir: ".claude/skills/" },
  codex: { displayName: "Codex", skillDir: ".agents/skills/" },
  "github-copilot": {
    displayName: "GitHub Copilot",
    skillDir: ".agents/skills/",
  },
};

export type BootstrapExplainerInput = {
  /** Tool the trainee picked. If undefined, falls back to a tool-agnostic explainer. */
  tool: ToolId | undefined;
};

/**
 * Build the "What BMAD just did" markdown explainer that ships under
 * the file-tree on the bootstrap-complete page. Tool-aware: the prose
 * names the actual skill-dir + display-name for the tool the trainee
 * picked, rather than a hardcoded Claude Code reference.
 *
 * Returns plain markdown ready to feed `<Markdown source={...}>`.
 */
export function buildBootstrapExplainer(
  input: BootstrapExplainerInput,
): string {
  const layout = input.tool ? TOOL_LAYOUT[input.tool] : null;

  // Per-tool sentence describing the skill-dir wiring.
  const skillsLine = layout
    ? `**\`${layout.skillDir}\`** — the per-tool wiring for **${layout.displayName}**. The installed skills cover the full BMAD artifact chain (brief, PRD, architecture, epics + stories, dev-story, code review, retrospective, and supporting agents). Your tool now knows what BMAD knows.`
    : `**Tool-specific skills directory** — the wiring BMAD installed for the AI tool you picked (Claude Code lands under \`.claude/skills/\`; Codex and GitHub Copilot land under \`.agents/skills/\`). Either way the contract is the same: your tool now knows what BMAD knows.`;

  return [
    "## What BMAD just did",
    "",
    `- **\`_bmad/\`** — the BMAD scaffolding itself: shared scripts, the BMad Core module, the BMad Method module, and a \`config.yaml\` carrying the answers you just typed. This is what makes BMAD a *thing your team uses*, not a docs site to read.`,
    `- ${skillsLine}`,
    `- **\`_bmad-output/planning-artifacts/\`** and **\`_bmad-output/implementation-artifacts/\`** — empty for now. The next phases populate them: brief → PRD → architecture → epics + stories → ADR → working code for story 1.1. Files in these folders are the *contract* between phases.`,
    `- **\`docs/\`** — placeholder for the long-term project knowledge BMAD will build up as your team uses the repo.`,
    "",
    `Next, you'll chat with your AI tool through those phases. Each phase loads the prior artifacts as context. The HANDOFF.md you'll generate at the end has the \`git init\` + push instructions for your team's GitHub org — BMAD's installer leaves git untouched on purpose so the trainee can decide whether the repo starts fresh or layers onto an existing one.`,
    "",
  ].join("\n");
}
