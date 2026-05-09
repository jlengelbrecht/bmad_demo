import { readFileSync } from "node:fs";
import path from "node:path";

export interface HandoffData {
  projectName: string;
  chosenDir: string;
  toolDisplayName: string;
  artifactList: string;
  gitLogOutput: string;
  bmadVersion: string;
  date: string;
}

export function renderHandoff(data: HandoffData, templatePath?: string): string {
  const tplPath =
    templatePath ??
    path.join(
      import.meta.dirname,
      "HANDOFF.template.md",
    );
  const template = readFileSync(tplPath, "utf8");
  const map: Record<string, string> = {
    "project-name": data.projectName || "<unknown>",
    "chosen-dir": data.chosenDir || "<unknown>",
    "tool-display-name": data.toolDisplayName || "<unknown>",
    "artifact-list": data.artifactList || "<no artifacts found>",
    "git-log-output": data.gitLogOutput || "(no git log available)",
    "bmad-version": data.bmadVersion || "<unknown>",
    date: data.date,
  };
  return template.replace(/{{([^}]+)}}/g, (_, key: string) => {
    const v = map[key.trim()];
    return v ?? `<unknown:${key}>`;
  });
}
