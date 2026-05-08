import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { resetProgressAt } from "./reset-progress";

describe("resetProgressAt", () => {
  let tmp: string;
  let target: string;

  beforeEach(() => {
    tmp = mkdtempSync(path.join(tmpdir(), "reset-progress-"));
    target = path.join(tmp, "progress.sqlite");
  });

  afterEach(() => {
    rmSync(tmp, { recursive: true, force: true });
  });

  it("deletes the main file and reports the path", () => {
    writeFileSync(target, "fake sqlite bytes");
    const result = resetProgressAt(target);

    expect(result.deleted).toBe(true);
    expect(result.path).toBe(target);
    expect(existsSync(target)).toBe(false);
    expect(result.sidecarsDeleted).toEqual([]);
  });

  it("returns deleted=false when the main file is missing (no error)", () => {
    const result = resetProgressAt(target);

    expect(result.deleted).toBe(false);
    expect(result.path).toBe(target);
    expect(result.sidecarsDeleted).toEqual([]);
  });

  it("deletes -journal, -wal, and -shm sidecars when present", () => {
    writeFileSync(target, "main");
    writeFileSync(`${target}-journal`, "j");
    writeFileSync(`${target}-wal`, "w");
    writeFileSync(`${target}-shm`, "s");

    const result = resetProgressAt(target);

    expect(result.deleted).toBe(true);
    expect(existsSync(target)).toBe(false);
    expect(existsSync(`${target}-journal`)).toBe(false);
    expect(existsSync(`${target}-wal`)).toBe(false);
    expect(existsSync(`${target}-shm`)).toBe(false);
    expect(result.sidecarsDeleted).toEqual([
      `${target}-journal`,
      `${target}-wal`,
      `${target}-shm`,
    ]);
  });

  it("cleans up stale sidecars even when the main file is missing", () => {
    // Crash recovery scenario: WAL exists but main was deleted by some
    // other tool. Reset still nukes the WAL so the next connection starts
    // clean.
    writeFileSync(`${target}-wal`, "w");

    const result = resetProgressAt(target);

    expect(result.deleted).toBe(false);
    expect(result.sidecarsDeleted).toEqual([`${target}-wal`]);
    expect(existsSync(`${target}-wal`)).toBe(false);
  });
});

describe("reset-progress CLI source-string contract (AC4 + AC5)", () => {
  const SCRIPT_PATH = path.resolve(import.meta.dirname, "..", "..", "..", "scripts", "reset-progress.ts");
  const source = readFileSync(SCRIPT_PATH, "utf8");

  it("does NOT reference `_bmad-output` (capstone artifacts are off-limits)", () => {
    expect(source).not.toContain("_bmad-output");
  });

  it("does NOT parse `process.argv` (no caller-widened deletion target)", () => {
    expect(source).not.toContain("process.argv");
  });

  it("imports only Node built-ins and project-internal modules", () => {
    const importLines = source.split("\n").filter((line) => line.trim().startsWith("import "));
    for (const line of importLines) {
      const isAllowed =
        line.includes('"node:') ||
        line.includes('from "../src/') ||
        line.includes('from "@/');
      expect(isAllowed, `unexpected import: ${line}`).toBe(true);
    }
  });

  it("does NOT import the Next.js runtime", () => {
    expect(source).not.toContain("next/server");
    expect(source).not.toContain('from "next"');
    expect(source).not.toContain("better-sqlite3");
  });
});
