import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock the subprocess primitive so unit tests don't need a real `claude`
// binary. Each case sets up a canned async-iterable for `runStreaming`.
vi.mock("../subprocess/run-streaming", () => ({
  runStreaming: vi.fn(),
  SIGKILL_GRACE_MS: 5_000,
}));

import { runStreaming } from "../subprocess/run-streaming";
import claudeCode from "./claude-code";


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
  it("returns true when 'claude auth status' reports loggedIn:true (subscription path)", async () => {
    runStreamingMock.mockReturnValue(
      fakeStream([
        {
          kind: "stdout-line",
          text: JSON.stringify({
            loggedIn: true,
            authMethod: "claude.ai",
            subscriptionType: "max",
          }),
        },
        { kind: "exit", code: 0, signal: null },
      ]),
    );
    expect(await claudeCode.detectAuthenticated()).toBe(true);
  });

  it("returns true when 'claude auth status' reports loggedIn:true (API-key path)", async () => {
    runStreamingMock.mockReturnValue(
      fakeStream([
        {
          kind: "stdout-line",
          text: JSON.stringify({ loggedIn: true, authMethod: "apiKey" }),
        },
        { kind: "exit", code: 0, signal: null },
      ]),
    );
    expect(await claudeCode.detectAuthenticated()).toBe(true);
  });

  it("returns false when 'claude auth status' reports loggedIn:false", async () => {
    runStreamingMock.mockReturnValue(
      fakeStream([
        { kind: "stdout-line", text: JSON.stringify({ loggedIn: false }) },
        { kind: "exit", code: 0, signal: null },
      ]),
    );
    expect(await claudeCode.detectAuthenticated()).toBe(false);
  });

  it("returns false when exit code is non-zero", async () => {
    runStreamingMock.mockReturnValue(
      fakeStream([
        { kind: "stdout-line", text: "error: not signed in" },
        { kind: "exit", code: 1, signal: null },
      ]),
    );
    expect(await claudeCode.detectAuthenticated()).toBe(false);
  });

  it("returns false when stdout is not valid JSON", async () => {
    runStreamingMock.mockReturnValue(
      fakeStream([
        { kind: "stdout-line", text: "Logged in: yes" },
        { kind: "exit", code: 0, signal: null },
      ]),
    );
    expect(await claudeCode.detectAuthenticated()).toBe(false);
  });
});
