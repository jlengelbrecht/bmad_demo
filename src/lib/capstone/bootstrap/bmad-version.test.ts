import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  __resetBmadVersionCacheForTests,
  getPinnedBmadVersion,
} from "./bmad-version";

let dir: string;

beforeEach(() => {
  __resetBmadVersionCacheForTests();
  dir = mkdtempSync(path.join(tmpdir(), "bmad-ver-"));
  mkdirSync(path.join(dir, "_bmad", "_config"), { recursive: true });
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

describe("getPinnedBmadVersion", () => {
  it("parses the version: field from manifest.yaml", () => {
    writeFileSync(
      path.join(dir, "_bmad", "_config", "manifest.yaml"),
      "installation:\n  version: 6.7.1\n",
    );
    expect(getPinnedBmadVersion(dir)).toBe("6.7.1");
  });

  it("memoizes — second call does not re-read the file", () => {
    writeFileSync(
      path.join(dir, "_bmad", "_config", "manifest.yaml"),
      "installation:\n  version: 6.6.0\n",
    );
    const a = getPinnedBmadVersion(dir);
    // Mutate the file; the memoized version should not change.
    writeFileSync(
      path.join(dir, "_bmad", "_config", "manifest.yaml"),
      "installation:\n  version: 9.9.9\n",
    );
    expect(getPinnedBmadVersion(dir)).toBe(a);
  });

  it("throws when manifest is missing the version: field", () => {
    writeFileSync(
      path.join(dir, "_bmad", "_config", "manifest.yaml"),
      "installation:\n  installDate: 2026-05-08\n",
    );
    expect(() => getPinnedBmadVersion(dir)).toThrow(/missing a 'version:'/);
  });

  it("throws when manifest file is missing", () => {
    expect(() => getPinnedBmadVersion(dir)).toThrow();
  });
});
