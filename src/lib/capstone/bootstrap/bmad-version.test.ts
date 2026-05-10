import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  __resetBmadVersionCacheForTests,
  INSTALL_TAG,
  readInstalledBmadVersion,
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

describe("INSTALL_TAG", () => {
  it("defaults to 'latest' when no env override is set", () => {
    // The constant is read at module-load time; the test confirms the
    // documented default is in effect for normal runs (CI does not set
    // BMAD_INSTALL_TAG).
    expect(INSTALL_TAG).toBe(process.env.BMAD_INSTALL_TAG || "latest");
  });
});

describe("readInstalledBmadVersion", () => {
  it("parses the version: field from manifest.yaml", () => {
    writeFileSync(
      path.join(dir, "_bmad", "_config", "manifest.yaml"),
      "installation:\n  version: 6.7.1\n",
    );
    expect(readInstalledBmadVersion(dir)).toBe("6.7.1");
  });

  it("memoizes per-cwd — second call does not re-read the file", () => {
    writeFileSync(
      path.join(dir, "_bmad", "_config", "manifest.yaml"),
      "installation:\n  version: 6.6.0\n",
    );
    const a = readInstalledBmadVersion(dir);
    // Mutate the file; the memoized version should not change for this cwd.
    writeFileSync(
      path.join(dir, "_bmad", "_config", "manifest.yaml"),
      "installation:\n  version: 9.9.9\n",
    );
    expect(readInstalledBmadVersion(dir)).toBe(a);
  });

  it("memoizes per-cwd — distinct cwds get distinct reads", () => {
    const dirB = mkdtempSync(path.join(tmpdir(), "bmad-ver-b-"));
    mkdirSync(path.join(dirB, "_bmad", "_config"), { recursive: true });
    try {
      writeFileSync(
        path.join(dir, "_bmad", "_config", "manifest.yaml"),
        "installation:\n  version: 6.6.0\n",
      );
      writeFileSync(
        path.join(dirB, "_bmad", "_config", "manifest.yaml"),
        "installation:\n  version: 7.0.0\n",
      );
      expect(readInstalledBmadVersion(dir)).toBe("6.6.0");
      expect(readInstalledBmadVersion(dirB)).toBe("7.0.0");
    } finally {
      rmSync(dirB, { recursive: true, force: true });
    }
  });

  it("throws when manifest is missing the version: field", () => {
    writeFileSync(
      path.join(dir, "_bmad", "_config", "manifest.yaml"),
      "installation:\n  installDate: 2026-05-08\n",
    );
    expect(() => readInstalledBmadVersion(dir)).toThrow(/missing a 'version:'/);
  });

  it("throws when manifest file is missing", () => {
    expect(() => readInstalledBmadVersion(dir)).toThrow();
  });
});
