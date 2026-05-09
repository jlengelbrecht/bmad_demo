import { describe, expect, it } from "vitest";

import { getAdapterById, getAdapterRegistry } from "./index";
import type { ToolId } from "./types";

describe("getAdapterRegistry", () => {
  it("returns a Map with exactly three entries keyed by ToolId", () => {
    const reg = getAdapterRegistry();
    expect(reg.size).toBe(3);
    expect([...reg.keys()].sort()).toEqual(
      ["claude-code", "codex", "github-copilot"].sort(),
    );
  });

  it("memoizes — repeated calls return the same Map instance", () => {
    expect(Object.is(getAdapterRegistry(), getAdapterRegistry())).toBe(true);
  });
});

describe("getAdapterById", () => {
  const cases: { id: ToolId; cliBinary: string }[] = [
    { id: "claude-code", cliBinary: "claude" },
    { id: "codex", cliBinary: "codex" },
    { id: "github-copilot", cliBinary: "copilot" },
  ];

  for (const { id, cliBinary } of cases) {
    it(`returns the ${id} adapter; manifest.cliBinary === '${cliBinary}'`, () => {
      const adapter = getAdapterById(id);
      expect(adapter.manifest.id).toBe(id);
      expect(adapter.manifest.cliBinary).toBe(cliBinary);
    });
  }

  it("throws on a fabricated invalid id with a clear message", () => {
    expect(() =>
      getAdapterById("bogus-tool" as unknown as ToolId),
    ).toThrow(/Unknown tool id: bogus-tool/);
  });
});

// Stories 5.3 / 5.4 / 5.5 promoted all three adapters from Story-5.2
// stubs to real implementations. The "stub adapters reject" describe
// block was deliberately deleted; see per-adapter unit specs in
// claude-code.test.ts, codex.test.ts, and github-copilot.test.ts.
