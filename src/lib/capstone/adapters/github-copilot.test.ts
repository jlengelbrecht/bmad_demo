import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../subprocess/run-streaming", () => ({
  runStreaming: vi.fn(),
  SIGKILL_GRACE_MS: 5_000,
}));

import { runStreaming } from "../subprocess/run-streaming";
import copilot from "./github-copilot";
import type { ChatSpawnOpts, ChatStreamEvent } from "./types";

const runStreamingMock = vi.mocked(runStreaming);

type FakeEvent =
  | { kind: "stdout-line"; text: string }
  | { kind: "stderr-line"; text: string }
  | { kind: "exit"; code: number | null; signal: NodeJS.Signals | null }
  | { throw: NodeJS.ErrnoException };

function fakeStream(events: FakeEvent[]): AsyncIterable<
  | { kind: "stdout-line"; text: string }
  | { kind: "stderr-line"; text: string }
  | { kind: "exit"; code: number | null; signal: NodeJS.Signals | null }
> {
  return {
    async *[Symbol.asyncIterator]() {
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

describe("github-copilot.detectInstalled", () => {
  it("returns true on exit-0 + version banner at-or-above minVersion", async () => {
    runStreamingMock.mockReturnValue(
      fakeStream([
        { kind: "stdout-line", text: "copilot 1.5.0" },
        { kind: "exit", code: 0, signal: null },
      ]),
    );
    expect(await copilot.detectInstalled()).toBe(true);
  });

  it("returns false on ENOENT / exit-1 / banner-absent", async () => {
    const enoent: NodeJS.ErrnoException = Object.assign(new Error("spawn copilot ENOENT"), {
      code: "ENOENT",
    });
    runStreamingMock.mockReturnValueOnce(fakeStream([{ throw: enoent }]));
    expect(await copilot.detectInstalled()).toBe(false);

    runStreamingMock.mockReturnValueOnce(
      fakeStream([
        { kind: "stdout-line", text: "copilot 1.5.0" },
        { kind: "exit", code: 1, signal: null },
      ]),
    );
    expect(await copilot.detectInstalled()).toBe(false);

    runStreamingMock.mockReturnValueOnce(
      fakeStream([
        { kind: "stdout-line", text: "no version" },
        { kind: "exit", code: 0, signal: null },
      ]),
    );
    expect(await copilot.detectInstalled()).toBe(false);
  });

  it("returns false and warns when version is below manifest.minVersion", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    runStreamingMock.mockReturnValue(
      fakeStream([
        { kind: "stdout-line", text: "copilot 1.0.10" },
        { kind: "exit", code: 0, signal: null },
      ]),
    );
    expect(await copilot.detectInstalled()).toBe(false);
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("below manifest.minVersion"),
    );
    warnSpy.mockRestore();
  });
});

describe("github-copilot.detectAuthenticated", () => {
  it("returns true when both probes succeed and billing JSON contains a copilot key", async () => {
    // Probe 1: gh auth status
    runStreamingMock.mockReturnValueOnce(
      fakeStream([
        { kind: "stdout-line", text: "Logged in to github.com as devbox" },
        { kind: "exit", code: 0, signal: null },
      ]),
    );
    // Probe 2: gh api user/copilot_billing
    runStreamingMock.mockReturnValueOnce(
      fakeStream([
        {
          kind: "stdout-line",
          text: JSON.stringify({ copilot_billing: { plan: "pro" } }),
        },
        { kind: "exit", code: 0, signal: null },
      ]),
    );
    expect(await copilot.detectAuthenticated()).toBe(true);
  });

  it("returns false when gh auth status is not authed (probe 2 not invoked)", async () => {
    runStreamingMock.mockReturnValueOnce(
      fakeStream([
        { kind: "stdout-line", text: "You are not logged in" },
        { kind: "exit", code: 1, signal: null },
      ]),
    );
    expect(await copilot.detectAuthenticated()).toBe(false);
    expect(runStreamingMock).toHaveBeenCalledTimes(1);
  });

  it("returns false when copilot_billing returns non-200", async () => {
    runStreamingMock.mockReturnValueOnce(
      fakeStream([
        { kind: "stdout-line", text: "Logged in to github.com as devbox" },
        { kind: "exit", code: 0, signal: null },
      ]),
    );
    runStreamingMock.mockReturnValueOnce(
      fakeStream([
        { kind: "stderr-line", text: "HTTP 404" },
        { kind: "exit", code: 1, signal: null },
      ]),
    );
    expect(await copilot.detectAuthenticated()).toBe(false);
  });

  it("returns false when billing JSON is unparseable", async () => {
    runStreamingMock.mockReturnValueOnce(
      fakeStream([
        { kind: "stdout-line", text: "Logged in to github.com as devbox" },
        { kind: "exit", code: 0, signal: null },
      ]),
    );
    runStreamingMock.mockReturnValueOnce(
      fakeStream([
        { kind: "stdout-line", text: "not json {" },
        { kind: "exit", code: 0, signal: null },
      ]),
    );
    expect(await copilot.detectAuthenticated()).toBe(false);
  });

  it("returns false when billing JSON parses but has no copilot-related key", async () => {
    runStreamingMock.mockReturnValueOnce(
      fakeStream([
        { kind: "stdout-line", text: "Logged in to github.com as devbox" },
        { kind: "exit", code: 0, signal: null },
      ]),
    );
    runStreamingMock.mockReturnValueOnce(
      fakeStream([
        {
          kind: "stdout-line",
          text: JSON.stringify({ login: "x", id: 1, name: "x" }),
        },
        { kind: "exit", code: 0, signal: null },
      ]),
    );
    expect(await copilot.detectAuthenticated()).toBe(false);
  });
});

describe("github-copilot.buildSpawnArgs", () => {
  const baseOpts: ChatSpawnOpts = {
    chosenDir: "/tmp/chosen",
    sessionId: "",
    primerPath: "/tmp/primer.md",
    userMessage: "say hi",
    phase: "brief",
  };

  it("produces argv with --prompt <msg> and -C chosenDir on first turn", () => {
    const out = copilot.buildSpawnArgs(baseOpts);
    expect(out.cmd).toBe("copilot");
    expect(out.args).toEqual([
      "--prompt",
      "say hi",
      "-C",
      "/tmp/chosen",
    ]);
  });

  it("appends --resume <id> on resume turns", () => {
    const out = copilot.buildSpawnArgs({ ...baseOpts, sessionId: "sess-3" });
    expect(out.args).toEqual([
      "--prompt",
      "say hi",
      "-C",
      "/tmp/chosen",
      "--resume",
      "sess-3",
    ]);
  });

  it("env spreads process.env without synthesizing new keys", () => {
    const out = copilot.buildSpawnArgs(baseOpts);
    expect(out.env).toBeDefined();
    for (const k of Object.keys(process.env)) {
      expect(out.env).toHaveProperty(k);
    }
  });
});

describe("github-copilot.parseStreamChunk", () => {
  it("plain line → single message-delta with text + '\\n'", () => {
    expect(copilot.parseStreamChunk("hello world")).toEqual<ChatStreamEvent[]>([
      { kind: "message-delta", text: "hello world\n" },
    ]);
  });

  it("tool-call-prefixed line → single tool-call event", () => {
    expect(copilot.parseStreamChunk("▶ reading brief.md")).toEqual<
      ChatStreamEvent[]
    >([{ kind: "tool-call", description: "▶ reading brief.md" }]);
    expect(copilot.parseStreamChunk("[tool] runner")).toEqual<
      ChatStreamEvent[]
    >([{ kind: "tool-call", description: "[tool] runner" }]);
  });

  it("session-marker line → BOTH session-init and message-delta", () => {
    expect(
      copilot.parseStreamChunk("Session: my-capstone-12345"),
    ).toEqual<ChatStreamEvent[]>([
      { kind: "session-init", sessionId: "my-capstone-12345" },
      { kind: "message-delta", text: "Session: my-capstone-12345\n" },
    ]);
  });

  it("empty line → []", () => {
    expect(copilot.parseStreamChunk("")).toEqual([]);
  });
});

describe("github-copilot.formatUserMessage", () => {
  it("returns '' regardless of input — message is in argv (--prompt)", () => {
    expect(copilot.formatUserMessage("anything")).toBe("");
    expect(copilot.formatUserMessage("with newlines\nand quotes \"x\"")).toBe("");
  });
});

describe("github-copilot.buildPrimer", () => {
  it("returns the placeholder primer for each phase", () => {
    const phases = [
      "brief",
      "prd",
      "architecture",
      "epics-and-stories",
      "adr",
      "dev-story-1.1",
    ] as const;
    for (const phase of phases) {
      const out = copilot.buildPrimer(phase);
      expect(out.length).toBeGreaterThan(50);
      expect(out).toMatch(/^# /);
    }
  });

  it("throws on missing primer", () => {
    expect(() => copilot.buildPrimer("missing-phase" as never)).toThrow(
      /Primer not found/,
    );
  });
});
