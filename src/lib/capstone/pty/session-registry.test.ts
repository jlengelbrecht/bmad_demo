import { afterEach, describe, expect, it, vi } from "vitest";
import type { IPty } from "node-pty";

import {
  __resetForTests,
  __snapshotForTests,
  forget,
  get,
  has,
  kill,
  register,
} from "./session-registry";

afterEach(() => {
  __resetForTests();
});

function makeFakePty(): {
  pty: IPty;
  fireExit: (exitCode: number, signal?: number) => void;
  fireData: (chunk: string) => void;
  killCalls: NodeJS.Signals[];
} {
  let exitCb: (e: { exitCode: number; signal?: number }) => void = () => {};
  let dataCb: (s: string) => void = () => {};
  const killCalls: NodeJS.Signals[] = [];
  const pty = {
    onExit: (cb: typeof exitCb) => {
      exitCb = cb;
      return { dispose: () => {} };
    },
    onData: (cb: typeof dataCb) => {
      dataCb = cb;
      return { dispose: () => {} };
    },
    kill: (sig?: string) => {
      killCalls.push((sig ?? "SIGTERM") as NodeJS.Signals);
    },
  } as unknown as IPty;
  return {
    pty,
    fireExit: (exitCode: number, signal?: number) => exitCb({ exitCode, signal }),
    fireData: (chunk: string) => dataCb(chunk),
    killCalls,
  };
}

describe("pty session-registry", () => {
  it("register stores the session and exposes it via get/has", () => {
    const { pty } = makeFakePty();
    const session = register("sid-1", pty, () => {});
    expect(has("sid-1")).toBe(true);
    expect(get("sid-1")).toBe(session);
    expect(__snapshotForTests()).toEqual(["sid-1"]);
  });

  it("onExit callback fires once with the PTY's exit code + signal", () => {
    const { pty, fireExit } = makeFakePty();
    const onExit = vi.fn();
    register("sid-2", pty, onExit);
    fireExit(0);
    expect(onExit).toHaveBeenCalledOnce();
    expect(onExit).toHaveBeenCalledWith(0, null);
  });

  it("onExit forwards a signal value when present", () => {
    const { pty, fireExit } = makeFakePty();
    const onExit = vi.fn();
    register("sid-3", pty, onExit);
    fireExit(143, 15);
    expect(onExit).toHaveBeenCalledWith(143, 15);
  });

  it("session.exitCode and exitSignal are stamped after exit", () => {
    const { pty, fireExit } = makeFakePty();
    const session = register("sid-4", pty, () => {});
    expect(session.exitCode).toBeNull();
    expect(session.exitSignal).toBeNull();
    fireExit(0, null);
    expect(session.exitCode).toBe(0);
    expect(session.exitSignal).toBeNull();
  });

  it("onExit handler that throws is logged but doesn't crash the registry", () => {
    const { pty, fireExit } = makeFakePty();
    const errorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    register("sid-5", pty, () => {
      throw new Error("boom");
    });
    fireExit(1);
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining("[pty registry] onExit handler threw for sid-5:"),
      expect.any(Error),
    );
    errorSpy.mockRestore();
  });

  it("kill sends SIGTERM and removes the session", () => {
    const { pty, killCalls } = makeFakePty();
    register("sid-6", pty, () => {});
    kill("sid-6");
    expect(killCalls).toEqual(["SIGTERM"]);
    expect(has("sid-6")).toBe(false);
  });

  it("kill on a non-existent session is a no-op", () => {
    expect(() => kill("never-registered")).not.toThrow();
  });

  it("kill swallows errors from already-exited PTYs", () => {
    const pty = {
      onExit: () => ({ dispose: () => {} }),
      onData: () => ({ dispose: () => {} }),
      kill: () => {
        throw new Error("ESRCH");
      },
    } as unknown as IPty;
    register("sid-7", pty, () => {});
    expect(() => kill("sid-7")).not.toThrow();
    expect(has("sid-7")).toBe(false);
  });

  it("forget removes the session without signaling the PTY", () => {
    const { pty, killCalls } = makeFakePty();
    register("sid-8", pty, () => {});
    forget("sid-8");
    expect(has("sid-8")).toBe(false);
    expect(killCalls).toHaveLength(0);
  });

  it("registry survives re-import (singleton on globalThis)", async () => {
    const { pty } = makeFakePty();
    register("sid-9", pty, () => {});
    // Re-import the module — under HMR this is what would happen.
    const reimported = await import("./session-registry");
    expect(reimported.has("sid-9")).toBe(true);
  });

  it("outputBuffer captures pty.onData chunks", () => {
    const { pty, fireData } = makeFakePty();
    const session = register("sid-buf", pty, () => {});
    fireData("hello");
    fireData(" world");
    expect(session.outputBuffer).toBe("hello world");
  });

  it("outputBuffer is capped (sliding window) at the replay cap", () => {
    const { pty, fireData } = makeFakePty();
    const session = register("sid-cap", pty, () => {});
    // Push more than the 256 KB cap.
    fireData("a".repeat(200_000));
    fireData("b".repeat(200_000));
    expect(session.outputBuffer.length).toBeLessThanOrEqual(256 * 1024);
    // The trailing data wins under sliding-window semantics.
    expect(session.outputBuffer.endsWith("b".repeat(1000))).toBe(true);
  });
});
