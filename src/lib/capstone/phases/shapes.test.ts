import { mkdirSync, mkdtempSync, rmSync, writeFileSync, existsSync, readFileSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import { nextPhase, validatePhaseShape } from "./shapes";

const cleanups: string[] = [];
afterEach(() => {
  while (cleanups.length) rmSync(cleanups.pop()!, { recursive: true, force: true });
});

function mkChosen(): string {
  const dir = mkdtempSync(path.join(tmpdir(), "phase-"));
  cleanups.push(dir);
  mkdirSync(path.join(dir, "_bmad-output", "planning-artifacts"), { recursive: true });
  return dir;
}

const REAL_FS = { existsSync, readFileSync, statSync };

describe("validatePhaseShape — brief", () => {
  it("reports artifact missing when no file exists", () => {
    const cd = mkChosen();
    const r = validatePhaseShape("brief", cd, "_bmad-output", REAL_FS);
    expect(r.artifactExists).toBe(false);
    expect(r.shapeValid).toBe(false);
  });

  it("validates a well-formed brief.md", () => {
    const cd = mkChosen();
    const file = path.join(cd, "_bmad-output", "planning-artifacts", "brief.md");
    writeFileSync(
      file,
      `# Product Brief — demo-app

## Customer

The lead engineer at a 6-person product team.

## Problem

They keep losing context across PR cycles.

## Solution

A shared-context portal that every tool reads.

## Success Criteria

A team that ships a story with all three audience cohorts hitting the same context.

## Scope

In: portal + lessons. Out: cloud deploy, multi-tenant.
`,
    );
    const r = validatePhaseShape("brief", cd, "_bmad-output", REAL_FS);
    expect(r.artifactExists).toBe(true);
    expect(r.shapeValid).toBe(true);
    expect(r.missingSections).toEqual([]);
  });

  it("flags missing sections", () => {
    const cd = mkChosen();
    const padding = "lorem ipsum ".repeat(40);
    writeFileSync(
      path.join(cd, "_bmad-output", "planning-artifacts", "brief.md"),
      `# Product Brief — x

## Customer

${padding}
`,
    );
    const r = validatePhaseShape("brief", cd, "_bmad-output", REAL_FS);
    expect(r.shapeValid).toBe(false);
    expect(r.missingSections).toEqual(
      expect.arrayContaining(["Problem", "Solution", "Success Criteria", "Scope"]),
    );
  });

  it("flags H1 mismatch", () => {
    const cd = mkChosen();
    writeFileSync(
      path.join(cd, "_bmad-output", "planning-artifacts", "brief.md"),
      `# Wrong Title — x

## Customer
## Problem
## Solution
## Success Criteria
## Scope

`.padEnd(400, "x"),
    );
    const r = validatePhaseShape("brief", cd, "_bmad-output", REAL_FS);
    expect(r.shapeValid).toBe(false);
    expect(r.reason).toContain("H1");
  });
});

describe("nextPhase", () => {
  it("walks the canonical order", () => {
    expect(nextPhase("brief")).toBe("prd");
    expect(nextPhase("prd")).toBe("architecture");
    expect(nextPhase("architecture")).toBe("epics-and-stories");
    expect(nextPhase("epics-and-stories")).toBe("adr");
    expect(nextPhase("adr")).toBe("dev-story-1.1");
    expect(nextPhase("dev-story-1.1")).toBeNull();
  });
});
