import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const HERE = import.meta.dirname;
const FILES = [
  "index.ts",
  "types.ts",
  "claude-code.ts",
  "codex.ts",
  "github-copilot.ts",
];

function readSource(name: string): string {
  return readFileSync(path.resolve(HERE, name), "utf8");
}

describe("adapter module surface — import discipline", () => {
  it.each(FILES)("%s does not import next/react/react-dom or app routes", (name) => {
    const src = readSource(name);
    expect(src).not.toMatch(/from ["']next\b/);
    expect(src).not.toMatch(/from ["']react["']/);
    expect(src).not.toMatch(/from ["']react-dom["']/);
    expect(src).not.toMatch(/from ["']@\/app\//);
  });
});

describe("adapter module surface — exported names", () => {
  it("index.ts exports exactly { getAdapterRegistry, getAdapterById }", async () => {
    const mod = await import("./index");
    expect(Object.keys(mod).sort()).toEqual(
      ["getAdapterById", "getAdapterRegistry"].sort(),
    );
  });

  it("types.ts has zero runtime exports (types-only file)", async () => {
    const mod = await import("./types");
    expect(Object.keys(mod)).toEqual([]);
  });

  it("each per-tool adapter exports a default ToolAdapter", async () => {
    const claude = await import("./claude-code");
    const codex = await import("./codex");
    const copilot = await import("./github-copilot");
    for (const mod of [claude, codex, copilot]) {
      expect(mod.default).toBeDefined();
      expect(mod.default.manifest).toBeDefined();
    }
  });
});
