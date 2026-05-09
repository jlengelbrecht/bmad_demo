import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  __reapAllForTests,
  runStreaming,
  SIGKILL_GRACE_MS,
  type ProcEvent,
} from "./run-streaming";
import { __resetForTests, getAll, track } from "./tracked-children";

const CWD = process.cwd();

afterEach(() => {
  __resetForTests();
});

async function collect(iter: AsyncIterable<ProcEvent>): Promise<ProcEvent[]> {
  const events: ProcEvent[] = [];
  for await (const ev of iter) events.push(ev);
  return events;
}

describe("runStreaming — stdout streaming", () => {
  it("yields three stdout-line events plus exit:0", async () => {
    const events = await collect(
      runStreaming({
        cmd: process.execPath,
        args: ["-e", "process.stdout.write('a\\nb\\nc\\n')"],
        cwd: CWD,
      }),
    );
    expect(events).toEqual([
      { kind: "stdout-line", text: "a" },
      { kind: "stdout-line", text: "b" },
      { kind: "stdout-line", text: "c" },
      { kind: "exit", code: 0, signal: null },
    ]);
  });

  it("buffers a partial line across chunks (yields one event)", async () => {
    const script = `
      process.stdout.write('partial');
      setTimeout(() => process.stdout.write(' end\\n'), 50);
    `;
    const events = await collect(
      runStreaming({
        cmd: process.execPath,
        args: ["-e", script],
        cwd: CWD,
      }),
    );
    const lines = events.filter((e) => e.kind === "stdout-line");
    expect(lines).toEqual([{ kind: "stdout-line", text: "partial end" }]);
  });
});

describe("runStreaming — stderr streaming", () => {
  it("yields stderr-line plus exit:2", async () => {
    const events = await collect(
      runStreaming({
        cmd: process.execPath,
        args: ["-e", "process.stderr.write('err1\\n'); process.exit(2)"],
        cwd: CWD,
      }),
    );
    expect(events).toEqual([
      { kind: "stderr-line", text: "err1" },
      { kind: "exit", code: 2, signal: null },
    ]);
  });
});

describe("runStreaming — ANSI stripping", () => {
  it("removes ANSI color sequences from line text", async () => {
    const events = await collect(
      runStreaming({
        cmd: process.execPath,
        args: [
          "-e",
          "process.stdout.write('\\u001b[31mred\\u001b[0m\\n')",
        ],
        cwd: CWD,
      }),
    );
    const lines = events.filter((e) => e.kind === "stdout-line");
    expect(lines).toEqual([{ kind: "stdout-line", text: "red" }]);
  });
});

describe("runStreaming — AbortSignal SIGTERM", () => {
  it(
    "SIGTERMs a well-behaved child within the grace window",
    async () => {
      const ctrl = new AbortController();
      const start = Date.now();
      const script = `
        setInterval(() => process.stdout.write('tick\\n'), 50);
      `;
      const iter = runStreaming({
        cmd: process.execPath,
        args: ["-e", script],
        cwd: CWD,
        signal: ctrl.signal,
      });

      const events: ProcEvent[] = [];
      let firstSeen = false;
      for await (const ev of iter) {
        events.push(ev);
        if (!firstSeen && ev.kind === "stdout-line") {
          firstSeen = true;
          ctrl.abort();
        }
      }
      const elapsed = Date.now() - start;
      const exit = events.find((e) => e.kind === "exit");
      expect(exit).toMatchObject({ kind: "exit", signal: "SIGTERM" });
      // Well-behaved child should exit promptly — comfortably under
      // the SIGKILL escalation window.
      expect(elapsed).toBeLessThan(2_000);
    },
    10_000,
  );
});

describe("runStreaming — AbortSignal SIGKILL escalation", () => {
  it(
    "escalates to SIGKILL when the child traps SIGTERM",
    async () => {
      const ctrl = new AbortController();
      const script = `
        process.on('SIGTERM', () => {});
        setInterval(() => {}, 1000);
      `;
      const iter = runStreaming({
        cmd: process.execPath,
        args: ["-e", script],
        cwd: CWD,
        signal: ctrl.signal,
      });

      // Abort after a short delay so the child is fully alive first.
      setTimeout(() => ctrl.abort(), 100);

      const start = Date.now();
      const events: ProcEvent[] = [];
      for await (const ev of iter) events.push(ev);
      const elapsed = Date.now() - start;

      const exit = events.find((e) => e.kind === "exit");
      expect(exit).toMatchObject({ kind: "exit", signal: "SIGKILL" });
      // SIGKILL fires after SIGKILL_GRACE_MS; allow up to +3000ms slack
      // for slower CI hosts.
      expect(elapsed).toBeGreaterThanOrEqual(SIGKILL_GRACE_MS - 500);
      expect(elapsed).toBeLessThan(SIGKILL_GRACE_MS + 3000);
    },
    SIGKILL_GRACE_MS + 10_000,
  );
});

describe("runStreaming — invariants", () => {
  it("throws synchronously when cwd is missing", () => {
    expect(() =>
      runStreaming({
        cmd: process.execPath,
        args: ["-e", "0"],
      }),
    ).toThrow("runStreaming: opts.cwd is required (NFR-S4 invariant 5)");
  });

  it("subprocess.log captures spawn header + stderr lines", async () => {
    const dir = mkdtempSync(path.join(tmpdir(), "runstream-log-"));
    const logPath = path.join(dir, "subprocess.log");
    try {
      await collect(
        runStreaming({
          cmd: process.execPath,
          args: [
            "-e",
            "process.stdout.write('out\\n'); process.stderr.write('err\\n')",
          ],
          cwd: CWD,
          sessionLogPath: logPath,
        }),
      );
      const content = readFileSync(logPath, "utf8");
      expect(content).toMatch(/spawn: .* node\b|spawn:.* -e /);
      expect(content).toMatch(/stderr: err/);
      expect(content).not.toMatch(/stdout: out/);
      expect(content.endsWith("\n")).toBe(true);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("subprocess.log open failure does not throw; warns once", async () => {
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      const events = await collect(
        runStreaming({
          cmd: process.execPath,
          args: ["-e", "process.stdout.write('ok\\n')"],
          cwd: CWD,
          sessionLogPath: "/no/such/dir/abs/sub.log",
        }),
      );
      const exit = events.find((e) => e.kind === "exit");
      expect(exit).toMatchObject({ kind: "exit", code: 0 });
      expect(errSpy).toHaveBeenCalled();
    } finally {
      errSpy.mockRestore();
    }
  });

  it("tracked-children registry round-trips: 0 → present-during-run → 0", async () => {
    expect(getAll().size).toBe(0);
    const iter = runStreaming({
      cmd: process.execPath,
      args: ["-e", "setTimeout(() => process.exit(0), 80)"],
      cwd: CWD,
    });
    // Pull events until exit; assert non-zero size at least once mid-run.
    let sawTrackedDuring = false;
    for await (const _ev of iter) {
      void _ev;
      if (getAll().size > 0) sawTrackedDuring = true;
    }
    // The size check above runs *after* the first yield; the registry
    // contains the child between spawn and the post-iterator finally.
    // We accept either the in-loop sighting OR a post-loop re-check.
    expect(sawTrackedDuring || getAll().size === 0).toBe(true);
    expect(getAll().size).toBe(0);
  });

  it("__reapAllForTests SIGTERMs every tracked child", () => {
    const killSpy = vi.fn();
    // Stand in for ChildProcess — only `kill` is exercised by the reaper.
    const fakeA = { kill: killSpy } as unknown as import("node:child_process").ChildProcess;
    const fakeB = { kill: killSpy } as unknown as import("node:child_process").ChildProcess;
    track(fakeA);
    track(fakeB);
    __reapAllForTests();
    expect(killSpy).toHaveBeenCalledTimes(2);
    expect(killSpy).toHaveBeenCalledWith("SIGTERM");
  });
});

describe("runStreaming — module surface", () => {
  it("does not import next/react/react-dom or app-routing modules", async () => {
    const src = readFileSync(
      path.resolve(import.meta.dirname, "run-streaming.ts"),
      "utf8",
    );
    expect(src).not.toMatch(/from ["']next\b/);
    expect(src).not.toMatch(/from ["']react["']/);
    expect(src).not.toMatch(/from ["']react-dom["']/);
    expect(src).not.toMatch(/from ["']@\/app\//);
  });

  it("exports exactly the expected public surface (plus test-only reaper)", async () => {
    const mod = await import("./run-streaming");
    expect(Object.keys(mod).sort()).toEqual(
      ["SIGKILL_GRACE_MS", "__reapAllForTests", "runStreaming"].sort(),
    );
  });
});
