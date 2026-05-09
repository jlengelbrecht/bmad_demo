import { describe, expect, it } from "vitest";

import { getAdapterById, getAdapterRegistry } from "./index";
import type { ToolAdapter, ToolId } from "./types";

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

describe("stub adapters reject every imperative method", () => {
  function eachStub(
    cb: (adapter: ToolAdapter, expectedStoryRef: string) => void | Promise<void>,
  ) {
    const cases: { id: ToolId; story: string }[] = [
      { id: "claude-code", story: "Story 5.3" },
      { id: "codex", story: "Story 5.4" },
      { id: "github-copilot", story: "Story 5.5" },
    ];
    return Promise.all(
      cases.map(async ({ id, story }) => {
        const adapter = getAdapterById(id);
        await cb(adapter, story);
      }),
    );
  }

  it("detectInstalled throws stub-error", async () => {
    await eachStub(async (adapter, story) => {
      await expect(adapter.detectInstalled()).rejects.toThrow(
        new RegExp(`not yet implemented — see ${story.replace(".", "\\.")}`),
      );
    });
  });

  it("detectAuthenticated throws stub-error", async () => {
    await eachStub(async (adapter, story) => {
      await expect(adapter.detectAuthenticated()).rejects.toThrow(
        new RegExp(`not yet implemented — see ${story.replace(".", "\\.")}`),
      );
    });
  });

  it("buildSpawnArgs throws stub-error", async () => {
    await eachStub((adapter, story) => {
      expect(() =>
        adapter.buildSpawnArgs({
          chosenDir: "/tmp/x",
          sessionId: "",
          primerPath: "/tmp/p",
          userMessage: "hi",
          phase: "brief",
        }),
      ).toThrow(
        new RegExp(`not yet implemented — see ${story.replace(".", "\\.")}`),
      );
    });
  });

  it("parseStreamChunk / formatUserMessage / buildPrimer all throw stub-error", async () => {
    await eachStub((adapter, story) => {
      const re = new RegExp(
        `not yet implemented — see ${story.replace(".", "\\.")}`,
      );
      expect(() => adapter.parseStreamChunk("anything")).toThrow(re);
      expect(() => adapter.formatUserMessage("anything")).toThrow(re);
      expect(() => adapter.buildPrimer("brief")).toThrow(re);
    });
  });
});
