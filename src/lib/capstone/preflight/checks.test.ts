import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../subprocess/run-streaming", () => ({
  runStreaming: vi.fn(),
  SIGKILL_GRACE_MS: 5_000,
}));

import { runStreaming } from "../subprocess/run-streaming";
import { runPreflightChecks } from "./checks";

const runStreamingMock = vi.mocked(runStreaming);

type FakeEvent =
  | { kind: "stdout-line"; text: string }
  | { kind: "stderr-line"; text: string }
  | { kind: "exit"; code: number | null; signal: NodeJS.Signals | null }
  | { throw: NodeJS.ErrnoException };

function fakeStream(events: FakeEvent[], delayMs = 0): AsyncIterable<
  | { kind: "stdout-line"; text: string }
  | { kind: "stderr-line"; text: string }
  | { kind: "exit"; code: number | null; signal: NodeJS.Signals | null }
> {
  return {
    async *[Symbol.asyncIterator]() {
      if (delayMs) await new Promise((r) => setTimeout(r, delayMs));
      for (const ev of events) {
        if ("throw" in ev) throw ev.throw;
        yield ev;
      }
    },
  };
}

beforeEach(() => {
  runStreamingMock.mockReset();
});

afterEach(() => {
  vi.useRealTimers();
});

function nodeOk() {
  return fakeStream([
    { kind: "stdout-line", text: "v22.1.0" },
    { kind: "exit", code: 0, signal: null },
  ]);
}

function gitOk() {
  return fakeStream([
    { kind: "stdout-line", text: "git version 2.45.0 (Apple Git-x.y)" },
    { kind: "exit", code: 0, signal: null },
  ]);
}

function npxOk() {
  return fakeStream([
    { kind: "stdout-line", text: "10.8.2" },
    { kind: "exit", code: 0, signal: null },
  ]);
}

function returnsByCmd(map: Record<string, ReturnType<typeof fakeStream>>) {
  runStreamingMock.mockImplementation((opts) => {
    const fn = map[opts.cmd];
    if (!fn) throw new Error(`unexpected cmd in test: ${opts.cmd}`);
    return fn;
  });
}

describe("runPreflightChecks — happy path", () => {
  it("all three green when every probe yields exit-0 + version banner ≥ required", async () => {
    returnsByCmd({ node: nodeOk(), git: gitOk(), npx: npxOk() });
    const r = await runPreflightChecks();
    expect(r.allGreen).toBe(true);
    expect(r.checks.find((c) => c.name === "node")).toMatchObject({
      status: "green",
      actualVersion: "22.1.0",
      requiredVersion: ">=20.0.0",
    });
    expect(r.checks.find((c) => c.name === "git")).toMatchObject({
      status: "green",
      actualVersion: "2.45.0",
    });
    expect(r.checks.find((c) => c.name === "npx")).toMatchObject({
      status: "green",
      actualVersion: "10.8.2",
    });
  });
});

describe("runPreflightChecks — per-check red branches", () => {
  it("node ENOENT → node red with install hint; others remain green", async () => {
    const enoent: NodeJS.ErrnoException = Object.assign(new Error("spawn node ENOENT"), {
      code: "ENOENT",
    });
    returnsByCmd({
      node: fakeStream([{ throw: enoent }]),
      git: gitOk(),
      npx: npxOk(),
    });
    const r = await runPreflightChecks();
    expect(r.allGreen).toBe(false);
    const node = r.checks.find((c) => c.name === "node")!;
    expect(node.status).toBe("red");
    expect(node.hint).toContain("Node 20+ is required");
    expect(node.actualVersion).toBeUndefined();
  });

  it("node below min → red with actual-vs-required hint", async () => {
    returnsByCmd({
      node: fakeStream([
        { kind: "stdout-line", text: "v18.20.0" },
        { kind: "exit", code: 0, signal: null },
      ]),
      git: gitOk(),
      npx: npxOk(),
    });
    const r = await runPreflightChecks();
    const node = r.checks.find((c) => c.name === "node")!;
    expect(node.status).toBe("red");
    expect(node.actualVersion).toBe("18.20.0");
    expect(node.hint).toContain("18.20.0 found; required: >=20.0.0");
  });

  it("git non-zero exit → git red with exit-code hint", async () => {
    returnsByCmd({
      node: nodeOk(),
      git: fakeStream([
        { kind: "stdout-line", text: "git version 2.45.0" },
        { kind: "exit", code: 1, signal: null },
      ]),
      npx: npxOk(),
    });
    const r = await runPreflightChecks();
    const git = r.checks.find((c) => c.name === "git")!;
    expect(git.status).toBe("red");
    expect(git.hint).toMatch(/unexpected exit code/);
  });

  it("all three ENOENT → all three red", async () => {
    const enoent: NodeJS.ErrnoException = Object.assign(new Error("ENOENT"), {
      code: "ENOENT",
    });
    returnsByCmd({
      node: fakeStream([{ throw: enoent }]),
      git: fakeStream([{ throw: enoent }]),
      npx: fakeStream([{ throw: enoent }]),
    });
    const r = await runPreflightChecks();
    expect(r.allGreen).toBe(false);
    for (const c of r.checks) {
      expect(c.status).toBe("red");
      expect(c.hint).toBeDefined();
    }
  });
});

describe("runPreflightChecks — banner regex robustness", () => {
  it("tolerates leading whitespace and trailing text in the version banner", async () => {
    returnsByCmd({
      node: fakeStream([
        { kind: "stdout-line", text: "  v22.1.0  " },
        { kind: "exit", code: 0, signal: null },
      ]),
      git: fakeStream([
        {
          kind: "stdout-line",
          text: "git version 2.45.0 (Apple Git-x.y)",
        },
        { kind: "exit", code: 0, signal: null },
      ]),
      npx: fakeStream([
        { kind: "stdout-line", text: "10.8.2" },
        { kind: "exit", code: 0, signal: null },
      ]),
    });
    const r = await runPreflightChecks();
    expect(r.allGreen).toBe(true);
  });
});

describe("runPreflightChecks — parallelism", () => {
  it("runs the three probes in parallel (total elapsed < sum-of-delays)", async () => {
    const slow = (banner: string, ms: number) =>
      fakeStream(
        [
          { kind: "stdout-line", text: banner },
          { kind: "exit", code: 0, signal: null },
        ],
        ms,
      );
    returnsByCmd({
      node: slow("v22.1.0", 200),
      git: slow("git version 2.45.0", 200),
      npx: slow("10.8.2", 200),
    });
    const start = Date.now();
    const r = await runPreflightChecks();
    const elapsed = Date.now() - start;
    expect(r.allGreen).toBe(true);
    // 3 × 200 = 600ms serial; parallel should be ~200-300ms with slack.
    expect(elapsed).toBeLessThan(500);
  });
});
