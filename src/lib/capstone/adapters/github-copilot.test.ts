import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../subprocess/run-streaming", () => ({
  runStreaming: vi.fn(),
  SIGKILL_GRACE_MS: 5_000,
}));

import { runStreaming } from "../subprocess/run-streaming";
import copilot from "./github-copilot";


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
