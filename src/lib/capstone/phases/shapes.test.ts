import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
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
  mkdirSync(path.join(dir, "_bmad-output", "planning-artifacts"), {
    recursive: true,
  });
  return dir;
}

function writeArtifact(cd: string, name: string, body: string): void {
  writeFileSync(path.join(cd, "_bmad-output", "planning-artifacts", name), body);
}

const REAL_FS = { existsSync, statSync, readdirSync };

describe("validatePhaseShape — brief", () => {
  it("reports artifact missing when no file exists", () => {
    const cd = mkChosen();
    const r = validatePhaseShape("brief", cd, "_bmad-output", REAL_FS);
    expect(r.artifactExists).toBe(false);
    expect(r.shapeValid).toBe(false);
    expect(r.candidates).toEqual([]);
    expect(r.reason).toBeDefined();
  });

  it("matches the canonical product-brief-<project>.md filename", () => {
    const cd = mkChosen();
    const padding = "x".repeat(300);
    writeArtifact(cd, "product-brief-bmad-test2.md", padding);
    const r = validatePhaseShape("brief", cd, "_bmad-output", REAL_FS);
    expect(r.artifactExists).toBe(true);
    expect(r.shapeValid).toBe(true);
    expect(r.artifactPath).toMatch(/product-brief-bmad-test2\.md$/);
    expect(r.sizeBytes).toBeGreaterThanOrEqual(200);
  });

  it("ignores the -distillate sibling file when picking the canonical brief", () => {
    const cd = mkChosen();
    const padding = "x".repeat(300);
    // Distillate exists alongside the brief; we must not pick the
    // distillate as the brief artifact.
    writeArtifact(cd, "product-brief-myapp-distillate.md", padding);
    writeArtifact(cd, "product-brief-myapp.md", padding);
    const r = validatePhaseShape("brief", cd, "_bmad-output", REAL_FS);
    expect(r.artifactExists).toBe(true);
    expect(r.artifactPath).toMatch(/product-brief-myapp\.md$/);
    expect(r.artifactPath).not.toMatch(/distillate/);
  });

  it("falls back to brief.md when present and no canonical name exists", () => {
    const cd = mkChosen();
    writeArtifact(cd, "brief.md", "x".repeat(300));
    const r = validatePhaseShape("brief", cd, "_bmad-output", REAL_FS);
    expect(r.artifactExists).toBe(true);
    expect(r.shapeValid).toBe(true);
    expect(r.artifactPath).toMatch(/brief\.md$/);
  });

  it("rejects suspiciously small artifacts", () => {
    const cd = mkChosen();
    writeArtifact(cd, "product-brief-x.md", "tiny");
    const r = validatePhaseShape("brief", cd, "_bmad-output", REAL_FS);
    expect(r.artifactExists).toBe(true);
    expect(r.shapeValid).toBe(false);
    expect(r.reason).toMatch(/too small/);
  });

  it("returns the candidate list when no file matches", () => {
    const cd = mkChosen();
    writeArtifact(cd, "random-doc.md", "x".repeat(300));
    writeArtifact(cd, "notes.md", "x".repeat(300));
    const r = validatePhaseShape("brief", cd, "_bmad-output", REAL_FS);
    expect(r.artifactExists).toBe(false);
    expect(r.candidates).toEqual(["notes.md", "random-doc.md"]);
    expect(r.patternsTried.length).toBeGreaterThan(0);
  });
});

describe("validatePhaseShape — epics-and-stories", () => {
  it("matches the canonical epics.md filename (not epics-and-stories.md)", () => {
    const cd = mkChosen();
    writeArtifact(cd, "epics.md", "x".repeat(300));
    const r = validatePhaseShape(
      "epics-and-stories",
      cd,
      "_bmad-output",
      REAL_FS,
    );
    expect(r.artifactExists).toBe(true);
    expect(r.shapeValid).toBe(true);
    expect(r.artifactPath).toMatch(/epics\.md$/);
  });

  it("falls back to epics-and-stories.md", () => {
    const cd = mkChosen();
    writeArtifact(cd, "epics-and-stories.md", "x".repeat(300));
    const r = validatePhaseShape(
      "epics-and-stories",
      cd,
      "_bmad-output",
      REAL_FS,
    );
    expect(r.artifactExists).toBe(true);
    expect(r.artifactPath).toMatch(/epics-and-stories\.md$/);
  });
});

describe("validatePhaseShape — prd / architecture", () => {
  it("matches prd.md", () => {
    const cd = mkChosen();
    writeArtifact(cd, "prd.md", "x".repeat(500));
    const r = validatePhaseShape("prd", cd, "_bmad-output", REAL_FS);
    expect(r.shapeValid).toBe(true);
  });

  it("matches architecture.md", () => {
    const cd = mkChosen();
    writeArtifact(cd, "architecture.md", "x".repeat(500));
    const r = validatePhaseShape("architecture", cd, "_bmad-output", REAL_FS);
    expect(r.shapeValid).toBe(true);
  });
});

describe("validatePhaseShape — search-dir missing", () => {
  it("returns artifactExists=false when planning-artifacts doesn't exist", () => {
    const cd = mkdtempSync(path.join(tmpdir(), "phase-empty-"));
    cleanups.push(cd);
    const r = validatePhaseShape("brief", cd, "_bmad-output", REAL_FS);
    expect(r.artifactExists).toBe(false);
    expect(r.reason).toMatch(/does not exist/);
  });
});

describe("nextPhase", () => {
  it("returns the next phase in order", () => {
    expect(nextPhase("brief")).toBe("prd");
    expect(nextPhase("prd")).toBe("architecture");
    expect(nextPhase("architecture")).toBe("epics-and-stories");
    expect(nextPhase("epics-and-stories")).toBe("dev-story-1.1");
  });

  it("returns null after the final phase", () => {
    expect(nextPhase("dev-story-1.1")).toBe(null);
  });
});
