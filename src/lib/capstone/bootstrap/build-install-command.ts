import path from "node:path";

import type { ToolId } from "../adapters/types";
import type { SupportedLanguage } from "./languages";
import type { SkillLevel } from "./skill-levels";

export interface InstallCommandInput {
  bmadVersion: string;
  chosenDir: string;
  tool: ToolId;
  projectName: string;
  communicationLanguage: SupportedLanguage;
  documentOutputLanguage: SupportedLanguage;
  skillLevel: SkillLevel;
  /** Relative output folder (relative to chosenDir). */
  outputFolder: string;
}

export interface InstallCommand {
  cmd: string;
  args: string[];
  /** A single-line preview suitable for displaying in the UI. */
  preview: string;
  /** A multi-line preview for readability (one --flag per line). */
  multilinePreview: string;
}

/**
 * Build the npx bmad-method install command from wizard inputs.
 * Pure function — no side effects.
 *
 * The `--yes` flag is non-negotiable per F-DEF-7 (anti-deadlock — the
 * install MUST NOT block on stdin).
 */
export function buildInstallCommand(input: InstallCommandInput): InstallCommand {
  const {
    bmadVersion,
    chosenDir,
    tool,
    projectName,
    communicationLanguage,
    documentOutputLanguage,
    skillLevel,
    outputFolder,
  } = input;
  const resolvedOutputFolder = path.posix.join(outputFolder);
  const args = [
    `bmad-method@${bmadVersion}`,
    "install",
    "--directory",
    chosenDir,
    "--modules",
    "bmm",
    "--tools",
    tool,
    "--set",
    `core.project_name=${projectName}`,
    "--set",
    `core.communication_language=${communicationLanguage}`,
    "--set",
    `core.document_output_language=${documentOutputLanguage}`,
    "--set",
    `core.user_skill_level=${skillLevel}`,
    "--set",
    `core.output_folder=${resolvedOutputFolder}`,
    "--yes",
  ];
  const cmd = "npx";
  const preview = `${cmd} ${args.join(" ")}`;
  const multilinePreview = [
    `${cmd} ${args[0]}`,
    `  ${args[1]}`,
    `  ${args[2]} ${args[3]}`,
    `  ${args[4]} ${args[5]}`,
    `  ${args[6]} ${args[7]}`,
    `  ${args[8]} ${args[9]}`,
    `  ${args[10]} ${args[11]}`,
    `  ${args[12]} ${args[13]}`,
    `  ${args[14]} ${args[15]}`,
    `  ${args[16]} ${args[17]}`,
    `  ${args[18]}`,
  ].join("\n");
  return { cmd, args, preview, multilinePreview };
}
