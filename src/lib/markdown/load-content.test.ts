import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { loadContent } from "./load-content";

describe("loadContent", () => {
  let tmp: string;
  let originalCwd: string;

  beforeEach(() => {
    tmp = mkdtempSync(path.join(tmpdir(), "load-content-"));
    originalCwd = process.cwd();
    process.chdir(tmp);
  });

  afterEach(() => {
    process.chdir(originalCwd);
    rmSync(tmp, { recursive: true, force: true });
  });

  it("returns the source and an absolute sourcePath when the file exists", () => {
    writeFileSync(path.join(tmp, "lesson.md"), "# Hello\n");
    const result = loadContent("lesson.md");
    expect(result).not.toBeNull();
    expect(result?.source).toBe("# Hello\n");
    expect(path.isAbsolute(result!.sourcePath)).toBe(true);
  });

  it("returns null when the file does not exist", () => {
    const result = loadContent("does-not-exist.md");
    expect(result).toBeNull();
  });

  it("resolves relative paths against process.cwd()", () => {
    writeFileSync(path.join(tmp, "nested.md"), "body\n");
    const result = loadContent("nested.md");
    expect(result?.sourcePath).toBe(path.join(tmp, "nested.md"));
  });
});
