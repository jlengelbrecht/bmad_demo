import { describe, expect, it } from "vitest";

import { buildInstallCommand } from "./build-install-command";

describe("buildInstallCommand", () => {
  const base = {
    bmadVersion: "6.6.0",
    chosenDir: "/home/dev/projects/my-app",
    tool: "claude-code" as const,
    projectName: "my-app",
    communicationLanguage: "English" as const,
    documentOutputLanguage: "English" as const,
    skillLevel: "intermediate" as const,
    outputFolder: "_bmad-output",
  };

  it("produces argv with the pinned version and all --set flags", () => {
    const c = buildInstallCommand(base);
    expect(c.cmd).toBe("npx");
    expect(c.args[0]).toBe("bmad-method@6.6.0");
    expect(c.args).toContain("--directory");
    expect(c.args).toContain("/home/dev/projects/my-app");
    expect(c.args).toContain("--tools");
    expect(c.args).toContain("claude-code");
    expect(c.args.filter((a) => a === "--set")).toHaveLength(5);
    expect(c.args).toContain("core.project_name=my-app");
    expect(c.args).toContain("core.communication_language=English");
    expect(c.args).toContain("core.document_output_language=English");
    expect(c.args).toContain("core.user_skill_level=intermediate");
    expect(c.args).toContain("core.output_folder=_bmad-output");
  });

  it("always includes --yes (anti-deadlock per F-DEF-7)", () => {
    expect(buildInstallCommand(base).args).toContain("--yes");
  });

  it("varies tool flag per input", () => {
    expect(buildInstallCommand({ ...base, tool: "codex" }).args).toContain("codex");
    expect(buildInstallCommand({ ...base, tool: "github-copilot" }).args).toContain(
      "github-copilot",
    );
  });

  it("preview is a single-line string", () => {
    expect(buildInstallCommand(base).preview).not.toContain("\n");
  });

  it("multilinePreview is multi-line and starts with `npx bmad-method@`", () => {
    const lines = buildInstallCommand(base).multilinePreview.split("\n");
    expect(lines.length).toBeGreaterThan(5);
    expect(lines[0]).toMatch(/^npx bmad-method@6\.6\.0/);
  });
});
