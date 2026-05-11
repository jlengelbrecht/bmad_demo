/**
 * Templated opening prompt for the governance phase.
 *
 * Unlike every prior capstone phase — which launches the trainee's AI
 * tool with a BMAD slash command (e.g., `/bmad-product-brief`) — the
 * governance phase has no shipped BMAD skill. BMAD core ships no
 * `bmad-create-codeowners` or `bmad-create-contributing` skill, so the
 * portal drives the conversation directly via this multi-paragraph
 * prompt that the AI tool receives as its first user message.
 *
 * The prompt:
 *   1. Tells the AI to RESEARCH first — read BMAD's config, the actual
 *      installed skills, and the trainee's repo layout — before asking
 *      any questions. This grounds every later answer in reality and
 *      prevents the AI from hallucinating paths like
 *      `_bmad-output/stories/` when BMAD actually writes story specs to
 *      `_bmad-output/implementation-artifacts/`.
 *   2. Drives a Socratic discovery across the four decision points
 *      (ownership, ceremonies, AI-vs-non-AI, branch protection).
 *   3. Requires a self-verification pass — the AI re-reads its draft
 *      and checks every referenced file path against the filesystem
 *      before writing, so the file the trainee `git add`s is correct.
 *   4. Specifies write targets: `.github/CODEOWNERS` (preferred) and
 *      `CONTRIBUTING.md` at repo root.
 *
 * If you change this template, update the test alongside — the test
 * pins the literal phrases the prompt depends on so future edits don't
 * silently weaken the governance contract or the research/verify steps.
 */
export function governancePromptTemplate(): string {
  return `You are helping the user author the team-governance files for this repo. By the end of this conversation you will write \`.github/CODEOWNERS\` (preferred path) or \`CODEOWNERS\` at repo root, AND \`CONTRIBUTING.md\` at repo root.

This is the final phase of the BMAD capstone. The user has just shipped their first story using BMAD. They now need to codify how their team will collaborate on this repo going forward — both the *machine gate* (CODEOWNERS routes mandatory reviewers; without it nothing actually enforces who must approve) and the *human path* (CONTRIBUTING.md tells anyone — AI-using or not — how to propose a change).

## Step 1 — Research first (before any questions)

Before you ask the user a single question, do the following research so every later answer is grounded in this repo's actual state, not generic assumptions. Tell the user briefly what you're doing ("let me look at your repo structure first") so they know why you're not asking yet.

**Research BMAD itself in this repo:**
- Read \`_bmad/bmm/config.yaml\` to discover the trainee's actual \`output_folder\`, \`planning_artifacts\`, and \`implementation_artifacts\` settings. Trainees may have customized these during \`npx bmad-method install\` — do NOT assume \`_bmad-output/\`.
- List the directories under \`_bmad/\` to confirm what BMAD modules are installed (bmm, core, etc.).
- List the installed skills (look under \`.claude/skills/\`, \`.codex/skills/\`, OR \`.github/copilot-skills/\` depending on which AI tool is in use). Use the actual installed skill names — do NOT invent names like \`bmad-checkpoint-preview\` if that skill is not installed.
- Read \`AGENTS.md\` (or \`.github/copilot-instructions.md\`) to confirm the canonical workflow names the team will be using.

**Research the trainee's repo layout:**
- List the top-level directories in the repo (\`ls -la\` from repo root) to understand what code areas exist. These are the candidates for CODEOWNERS routing — propose ownership rules grounded in what's actually there, not generic \`/src/api/\` placeholders.
- List what's under the resolved \`output_folder\` (e.g., \`_bmad-output/planning-artifacts/\`, \`_bmad-output/implementation-artifacts/\`) so you know the EXACT paths to reference in CONTRIBUTING.md when describing where stories, PRDs, etc. live.
- Confirm whether \`.github/\` exists already, and if so what's in it (existing CODEOWNERS, workflow files, etc.).
- Check whether the repo has a \`package.json\`, \`pyproject.toml\`, \`go.mod\`, etc. so you know what test command CONTRIBUTING.md should reference.

After this research, briefly summarize what you found ("Your output_folder is X, your story specs live at Y, your top-level directories are A/B/C") so the user can correct anything you misread. Then move to Step 2.

## Step 2 — Drive the four decision points

Ask 1–2 questions per turn. Summarize what you've heard before moving to the next decision point so the user can correct drift. Reference the things you discovered in Step 1 — never use generic placeholders.

1. **Ownership routing.** Walk the trainee through the actual top-level directories you discovered in Step 1. For each, ask who owns it. At minimum cover: who owns \`_bmad/\` (the BMAD config), who owns the resolved \`planning_artifacts\` directory, who owns the resolved \`implementation_artifacts\` directory, and who owns each top-level code/infra area. Map answers directly to CODEOWNERS rules using the REAL paths.

2. **Team ceremonies.** Which BMAD ceremonies does the team commit to? Story-grooming cadence, sprint-planning rhythm, retrospective trigger ("after each epic" vs "monthly"), code-review SLA. Reference the actual installed skills you discovered in Step 1 (e.g., if \`bmad-retrospective\` is installed, name it; if not, don't). These become a "Team Ceremonies" section in CONTRIBUTING.md.

3. **AI-vs-non-AI contribution path.** Ask the user explicitly whether the team accepts contributions from people who do NOT use BMAD or any AI tool. If yes, the CONTRIBUTING.md must include a "Contributing without AI" section that describes a path satisfying the same governance gates — CODEOWNERS approval, a story spec exists at the REAL implementation_artifacts path, tests are green — without requiring any AI tool. If no, state explicitly in CONTRIBUTING.md that BMAD usage is required for all contributions.

4. **Branch protection.** Summarize for the user that CODEOWNERS only enforces mandatory review when the repo's branch protection rules require it. The CONTRIBUTING.md should state this as a prerequisite for governance to actually function — the user must enable "Require a pull request before merging" + "Require review from Code Owners" in their repo's branch protection settings after pushing. You cannot do this for them; surface it as a step they own.

## Step 3 — Verify before writing

Before writing either file, draft both internally and then walk through every file path, directory reference, and skill name in your draft and CHECK each one:

- For every path you wrote (\`_bmad-output/...\`, \`.github/...\`, etc.), use your file-reading tool to confirm the path exists in this repo OR confirm it's a path the trainee will create. If a path you wrote doesn't exist and shouldn't, fix the draft.
- For every BMAD skill name you referenced, confirm it appeared in the skills you discovered in Step 1. Remove or correct any names you cannot verify.
- For the CODEOWNERS rules, confirm every path glob matches at least one actual file or directory in the repo (or is a deliberately defensive rule for files that don't exist yet, like \`.github/workflows/\` if no workflows exist). Drop rules that don't match anything.

Tell the user what you verified and what (if anything) you corrected during this pass.

## Step 4 — Write the files

Write CODEOWNERS to \`.github/CODEOWNERS\` (preferred) or \`CODEOWNERS\` at repo root. Use the user's actual answers and the actual repo paths from Step 1; do NOT write placeholder text like \`* @your-org/your-team\` or \`<replace-this>\`. If a path's owner wasn't decided, ask one more question rather than emitting a placeholder.

Write CONTRIBUTING.md to the repo root. Reference the team's actual ceremonies, the actual CODEOWNERS path, the REAL planning_artifacts / implementation_artifacts paths from Step 1, and (if applicable) the "Contributing without AI" section.

Both files must be concrete and ready to \`git add\`. No leftover prompt scaffolding, no \`<placeholder>\` strings, no template fences. The user will read the diff before merging.

Begin with Step 1 (research) right now. Don't ask the user anything yet — read the repo first, then summarize what you found.`;
}
