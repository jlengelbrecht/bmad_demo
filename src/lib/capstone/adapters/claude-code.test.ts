import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock the subprocess primitive so unit tests don't need a real `claude`
// binary. Each case sets up a canned async-iterable for `runStreaming`.
vi.mock("../subprocess/run-streaming", () => ({
  runStreaming: vi.fn(),
  SIGKILL_GRACE_MS: 5_000,
}));

import { runStreaming } from "../subprocess/run-streaming";
import claudeCode from "./claude-code";
import type { ChatSpawnOpts, ChatStreamEvent } from "./types";

const runStreamingMock = vi.mocked(runStreaming);

function fakeStream(events: Array<
  | { kind: "stdout-line"; text: string }
  | { kind: "stderr-line"; text: string }
  | { kind: "exit"; code: number | null; signal: NodeJS.Signals | null }
  | { throw: NodeJS.ErrnoException }
>): AsyncIterable<
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

describe("claude-code.detectInstalled", () => {
  it("returns true on exit-0 with a recognized version banner at-or-above minVersion", async () => {
    runStreamingMock.mockReturnValue(
      fakeStream([
        { kind: "stdout-line", text: "claude 2.5.1" },
        { kind: "exit", code: 0, signal: null },
      ]),
    );
    expect(await claudeCode.detectInstalled()).toBe(true);
  });

  it("returns false on non-zero exit", async () => {
    runStreamingMock.mockReturnValue(
      fakeStream([
        { kind: "stdout-line", text: "claude 2.5.1" },
        { kind: "exit", code: 1, signal: null },
      ]),
    );
    expect(await claudeCode.detectInstalled()).toBe(false);
  });

  it("returns false on ENOENT (binary not on PATH)", async () => {
    const enoent: NodeJS.ErrnoException = Object.assign(new Error("spawn claude ENOENT"), {
      code: "ENOENT",
    });
    runStreamingMock.mockReturnValue(
      fakeStream([{ throw: enoent }]),
    );
    expect(await claudeCode.detectInstalled()).toBe(false);
  });

  it("returns false on banner-absent stdout", async () => {
    runStreamingMock.mockReturnValue(
      fakeStream([
        { kind: "stdout-line", text: "some unrelated output" },
        { kind: "exit", code: 0, signal: null },
      ]),
    );
    expect(await claudeCode.detectInstalled()).toBe(false);
  });

  it("returns false and warns when version is below manifest.minVersion (TM-6)", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    runStreamingMock.mockReturnValue(
      fakeStream([
        { kind: "stdout-line", text: "claude 1.5.0" },
        { kind: "exit", code: 0, signal: null },
      ]),
    );
    expect(await claudeCode.detectInstalled()).toBe(false);
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("below manifest.minVersion"),
    );
    warnSpy.mockRestore();
  });
});

describe("claude-code.detectAuthenticated", () => {
  it("returns true when both system/init and assistant/message_start are observed", async () => {
    runStreamingMock.mockReturnValue(
      fakeStream([
        {
          kind: "stdout-line",
          text: JSON.stringify({ type: "system/init", session_id: "abc" }),
        },
        {
          kind: "stdout-line",
          text: JSON.stringify({ type: "assistant/message_start" }),
        },
        { kind: "exit", code: 0, signal: null },
      ]),
    );
    expect(await claudeCode.detectAuthenticated()).toBe(true);
  });

  it("returns false when system/init is missing", async () => {
    runStreamingMock.mockReturnValue(
      fakeStream([
        {
          kind: "stdout-line",
          text: JSON.stringify({ type: "assistant/message_start" }),
        },
        { kind: "exit", code: 0, signal: null },
      ]),
    );
    expect(await claudeCode.detectAuthenticated()).toBe(false);
  });

  it("returns false when assistant/message_start is missing", async () => {
    runStreamingMock.mockReturnValue(
      fakeStream([
        {
          kind: "stdout-line",
          text: JSON.stringify({ type: "system/init", session_id: "abc" }),
        },
        { kind: "exit", code: 1, signal: null },
      ]),
    );
    expect(await claudeCode.detectAuthenticated()).toBe(false);
  });
});

describe("claude-code.buildSpawnArgs", () => {
  const baseOpts: ChatSpawnOpts = {
    chosenDir: "/tmp/chosen",
    sessionId: "",
    primerPath: "/tmp/primer.md",
    userMessage: "ignored here — written to stdin separately",
    phase: "brief",
  };

  it("produces argv with the documented Q-Tech-1 invocation surface", () => {
    const out = claudeCode.buildSpawnArgs(baseOpts);
    expect(out.cmd).toBe("claude");
    expect(out.args).toEqual([
      "--print",
      "--input-format",
      "stream-json",
      "--output-format",
      "stream-json",
      "--include-partial-messages",
      "--system-prompt-file",
      "/tmp/primer.md",
      "--add-dir",
      "/tmp/chosen",
      "--bare",
    ]);
  });

  it("omits --resume on first turn (sessionId === '')", () => {
    const out = claudeCode.buildSpawnArgs({ ...baseOpts, sessionId: "" });
    expect(out.args).not.toContain("--resume");
  });

  it("includes --resume <id> on subsequent turns", () => {
    const out = claudeCode.buildSpawnArgs({ ...baseOpts, sessionId: "abc-123" });
    expect(out.args).toContain("--resume");
    const idx = out.args.indexOf("--resume");
    expect(out.args[idx + 1]).toBe("abc-123");
  });

  it("env spreads process.env without synthesizing new keys", () => {
    const out = claudeCode.buildSpawnArgs(baseOpts);
    expect(out.env).toBeDefined();
    for (const k of Object.keys(process.env)) {
      expect(out.env).toHaveProperty(k);
    }
  });
});

describe("claude-code.parseStreamChunk", () => {
  it("session-init from system/init", () => {
    expect(
      claudeCode.parseStreamChunk(
        JSON.stringify({ type: "system/init", session_id: "abc" }),
      ),
    ).toEqual<ChatStreamEvent[]>([{ kind: "session-init", sessionId: "abc" }]);
  });

  it("message-delta from assistant/content_block_delta", () => {
    expect(
      claudeCode.parseStreamChunk(
        JSON.stringify({
          type: "assistant/content_block_delta",
          delta: { text: "hello" },
        }),
      ),
    ).toEqual<ChatStreamEvent[]>([{ kind: "message-delta", text: "hello" }]);
  });

  it("tool-call from assistant/tool_use_start", () => {
    expect(
      claudeCode.parseStreamChunk(
        JSON.stringify({
          type: "assistant/tool_use_start",
          tool_name: "Read",
          input: { path: "/abs/path/brief.md" },
        }),
      ),
    ).toEqual<ChatStreamEvent[]>([
      { kind: "tool-call", description: '▶ Read {"path":"/abs/path/brief.md"}' },
    ]);
  });

  it("message-end from assistant/message_stop", () => {
    expect(
      claudeCode.parseStreamChunk(
        JSON.stringify({ type: "assistant/message_stop" }),
      ),
    ).toEqual<ChatStreamEvent[]>([{ kind: "message-end" }]);
  });

  it("returns [] for unrecognized event types", () => {
    expect(
      claudeCode.parseStreamChunk(JSON.stringify({ type: "spinner/tick" })),
    ).toEqual([]);
  });

  it("returns a single error event on malformed JSON without throwing", () => {
    const out = claudeCode.parseStreamChunk("not json {");
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ kind: "error" });
    expect((out[0] as { kind: "error"; message: string }).message).toContain(
      "malformed stream-json line",
    );
  });
});

describe("claude-code.formatUserMessage", () => {
  it("JSON-encodes the message into the documented input shape and ends with a newline", () => {
    const out = claudeCode.formatUserMessage("hi");
    expect(out.endsWith("\n")).toBe(true);
    const parsed = JSON.parse(out.trimEnd());
    expect(parsed).toEqual({
      type: "user",
      message: {
        role: "user",
        content: [{ type: "text", text: "hi" }],
      },
    });
  });

  it("escapes embedded quotes, newlines, and backslashes", () => {
    const tricky = 'He said "hi"\nwith \\ backslash';
    const out = claudeCode.formatUserMessage(tricky);
    const parsed = JSON.parse(out.trimEnd()) as {
      message: { content: { text: string }[] };
    };
    expect(parsed.message.content[0].text).toBe(tricky);
  });
});

describe("claude-code.buildPrimer", () => {
  it("returns the contents of the matching primer file for each phase", async () => {
    const phases = [
      "brief",
      "prd",
      "architecture",
      "epics-and-stories",
      "adr",
      "dev-story-1.1",
    ] as const;
    for (const phase of phases) {
      const out = claudeCode.buildPrimer(phase);
      // Each placeholder primer is a real markdown file; check it parsed
      // and is non-trivial, and mentions the BMAD method context.
      expect(out.length).toBeGreaterThan(50);
      expect(out).toMatch(/^# /);
      expect(out).toContain("BMAD");
    }
  });

  it("throws when called with a phase whose primer file is missing", () => {
    expect(() =>
      claudeCode.buildPrimer("brief-nonexistent" as never),
    ).toThrow(/Primer not found/);
  });
});
