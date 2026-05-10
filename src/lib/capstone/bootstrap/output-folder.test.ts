import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import { readBmadOutputFolder } from "./output-folder";

const cleanups: string[] = [];
afterEach(() => {
  while (cleanups.length) rmSync(cleanups.pop()!, { recursive: true, force: true });
});

function mkDir(): string {
  const dir = mkdtempSync(path.join(tmpdir(), "bmad-out-"));
  cleanups.push(dir);
  return dir;
}

function writeConfig(chosenDir: string, body: string): void {
  const cfgDir = path.join(chosenDir, "_bmad", "bmm");
  mkdirSync(cfgDir, { recursive: true });
  writeFileSync(path.join(cfgDir, "config.yaml"), body);
}

describe("readBmadOutputFolder", () => {
  it("returns the BMAD default when no config exists", () => {
    const dir = mkDir();
    expect(readBmadOutputFolder(dir)).toBe("_bmad-output");
  });

  it("parses the canonical {project-root}/_bmad-output value", () => {
    const dir = mkDir();
    writeConfig(
      dir,
      `output_folder: "{project-root}/_bmad-output"\nproject_name: demo\n`,
    );
    expect(readBmadOutputFolder(dir)).toBe("_bmad-output");
  });

  it("handles a trainee-customized folder name", () => {
    const dir = mkDir();
    writeConfig(
      dir,
      `# header\noutput_folder: "{project-root}/bmad-artifacts"\n`,
    );
    expect(readBmadOutputFolder(dir)).toBe("bmad-artifacts");
  });

  it("accepts unquoted values", () => {
    const dir = mkDir();
    writeConfig(dir, `output_folder: {project-root}/build/bmad\n`);
    expect(readBmadOutputFolder(dir)).toBe("build/bmad");
  });

  it("handles {project_root} (underscore variant)", () => {
    const dir = mkDir();
    writeConfig(dir, `output_folder: "{project_root}/output"\n`);
    expect(readBmadOutputFolder(dir)).toBe("output");
  });

  it("falls back when the output_folder key is missing", () => {
    const dir = mkDir();
    writeConfig(dir, `user_name: devbox\nproject_name: x\n`);
    expect(readBmadOutputFolder(dir)).toBe("_bmad-output");
  });

  it("refuses absolute paths (defense — would escape chosenDir)", () => {
    const dir = mkDir();
    writeConfig(dir, `output_folder: "/etc/bmad"\n`);
    expect(readBmadOutputFolder(dir)).toBe("_bmad-output");
  });

  it("refuses paths containing parent traversal", () => {
    const dir = mkDir();
    writeConfig(dir, `output_folder: "{project-root}/../escape"\n`);
    expect(readBmadOutputFolder(dir)).toBe("_bmad-output");
  });

  it("returns the fallback when the value resolves to empty", () => {
    const dir = mkDir();
    writeConfig(dir, `output_folder: "{project-root}/"\n`);
    expect(readBmadOutputFolder(dir)).toBe("_bmad-output");
  });

  it("ignores commented-out output_folder lines", () => {
    const dir = mkDir();
    writeConfig(
      dir,
      `# output_folder: "{project-root}/legacy"\noutput_folder: "{project-root}/new"\n`,
    );
    expect(readBmadOutputFolder(dir)).toBe("new");
  });
});
