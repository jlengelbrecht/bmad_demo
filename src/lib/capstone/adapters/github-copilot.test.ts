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
  // Probe is now a presence check on ~/.copilot/config.json::lastLoggedInUser.login.
  // We point COPILOT_CONFIG_PATH at a tmp file per test for hermetic coverage.
  let tmpDir: string;
  let originalEnv: string | undefined;

  beforeEach(async () => {
    const { mkdtempSync } = await import("node:fs");
    const { tmpdir } = await import("node:os");
    const { join } = await import("node:path");
    tmpDir = mkdtempSync(join(tmpdir(), "copilot-auth-"));
    originalEnv = process.env.COPILOT_CONFIG_PATH;
  });

  afterEach(async () => {
    const { rmSync } = await import("node:fs");
    rmSync(tmpDir, { recursive: true, force: true });
    if (originalEnv === undefined) delete process.env.COPILOT_CONFIG_PATH;
    else process.env.COPILOT_CONFIG_PATH = originalEnv;
  });

  async function writeConfig(content: string): Promise<string> {
    const { writeFileSync } = await import("node:fs");
    const { join } = await import("node:path");
    const path = join(tmpDir, "config.json");
    writeFileSync(path, content);
    process.env.COPILOT_CONFIG_PATH = path;
    return path;
  }

  it("returns true when ~/.copilot/config.json has lastLoggedInUser.login", async () => {
    await writeConfig(
      JSON.stringify({
        firstLaunchAt: "2026-05-09T19:33:38.343Z",
        lastLoggedInUser: { host: "https://github.com", login: "jlengelbrecht" },
      }),
    );
    expect(await copilot.detectAuthenticated()).toBe(true);
  });

  it("returns true when the config file is JSONC (real-world: copilot writes // line comments)", async () => {
    // Real-world example from copilot 1.0.44: file starts with two
    // comment lines explaining settings.json is the user-editable file.
    await writeConfig(
      [
        "// User settings belong in settings.json.",
        "// This file is managed automatically.",
        JSON.stringify({
          firstLaunchAt: "2026-05-09T19:33:38.343Z",
          lastLoggedInUser: { login: "jlengelbrecht" },
        }),
      ].join("\n"),
    );
    expect(await copilot.detectAuthenticated()).toBe(true);
  });

  it("returns false when the config file does not exist", async () => {
    const { join } = await import("node:path");
    process.env.COPILOT_CONFIG_PATH = join(tmpDir, "missing.json");
    expect(await copilot.detectAuthenticated()).toBe(false);
  });

  it("returns false when lastLoggedInUser is absent", async () => {
    await writeConfig(JSON.stringify({ firstLaunchAt: "now" }));
    expect(await copilot.detectAuthenticated()).toBe(false);
  });

  it("returns false when lastLoggedInUser.login is empty", async () => {
    await writeConfig(JSON.stringify({ lastLoggedInUser: { login: "" } }));
    expect(await copilot.detectAuthenticated()).toBe(false);
  });

  it("returns false when lastLoggedInUser.login is not a string", async () => {
    await writeConfig(JSON.stringify({ lastLoggedInUser: { login: 12345 } }));
    expect(await copilot.detectAuthenticated()).toBe(false);
  });

  it("returns false on unparseable JSON", async () => {
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    await writeConfig("{ not valid json");
    expect(await copilot.detectAuthenticated()).toBe(false);
    errSpy.mockRestore();
  });
});
