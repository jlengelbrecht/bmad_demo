import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { loadContent } from "./load-content";

describe("loadContent", () => {
  let tmp: string;
  let cwdSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    tmp = mkdtempSync(path.join(tmpdir(), "load-content-"));
    // Use vi.spyOn so concurrent Vitest workers don't collide on the
    // process-global cwd (which `process.chdir` would mutate).
    cwdSpy = vi.spyOn(process, "cwd").mockReturnValue(tmp);
  });

  afterEach(() => {
    cwdSpy.mockRestore();
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

  it("rejects path-traversal attempts that would escape the project root", () => {
    // Create a sibling file outside `tmp` to prove the guard refuses it.
    const siblingDir = mkdtempSync(path.join(tmpdir(), "load-content-outside-"));
    const siblingFile = path.join(siblingDir, "secret.md");
    writeFileSync(siblingFile, "secret\n");
    try {
      // Compose a relative path that resolves outside `tmp`.
      const relUp = path.relative(tmp, siblingFile);
      const result = loadContent(relUp);
      expect(result).toBeNull();
    } finally {
      rmSync(siblingDir, { recursive: true, force: true });
    }
  });
});
