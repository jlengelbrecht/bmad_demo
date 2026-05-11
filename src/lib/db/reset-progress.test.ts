import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { createDb } from "./connection";
import {
  InvalidProgressPathError,
  resetProgressAt,
  resolveProgressTarget,
} from "./reset-progress";

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

  it("surfaces EISDIR when the target is a directory (not a file)", () => {
    // Defensive: someone created `data/progress.sqlite` as a directory.
    // unlinkSync on a directory throws EISDIR (Linux) / EPERM (Windows).
    mkdirSync(target);
    expect(() => resetProgressAt(target)).toThrow();
  });

  it("round-trip: reset → new connection re-applies the Story 3.1 schema", () => {
    // AC6: after `npm run reset-progress` the next connection module
    // re-creates progress.sqlite with the inline schema. This pins the
    // chain at the unit-test layer rather than relying on transitive
    // coverage from the e2e suite.
    const db1 = createDb(target);
    const beforeTables = db1
      .prepare(
        `SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'`,
      )
      .all();
    expect(beforeTables.map((t: unknown) => (t as { name: string }).name)).toEqual([
      "progress",
    ]);
    db1.close();

    const result = resetProgressAt(target);
    expect(result.deleted).toBe(true);
    expect(existsSync(target)).toBe(false);

    const db2 = createDb(target);
    const afterTables = db2
      .prepare(
        `SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'`,
      )
      .all();
    expect(afterTables.map((t: unknown) => (t as { name: string }).name)).toEqual([
      "progress",
    ]);

    // And the table is empty — previously-completed lessons read as
    // not-completed (AC6 explicit).
    const rowCount = db2.prepare(`SELECT COUNT(*) AS n FROM progress`).get() as {
      n: number;
    };
    expect(rowCount.n).toBe(0);
    db2.close();
  });
});

describe("resolveProgressTarget", () => {
  const DEFAULT = "/repo/data/progress.sqlite";

  it("returns the default path when envPath is undefined", () => {
    expect(resolveProgressTarget({ envPath: undefined, defaultPath: DEFAULT })).toBe(
      DEFAULT,
    );
  });

  it("returns the default path when envPath is empty or whitespace", () => {
    expect(resolveProgressTarget({ envPath: "", defaultPath: DEFAULT })).toBe(DEFAULT);
    expect(resolveProgressTarget({ envPath: "   ", defaultPath: DEFAULT })).toBe(DEFAULT);
  });

  it("resolves a relative env path against process.cwd()", () => {
    const resolved = resolveProgressTarget({
      envPath: "./data/e2e-progress.sqlite",
      defaultPath: DEFAULT,
    });
    expect(path.isAbsolute(resolved)).toBe(true);
    expect(resolved.endsWith(path.join("data", "e2e-progress.sqlite"))).toBe(true);
  });

  it("accepts an absolute .sqlite env path verbatim", () => {
    const abs = "/tmp/test-progress.sqlite";
    expect(resolveProgressTarget({ envPath: abs, defaultPath: DEFAULT })).toBe(abs);
  });

  it("rejects an env path that does not end with .sqlite", () => {
    expect(() =>
      resolveProgressTarget({
        envPath: "/etc/passwd",
        defaultPath: DEFAULT,
      }),
    ).toThrow(InvalidProgressPathError);
  });

  it("rejects an env path with a different extension (e.g., .db)", () => {
    expect(() =>
      resolveProgressTarget({
        envPath: "/tmp/progress.db",
        defaultPath: DEFAULT,
      }),
    ).toThrow(/\.sqlite/);
  });
});

describe("reset-progress CLI source-string contract (AC4 + AC5)", () => {
  const SCRIPT_PATH = path.resolve(
    import.meta.dirname,
    "..",
    "..",
    "..",
    "scripts",
    "reset-progress.ts",
  );
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
