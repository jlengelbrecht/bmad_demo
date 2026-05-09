import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../subprocess/run-streaming", () => ({
  runStreaming: vi.fn(),
  SIGKILL_GRACE_MS: 5_000,
}));

import { runStreaming } from "../subprocess/run-streaming";
import codex from "./codex";
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

describe("codex.detectInstalled", () => {
  it("returns true on exit-0 + version banner at-or-above minVersion", async () => {
    runStreamingMock.mockReturnValue(
      fakeStream([
        { kind: "stdout-line", text: "codex 0.55.0" },
        { kind: "exit", code: 0, signal: null },
      ]),
    );
    expect(await codex.detectInstalled()).toBe(true);
  });

  it("returns false on non-zero exit", async () => {
    runStreamingMock.mockReturnValue(
      fakeStream([
        { kind: "stdout-line", text: "codex 0.55.0" },
        { kind: "exit", code: 1, signal: null },
      ]),
    );
    expect(await codex.detectInstalled()).toBe(false);
  });

  it("returns false on ENOENT", async () => {
    const enoent: NodeJS.ErrnoException = Object.assign(new Error("spawn codex ENOENT"), {
      code: "ENOENT",
    });
    runStreamingMock.mockReturnValue(fakeStream([{ throw: enoent }]));
    expect(await codex.detectInstalled()).toBe(false);
  });

  it("returns false on banner-absent stdout", async () => {
    runStreamingMock.mockReturnValue(
      fakeStream([
        { kind: "stdout-line", text: "no version here" },
        { kind: "exit", code: 0, signal: null },
      ]),
    );
    expect(await codex.detectInstalled()).toBe(false);
  });

  it("returns false and warns when version is below manifest.minVersion", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    runStreamingMock.mockReturnValue(
      fakeStream([
        { kind: "stdout-line", text: "codex 0.10.0" },
        { kind: "exit", code: 0, signal: null },
      ]),
    );
    expect(await codex.detectInstalled()).toBe(false);
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("below manifest.minVersion"),
    );
    warnSpy.mockRestore();
  });
});

describe("codex.detectAuthenticated", () => {
  it("returns true when an agent_message event is observed", async () => {
    runStreamingMock.mockReturnValue(
      fakeStream([
        {
          kind: "stdout-line",
          text: JSON.stringify({ type: "agent_message" }),
        },
        { kind: "exit", code: 0, signal: null },
      ]),
    );
    expect(await codex.detectAuthenticated()).toBe(true);
  });

  it("returns false when no agent_message is observed", async () => {
    runStreamingMock.mockReturnValue(
      fakeStream([
        { kind: "stdout-line", text: JSON.stringify({ type: "task_started" }) },
        { kind: "exit", code: 0, signal: null },
      ]),
    );
    expect(await codex.detectAuthenticated()).toBe(false);
  });
});

describe("codex.buildSpawnArgs", () => {
  const baseOpts: ChatSpawnOpts = {
    chosenDir: "/tmp/chosen",
    sessionId: "",
    primerPath: "/tmp/primer.md",
    userMessage: "hi",
    phase: "brief",
  };

  it("produces the documented Q-Tech-2 invocation surface (first turn)", () => {
    const out = codex.buildSpawnArgs(baseOpts);
    expect(out.cmd).toBe("codex");
    expect(out.args).toEqual([
      "exec",
      "--json",
      "-C",
      "/tmp/chosen",
      "--add-dir",
      "/tmp/chosen",
      "--sandbox",
      "workspace-write",
    ]);
  });

  it("appends positional `resume <sessionId>` on subsequent turns", () => {
    const out = codex.buildSpawnArgs({ ...baseOpts, sessionId: "sess-9" });
    expect(out.args).toEqual([
      "exec",
      "--json",
      "-C",
      "/tmp/chosen",
      "--add-dir",
      "/tmp/chosen",
      "--sandbox",
      "workspace-write",
      "resume",
      "sess-9",
    ]);
  });

  it("env spreads process.env without synthesizing new keys", () => {
    const out = codex.buildSpawnArgs(baseOpts);
    expect(out.env).toBeDefined();
    for (const k of Object.keys(process.env)) {
      expect(out.env).toHaveProperty(k);
    }
  });
});

describe("codex.parseStreamChunk", () => {
  it("session-init from task_started", () => {
    expect(
      codex.parseStreamChunk(
        JSON.stringify({ type: "task_started", session_id: "sess-9" }),
      ),
    ).toEqual<ChatStreamEvent[]>([{ kind: "session-init", sessionId: "sess-9" }]);
  });

  it("session-init falls back to id when session_id absent", () => {
    expect(
      codex.parseStreamChunk(
        JSON.stringify({ type: "task_started", id: "sess-X" }),
      ),
    ).toEqual<ChatStreamEvent[]>([{ kind: "session-init", sessionId: "sess-X" }]);
  });

  it("message-delta from agent_message_delta", () => {
    expect(
      codex.parseStreamChunk(
        JSON.stringify({ type: "agent_message_delta", delta: "ok" }),
      ),
    ).toEqual<ChatStreamEvent[]>([{ kind: "message-delta", text: "ok" }]);
  });

  it("agent_reasoning_delta is deliberately swallowed at v1", () => {
    expect(
      codex.parseStreamChunk(
        JSON.stringify({ type: "agent_reasoning_delta", delta: "thinking..." }),
      ),
    ).toEqual([]);
  });

  it("tool-call from tool_use / function_call", () => {
    expect(
      codex.parseStreamChunk(
        JSON.stringify({
          type: "tool_use",
          tool_name: "Read",
          input: { path: "/x" },
        }),
      ),
    ).toEqual<ChatStreamEvent[]>([
      { kind: "tool-call", description: '▶ Read {"path":"/x"}' },
    ]);
    expect(
      codex.parseStreamChunk(
        JSON.stringify({
          type: "function_call",
          tool_name: "Bash",
          input: { cmd: "ls" },
        }),
      ),
    ).toEqual<ChatStreamEvent[]>([
      { kind: "tool-call", description: '▶ Bash {"cmd":"ls"}' },
    ]);
  });

  it("message-end from task_complete or agent_message_end", () => {
    expect(
      codex.parseStreamChunk(JSON.stringify({ type: "task_complete" })),
    ).toEqual<ChatStreamEvent[]>([{ kind: "message-end" }]);
    expect(
      codex.parseStreamChunk(JSON.stringify({ type: "agent_message_end" })),
    ).toEqual<ChatStreamEvent[]>([{ kind: "message-end" }]);
  });

  it("returns [] on unrecognized event types", () => {
    expect(codex.parseStreamChunk(JSON.stringify({ type: "spinner" }))).toEqual([]);
  });

  it("returns one error event on malformed JSON without throwing", () => {
    const out = codex.parseStreamChunk("totally not json");
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ kind: "error" });
    expect((out[0] as { kind: "error"; message: string }).message).toContain(
      "malformed JSONL line",
    );
  });
});

describe("codex.formatUserMessage", () => {
  it("returns text + '\\n' verbatim (no JSON envelope)", () => {
    expect(codex.formatUserMessage("hi")).toBe("hi\n");
  });

  it("preserves embedded newlines and unicode without escaping", () => {
    const text = "line one\nline two — with em dash";
    expect(codex.formatUserMessage(text)).toBe(text + "\n");
  });
});

describe("codex.buildPrimer", () => {
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
      const out = codex.buildPrimer(phase);
      expect(out.length).toBeGreaterThan(50);
      expect(out).toMatch(/^# /);
      expect(out).toContain("BMAD");
    }
  });

  it("throws on missing primer file", () => {
    expect(() => codex.buildPrimer("missing-phase" as never)).toThrow(
      /Primer not found/,
    );
  });
});
