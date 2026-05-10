import { describe, expect, it } from "vitest";

import {
  PHASE_DISPLAY_NAMES,
  getLaunchCommand,
} from "./launch-commands";
import type { CapstonePhase, ToolId } from "../adapters/types";

const TOOLS: ToolId[] = ["claude-code", "codex", "github-copilot"];
const PHASES: CapstonePhase[] = [
  "brief",
  "prd",
  "architecture",
  "epics-and-stories",
  "dev-story-1.1",
];

describe("getLaunchCommand", () => {
  it("for claude-code, appends the BMAD slash command as positional argv (autoRun)", () => {
    const cmd = getLaunchCommand("claude-code", "brief");
    expect(cmd.cmd).toBe("claude");
    expect(cmd.args).toEqual([
      "--dangerously-skip-permissions",
      "/bmad-product-brief",
    ]);
    expect(cmd.autoRun).toBe(true);
  });

  it("for codex, appends the BMAD slash command as positional argv (autoRun)", () => {
    const cmd = getLaunchCommand("codex", "brief");
    expect(cmd.cmd).toBe("codex");
    expect(cmd.args).toEqual([
      "--dangerously-bypass-approvals-and-sandbox",
      "/bmad-product-brief",
    ]);
    expect(cmd.autoRun).toBe(true);
  });

  it("for github-copilot, uses -i to auto-execute the BMAD slash command", () => {
    const cmd = getLaunchCommand("github-copilot", "brief");
    expect(cmd.cmd).toBe("copilot");
    expect(cmd.args).toEqual([
      "--allow-all-tools",
      "-i",
      "/bmad-product-brief",
    ]);
    expect(cmd.autoRun).toBe(true);
  });

  it("preview includes `cd <chosenDir>` so the trainee sees the cwd context", () => {
    const cmd = getLaunchCommand("claude-code", "brief");
    expect(cmd.preview("/tmp/my-repo")).toContain("cd /tmp/my-repo");
    expect(cmd.preview("/tmp/my-repo")).toContain("claude");
  });

  it.each(TOOLS)(
    "preview surfaces the BMAD slash command in quotes for tool=%s phase=brief",
    (tool) => {
      const cmd = getLaunchCommand(tool, "brief");
      expect(cmd.preview("/tmp/r")).toContain('"/bmad-product-brief"');
    },
  );

  it.each(TOOLS)("yields a non-null bmadInvocation for tool=%s phase=brief", (tool) => {
    expect(getLaunchCommand(tool, "brief").bmadInvocation).toBe(
      "/bmad-product-brief",
    );
  });

  it.each(TOOLS)(
    "every CapstonePhase has a non-null BMAD skill (no skill-less phases after the ADR drop)",
    (tool) => {
      // Post-ADR-removal: every phase in the chain has a backing BMAD
      // skill. If a future phase ships without one, add a test that
      // explicitly covers the null case.
      for (const phase of PHASES) {
        expect(
          getLaunchCommand(tool, phase).bmadInvocation,
          `phase=${phase} should have a BMAD skill`,
        ).not.toBeNull();
      }
    },
  );

  it("dev-story phase points at /bmad-create-story (the first of the two-step workflow)", () => {
    expect(getLaunchCommand("claude-code", "dev-story-1.1").bmadInvocation).toBe(
      "/bmad-create-story",
    );
  });

  it.each(PHASES)("returns a launch command for every phase: %s", (phase) => {
    const cmd = getLaunchCommand("claude-code", phase);
    expect(cmd.cmd).toBe("claude");
    expect(cmd.preview).toBeTypeOf("function");
  });

  it.each(TOOLS)("autoRun is true for tool=%s on every phase", (tool) => {
    for (const phase of PHASES) {
      expect(getLaunchCommand(tool, phase).autoRun, `phase=${phase}`).toBe(true);
    }
  });
});

describe("PHASE_DISPLAY_NAMES", () => {
  it.each(PHASES)("has a display name for every phase: %s", (phase) => {
    expect(PHASE_DISPLAY_NAMES[phase]).toBeTypeOf("string");
    expect(PHASE_DISPLAY_NAMES[phase].length).toBeGreaterThan(0);
  });
});
