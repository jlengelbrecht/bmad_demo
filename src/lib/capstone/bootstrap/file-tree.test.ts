import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import { formatSize, readBootstrappedTree } from "./file-tree";

const cleanups: string[] = [];
afterEach(() => {
  while (cleanups.length) {
    const d = cleanups.pop()!;
    rmSync(d, { recursive: true, force: true });
  }
});

function mkTmp(prefix = "ft-"): string {
  const d = mkdtempSync(path.join(tmpdir(), prefix));
  cleanups.push(d);
  return d;
}

describe("readBootstrappedTree", () => {
  it("walks files and directories", () => {
    const root = mkTmp();
    writeFileSync(path.join(root, "a.txt"), "hi");
    mkdirSync(path.join(root, "sub"));
    writeFileSync(path.join(root, "sub", "b.txt"), "x".repeat(2048));

    const tree = readBootstrappedTree(root);
    expect(tree.kind).toBe("dir");
    expect(tree.children).toBeDefined();
    const a = tree.children!.find((c) => c.name === "a.txt");
    expect(a?.kind).toBe("file");
    expect(a?.size).toBe(2);
    const sub = tree.children!.find((c) => c.name === "sub");
    expect(sub?.kind).toBe("dir");
    expect(sub?.children?.[0].name).toBe("b.txt");
  });

  it("excludes node_modules / dist / .log files", () => {
    const root = mkTmp();
    mkdirSync(path.join(root, "node_modules"));
    mkdirSync(path.join(root, "dist"));
    writeFileSync(path.join(root, "x.log"), "noise");
    writeFileSync(path.join(root, "keep.txt"), "yes");

    const tree = readBootstrappedTree(root);
    const names = (tree.children ?? []).map((c) => c.name);
    expect(names).toContain("keep.txt");
    expect(names).not.toContain("node_modules");
    expect(names).not.toContain("dist");
    expect(names).not.toContain("x.log");
  });

  it("respects maxDepth", () => {
    const root = mkTmp();
    mkdirSync(path.join(root, "lvl1"));
    mkdirSync(path.join(root, "lvl1", "lvl2"));
    mkdirSync(path.join(root, "lvl1", "lvl2", "lvl3"));

    const shallow = readBootstrappedTree(root, 1);
    expect(shallow.children).toHaveLength(1);
    expect(shallow.children![0].children).toBeUndefined();
  });
});

describe("formatSize", () => {
  it("renders bytes / KB / MB", () => {
    expect(formatSize(0)).toBe("0 B");
    expect(formatSize(512)).toBe("512 B");
    expect(formatSize(2048)).toBe("2.0 KB");
    expect(formatSize(2 * 1024 * 1024)).toBe("2.0 MB");
  });
});
