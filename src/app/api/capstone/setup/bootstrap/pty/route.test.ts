import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { IPty } from "node-pty";

vi.mock("node-pty", () => ({
  spawn: vi.fn(),
}));
vi.mock("@/lib/db/progress-db", () => ({
  upsertProgress: vi.fn(),
  recordCapstoneTargetDir: vi.fn(),
  recordCapstoneTool: vi.fn(),
}));

import { spawn as spawnPty } from "node-pty";
import {
  recordCapstoneTargetDir,
  recordCapstoneTool,
  upsertProgress,
} from "@/lib/db/progress-db";
import { __resetForTests, __snapshotForTests } from "@/lib/capstone/pty/session-registry";

import { DELETE, POST } from "./route";

const spawnMock = vi.mocked(spawnPty);
const upsertMock = vi.mocked(upsertProgress);
const targetMock = vi.mocked(recordCapstoneTargetDir);
const toolMock = vi.mocked(recordCapstoneTool);

function makeFakePty(): {
  pty: IPty;
  fireExit: (exitCode: number) => void;
  killCalls: NodeJS.Signals[];
} {
  let exitCb: (e: { exitCode: number; signal?: number }) => void = () => {};
  const killCalls: NodeJS.Signals[] = [];
  const pty = {
    onExit: (cb: typeof exitCb) => {
      exitCb = cb;
      return { dispose: () => {} };
    },
    onData: () => ({ dispose: () => {} }),
    write: () => {},
    kill: (sig?: string) => {
      killCalls.push((sig ?? "SIGTERM") as NodeJS.Signals);
    },
  } as unknown as IPty;
  return {
    pty,
    fireExit: (exitCode: number) => exitCb({ exitCode }),
    killCalls,
  };
}

function jsonReq(body: unknown): Request {
  return new Request("http://localhost/api/capstone/setup/bootstrap/pty", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  spawnMock.mockReset();
  upsertMock.mockReset();
  targetMock.mockReset();
  toolMock.mockReset();
});

afterEach(() => {
  __resetForTests();
});

describe("POST /api/capstone/setup/bootstrap/pty", () => {
  it("returns 400 on invalid JSON", async () => {
    const req = new Request("http://localhost/x", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "not-json",
    });
    expect((await POST(req)).status).toBe(400);
  });

  it("returns 400 on missing sessionId", async () => {
    const res = await POST(jsonReq({ tool: "claude-code", chosenDir: "/tmp/x" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 on malformed sessionId", async () => {
    const res = await POST(
      jsonReq({ sessionId: "bad", tool: "claude-code", chosenDir: "/tmp/x" }),
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 on relative chosenDir", async () => {
    const res = await POST(
      jsonReq({
        sessionId: "20260509T120000Z",
        tool: "claude-code",
        chosenDir: "relative/path",
      }),
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 on chosenDir blocked by allowlist (/etc)", async () => {
    const res = await POST(
      jsonReq({
        sessionId: "20260509T120000Z",
        tool: "claude-code",
        chosenDir: "/etc",
      }),
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("allowlist");
  });

  it("spawns the PTY and returns 201 with status:running on success", async () => {
    const { pty } = makeFakePty();
    spawnMock.mockReturnValue(pty);
    const res = await POST(
      jsonReq({
        sessionId: "20260509T120000Z",
        tool: "claude-code",
        chosenDir: "/tmp/walkthrough",
      }),
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body).toMatchObject({
      ok: true,
      sessionId: "20260509T120000Z",
      status: "running",
    });
    expect(spawnMock).toHaveBeenCalledOnce();
    const [cmd, args] = spawnMock.mock.calls[0];
    expect(cmd).toBe("npx");
    expect(args).toEqual([
      "bmad-method@latest",
      "install",
      "--directory",
      "/tmp/walkthrough",
      "--tools",
      "claude-code",
    ]);
  });

  it("idempotent: duplicate POST while live returns 200 + existing status", async () => {
    const { pty } = makeFakePty();
    spawnMock.mockReturnValue(pty);
    const body = {
      sessionId: "20260509T120000Z",
      tool: "claude-code" as const,
      chosenDir: "/tmp/walkthrough",
    };
    await POST(jsonReq(body));
    const res2 = await POST(jsonReq(body));
    expect(res2.status).toBe(200);
    expect(spawnMock).toHaveBeenCalledOnce();
    expect(__snapshotForTests()).toEqual(["20260509T120000Z"]);
  });

  it("on PTY exit-code 0: persists capstone-session, target, tool", async () => {
    const { pty, fireExit } = makeFakePty();
    spawnMock.mockReturnValue(pty);
    await POST(
      jsonReq({
        sessionId: "20260509T120000Z",
        tool: "claude-code",
        chosenDir: "/tmp/walkthrough",
      }),
    );
    fireExit(0);
    expect(upsertMock).toHaveBeenCalledWith({
      kind: "capstone-session",
      id: "20260509T120000Z",
      completed: false,
    });
    expect(targetMock).toHaveBeenCalledWith(
      "20260509T120000Z",
      "/tmp/walkthrough",
    );
    expect(toolMock).toHaveBeenCalledWith(
      "20260509T120000Z",
      "claude-code",
    );
  });

  it("on PTY exit-code non-zero: does NOT persist any session-state", async () => {
    const { pty, fireExit } = makeFakePty();
    spawnMock.mockReturnValue(pty);
    await POST(
      jsonReq({
        sessionId: "20260509T120000Z",
        tool: "claude-code",
        chosenDir: "/tmp/walkthrough",
      }),
    );
    fireExit(1);
    expect(upsertMock).not.toHaveBeenCalled();
    expect(targetMock).not.toHaveBeenCalled();
    expect(toolMock).not.toHaveBeenCalled();
  });
});

describe("DELETE /api/capstone/setup/bootstrap/pty", () => {
  it("returns 400 when sessionId query param is missing", async () => {
    const req = new Request("http://localhost/api/capstone/setup/bootstrap/pty", {
      method: "DELETE",
    });
    expect((await DELETE(req)).status).toBe(400);
  });

  it("returns 204 and kills the live PTY", async () => {
    const { pty, killCalls } = makeFakePty();
    spawnMock.mockReturnValue(pty);
    await POST(
      jsonReq({
        sessionId: "20260509T120000Z",
        tool: "claude-code",
        chosenDir: "/tmp/walkthrough",
      }),
    );
    const req = new Request(
      "http://localhost/api/capstone/setup/bootstrap/pty?sessionId=20260509T120000Z",
      { method: "DELETE" },
    );
    const res = await DELETE(req);
    expect(res.status).toBe(204);
    expect(killCalls).toEqual(["SIGTERM"]);
    expect(__snapshotForTests()).toEqual([]);
  });

  it("returns 204 even when sessionId is unknown (idempotent)", async () => {
    const req = new Request(
      "http://localhost/api/capstone/setup/bootstrap/pty?sessionId=20260509T120000Z",
      { method: "DELETE" },
    );
    expect((await DELETE(req)).status).toBe(204);
  });
});
