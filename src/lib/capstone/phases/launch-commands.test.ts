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
  "adr",
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

  it("for claude-code with no BMAD skill (adr), launches bare without positional", () => {
    const cmd = getLaunchCommand("claude-code", "adr");
    expect(cmd.args).toEqual(["--dangerously-skip-permissions"]);
    expect(cmd.autoRun).toBe(false);
    expect(cmd.bmadInvocation).toBeNull();
  });

  it("for codex, launches bare with autoRun:false (positional shape unverified)", () => {
    const cmd = getLaunchCommand("codex", "brief");
    expect(cmd.cmd).toBe("codex");
    expect(cmd.args).toEqual([]);
    expect(cmd.autoRun).toBe(false);
    expect(cmd.bmadInvocation).toBe("/bmad-product-brief");
  });

  it("for github-copilot, launches bare with autoRun:false (positional shape unverified)", () => {
    const cmd = getLaunchCommand("github-copilot", "brief");
    expect(cmd.cmd).toBe("copilot");
    expect(cmd.args).toEqual([]);
    expect(cmd.autoRun).toBe(false);
    expect(cmd.bmadInvocation).toBe("/bmad-product-brief");
  });

  it("preview includes `cd <chosenDir>` so the trainee sees the cwd context", () => {
    const cmd = getLaunchCommand("claude-code", "brief");
    expect(cmd.preview("/tmp/my-repo")).toContain("cd /tmp/my-repo");
    expect(cmd.preview("/tmp/my-repo")).toContain("claude");
  });

  it("claude-code preview includes the auto-run BMAD invocation in quotes", () => {
    const cmd = getLaunchCommand("claude-code", "brief");
    expect(cmd.preview("/tmp/my-repo")).toContain('"/bmad-product-brief"');
  });

  it.each(TOOLS)("yields a non-null bmadInvocation for tool=%s phase=brief", (tool) => {
    expect(getLaunchCommand(tool, "brief").bmadInvocation).toBe(
      "/bmad-product-brief",
    );
  });

  it.each(TOOLS)(
    "yields null bmadInvocation for tool=%s phase=adr (no shipped skill)",
    (tool) => {
      expect(getLaunchCommand(tool, "adr").bmadInvocation).toBeNull();
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
});

describe("PHASE_DISPLAY_NAMES", () => {
  it.each(PHASES)("has a display name for every phase: %s", (phase) => {
    expect(PHASE_DISPLAY_NAMES[phase]).toBeTypeOf("string");
    expect(PHASE_DISPLAY_NAMES[phase].length).toBeGreaterThan(0);
  });
});
