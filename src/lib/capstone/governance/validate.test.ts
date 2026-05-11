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

import { validateGovernancePhaseShape } from "./validate";

const REAL_FS = { existsSync, statSync, readdirSync };
const cleanups: string[] = [];
afterEach(() => {
  while (cleanups.length) rmSync(cleanups.pop()!, { recursive: true, force: true });
});

function mkRepo(): string {
  const dir = mkdtempSync(path.join(tmpdir(), "gov-"));
  cleanups.push(dir);
  return dir;
}

function write(dir: string, rel: string, body: string): void {
  const abs = path.join(dir, rel);
  mkdirSync(path.dirname(abs), { recursive: true });
  writeFileSync(abs, body);
}

const PADDING = "x".repeat(500);

describe("validateGovernancePhaseShape", () => {
  it("reports both files missing when nothing is on disk", () => {
    const cd = mkRepo();
    const r = validateGovernancePhaseShape(cd, REAL_FS);
    expect(r.shapeValid).toBe(false);
    expect(r.codeownersPath).toBeNull();
    expect(r.contributingPath).toBeNull();
    expect(r.reason).toMatch(/CODEOWNERS not found/);
    expect(r.reason).toMatch(/CONTRIBUTING\.md not found/);
  });

  it("passes when both files exist under .github/ at meeting size", () => {
    const cd = mkRepo();
    write(cd, ".github/CODEOWNERS", PADDING);
    write(cd, ".github/CONTRIBUTING.md", PADDING);
    const r = validateGovernancePhaseShape(cd, REAL_FS);
    expect(r.shapeValid).toBe(true);
    expect(r.codeownersPath).toBe(".github/CODEOWNERS");
    expect(r.contributingPath).toBe(".github/CONTRIBUTING.md");
    expect(r.reason).toBeUndefined();
  });

  it("passes when both files exist at repo root", () => {
    const cd = mkRepo();
    write(cd, "CODEOWNERS", PADDING);
    write(cd, "CONTRIBUTING.md", PADDING);
    const r = validateGovernancePhaseShape(cd, REAL_FS);
    expect(r.shapeValid).toBe(true);
    expect(r.codeownersPath).toBe("CODEOWNERS");
    expect(r.contributingPath).toBe("CONTRIBUTING.md");
  });

  it("prefers .github/ over repo root when both are present", () => {
    const cd = mkRepo();
    write(cd, ".github/CODEOWNERS", PADDING);
    write(cd, "CODEOWNERS", PADDING);
    write(cd, ".github/CONTRIBUTING.md", PADDING);
    write(cd, "CONTRIBUTING.md", PADDING);
    const r = validateGovernancePhaseShape(cd, REAL_FS);
    expect(r.codeownersPath).toBe(".github/CODEOWNERS");
    expect(r.contributingPath).toBe(".github/CONTRIBUTING.md");
  });

  it("fails when only CODEOWNERS exists; reason names CONTRIBUTING.md", () => {
    const cd = mkRepo();
    write(cd, ".github/CODEOWNERS", PADDING);
    const r = validateGovernancePhaseShape(cd, REAL_FS);
    expect(r.shapeValid).toBe(false);
    expect(r.codeownersPath).toBe(".github/CODEOWNERS");
    expect(r.contributingPath).toBeNull();
    expect(r.reason).toMatch(/CONTRIBUTING\.md not found/);
    expect(r.reason).not.toMatch(/CODEOWNERS not found/);
  });

  it("fails when only CONTRIBUTING.md exists; reason names CODEOWNERS", () => {
    const cd = mkRepo();
    write(cd, "CONTRIBUTING.md", PADDING);
    const r = validateGovernancePhaseShape(cd, REAL_FS);
    expect(r.shapeValid).toBe(false);
    expect(r.codeownersPath).toBeNull();
    expect(r.contributingPath).toBe("CONTRIBUTING.md");
    expect(r.reason).toMatch(/CODEOWNERS not found/);
  });

  it("fails when both files are too small (placeholder scaffolding)", () => {
    const cd = mkRepo();
    write(cd, ".github/CODEOWNERS", "* @x\n");
    write(cd, "CONTRIBUTING.md", "TODO\n");
    const r = validateGovernancePhaseShape(cd, REAL_FS);
    expect(r.shapeValid).toBe(false);
    expect(r.reason).toMatch(/too small/);
  });

  it("fails when one file is well-sized and the other is too small", () => {
    const cd = mkRepo();
    write(cd, ".github/CODEOWNERS", PADDING);
    write(cd, "CONTRIBUTING.md", "tiny");
    const r = validateGovernancePhaseShape(cd, REAL_FS);
    expect(r.shapeValid).toBe(false);
    expect(r.reason).toMatch(/CONTRIBUTING\.md.*too small/);
  });
});
