import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../subprocess/run-streaming", () => ({
  runStreaming: vi.fn(),
  SIGKILL_GRACE_MS: 5_000,
}));

import { runStreaming } from "../subprocess/run-streaming";
import codex from "./codex";


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
  it("returns true when `codex login status` exits 0 with a 'Logged in' line (ChatGPT subscription)", async () => {
    runStreamingMock.mockReturnValue(
      fakeStream([
        { kind: "stdout-line", text: "Logged in using ChatGPT" },
        { kind: "exit", code: 0, signal: null },
      ]),
    );
    expect(await codex.detectAuthenticated()).toBe(true);
  });

  it("returns true for the API-key auth path (different stdout phrasing, same shape)", async () => {
    runStreamingMock.mockReturnValue(
      fakeStream([
        { kind: "stdout-line", text: "Logged in with API key" },
        { kind: "exit", code: 0, signal: null },
      ]),
    );
    expect(await codex.detectAuthenticated()).toBe(true);
  });

  it("returns false when exit is non-zero (probe didn't run)", async () => {
    runStreamingMock.mockReturnValue(
      fakeStream([
        { kind: "stderr-line", text: "codex: command not found" },
        { kind: "exit", code: 127, signal: null },
      ]),
    );
    expect(await codex.detectAuthenticated()).toBe(false);
  });

  it("returns false when exit is 0 but no 'Logged in' line is observed", async () => {
    runStreamingMock.mockReturnValue(
      fakeStream([
        { kind: "stdout-line", text: "Not logged in. Run 'codex login'." },
        { kind: "exit", code: 0, signal: null },
      ]),
    );
    expect(await codex.detectAuthenticated()).toBe(false);
  });
});
