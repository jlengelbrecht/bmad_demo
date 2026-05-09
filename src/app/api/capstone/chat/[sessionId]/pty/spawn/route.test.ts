import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { IPty } from "node-pty";

vi.mock("node-pty", () => ({ spawn: vi.fn() }));
vi.mock("@/lib/db/progress-db", () => ({
  getCapstoneTargetDir: vi.fn(),
}));

import { spawn as spawnPty } from "node-pty";
import { getCapstoneTargetDir } from "@/lib/db/progress-db";
import { __resetForTests, __snapshotForTests } from "@/lib/capstone/pty/session-registry";

import { DELETE, POST } from "./route";

const spawnMock = vi.mocked(spawnPty);
const targetMock = vi.mocked(getCapstoneTargetDir);

function makeFakePty(): { pty: IPty; killCalls: NodeJS.Signals[] } {
  const killCalls: NodeJS.Signals[] = [];
  const pty = {
    onExit: () => ({ dispose: () => {} }),
    onData: () => ({ dispose: () => {} }),
    write: () => {},
    resize: () => {},
    kill: (sig?: string) => {
      killCalls.push((sig ?? "SIGTERM") as NodeJS.Signals);
    },
  } as unknown as IPty;
  return { pty, killCalls };
}

function jsonReq(sessionId: string, body: unknown): {
  req: Request;
  ctx: { params: Promise<{ sessionId: string }> };
} {
  const req = new Request(
    `http://localhost/api/capstone/chat/${sessionId}/pty/spawn`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    },
  );
  return { req, ctx: { params: Promise.resolve({ sessionId }) } };
}

beforeEach(() => {
  spawnMock.mockReset();
  targetMock.mockReset();
});

afterEach(() => {
  __resetForTests();
});

describe("POST /api/capstone/chat/[sessionId]/pty/spawn", () => {
  it("returns 400 on invalid sessionId", async () => {
    const { req, ctx } = jsonReq("bad", { tool: "claude-code", phase: "brief" });
    expect((await POST(req, ctx)).status).toBe(400);
  });

  it("returns 400 on invalid tool", async () => {
    const { req, ctx } = jsonReq("20260509T120000Z", {
      tool: "gemini",
      phase: "brief",
    });
    expect((await POST(req, ctx)).status).toBe(400);
  });

  it("returns 400 on invalid phase", async () => {
    const { req, ctx } = jsonReq("20260509T120000Z", {
      tool: "claude-code",
      phase: "wrong",
    });
    expect((await POST(req, ctx)).status).toBe(400);
  });

  it("returns 404 when no capstone-target row for the session", async () => {
    targetMock.mockReturnValue(null);
    const { req, ctx } = jsonReq("20260509T120000Z", {
      tool: "claude-code",
      phase: "brief",
    });
    expect((await POST(req, ctx)).status).toBe(404);
  });

  it("returns 400 when chosenDir is blocked by allowlist", async () => {
    targetMock.mockReturnValue("/etc");
    const { req, ctx } = jsonReq("20260509T120000Z", {
      tool: "claude-code",
      phase: "brief",
    });
    const res = await POST(req, ctx);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("allowlist");
  });

  it("spawns claude with --dangerously-skip-permissions for claude-code/brief", async () => {
    targetMock.mockReturnValue("/tmp/repo");
    const { pty } = makeFakePty();
    spawnMock.mockReturnValue(pty);
    const { req, ctx } = jsonReq("20260509T120000Z", {
      tool: "claude-code",
      phase: "brief",
    });
    const res = await POST(req, ctx);
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body).toMatchObject({
      ok: true,
      ptyId: "20260509T120000Z.brief",
      status: "running",
    });
    const [cmd, args, opts] = spawnMock.mock.calls[0];
    expect(cmd).toBe("claude");
    // Includes the BMAD slash command as positional argv so claude
    // executes /bmad-product-brief on launch (autoRun behavior).
    expect(args).toEqual([
      "--dangerously-skip-permissions",
      "/bmad-product-brief",
    ]);
    expect((opts as { cwd?: string }).cwd).toBe("/tmp/repo");
  });

  it("registers the PTY under the composite ptyId <sessionId>.<phase>", async () => {
    targetMock.mockReturnValue("/tmp/repo");
    spawnMock.mockReturnValue(makeFakePty().pty);
    const { req, ctx } = jsonReq("20260509T120000Z", {
      tool: "claude-code",
      phase: "architecture",
    });
    await POST(req, ctx);
    expect(__snapshotForTests()).toEqual(["20260509T120000Z.architecture"]);
  });

  it("idempotent: duplicate POST returns 200 with existing status", async () => {
    targetMock.mockReturnValue("/tmp/repo");
    spawnMock.mockReturnValue(makeFakePty().pty);
    const body = { tool: "claude-code" as const, phase: "brief" as const };
    await POST(...Object.values(jsonReq("20260509T120000Z", body)) as Parameters<typeof POST>);
    const second = await POST(
      ...(Object.values(jsonReq("20260509T120000Z", body)) as Parameters<typeof POST>),
    );
    expect(second.status).toBe(200);
    expect(spawnMock).toHaveBeenCalledOnce();
  });
});

describe("DELETE /api/capstone/chat/[sessionId]/pty/spawn", () => {
  it("returns 400 when phase query param is missing", async () => {
    const req = new Request(
      "http://localhost/api/capstone/chat/20260509T120000Z/pty/spawn",
      { method: "DELETE" },
    );
    const res = await DELETE(req, {
      params: Promise.resolve({ sessionId: "20260509T120000Z" }),
    });
    expect(res.status).toBe(400);
  });

  it("returns 204 and kills the live PTY", async () => {
    targetMock.mockReturnValue("/tmp/repo");
    const { pty, killCalls } = makeFakePty();
    spawnMock.mockReturnValue(pty);
    const { req: spawnReq, ctx: spawnCtx } = jsonReq("20260509T120000Z", {
      tool: "claude-code",
      phase: "brief",
    });
    await POST(spawnReq, spawnCtx);
    const req = new Request(
      "http://localhost/api/capstone/chat/20260509T120000Z/pty/spawn?phase=brief",
      { method: "DELETE" },
    );
    const res = await DELETE(req, {
      params: Promise.resolve({ sessionId: "20260509T120000Z" }),
    });
    expect(res.status).toBe(204);
    expect(killCalls).toEqual(["SIGTERM"]);
    expect(__snapshotForTests()).toEqual([]);
  });
});
