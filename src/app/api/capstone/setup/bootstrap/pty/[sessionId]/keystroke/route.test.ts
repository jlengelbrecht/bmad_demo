import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { IPty } from "node-pty";

import {
  __resetForTests,
  register,
} from "@/lib/capstone/pty/session-registry";

import { POST } from "./route";

function makeFakePty(opts: { exitImmediately?: boolean } = {}): {
  pty: IPty;
  writeMock: ReturnType<typeof vi.fn>;
  fireExit: (exitCode: number) => void;
} {
  let exitCb: (e: { exitCode: number; signal?: number }) => void = () => {};
  const writeMock = vi.fn();
  const pty = {
    onExit: (cb: typeof exitCb) => {
      exitCb = cb;
      if (opts.exitImmediately) cb({ exitCode: 0 });
      return { dispose: () => {} };
    },
    onData: () => ({ dispose: () => {} }),
    write: writeMock,
    kill: () => {},
  } as unknown as IPty;
  return {
    pty,
    writeMock,
    fireExit: (exitCode: number) => exitCb({ exitCode }),
  };
}

function makeReq(
  sessionId: string,
  body: unknown,
): { req: Request; ctx: { params: Promise<{ sessionId: string }> } } {
  const req = new Request(
    `http://localhost/api/capstone/setup/bootstrap/pty/${sessionId}/keystroke`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    },
  );
  return { req, ctx: { params: Promise.resolve({ sessionId }) } };
}

beforeEach(() => {
  __resetForTests();
});

afterEach(() => {
  __resetForTests();
});

describe("POST /api/capstone/setup/bootstrap/pty/[sessionId]/keystroke", () => {
  it("returns 400 on malformed sessionId", async () => {
    const { req, ctx } = makeReq("bad", { keystroke: "x" });
    expect((await POST(req, ctx)).status).toBe(400);
  });

  it("returns 400 on invalid JSON body", async () => {
    const req = new Request(
      "http://localhost/api/capstone/setup/bootstrap/pty/20260509T120000Z/keystroke",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "not-json",
      },
    );
    const res = await POST(req, {
      params: Promise.resolve({ sessionId: "20260509T120000Z" }),
    });
    expect(res.status).toBe(400);
  });

  it("returns 400 when payload exceeds 4 KB", async () => {
    const big = "x".repeat(4 * 1024 + 1);
    const { req, ctx } = makeReq("20260509T120000Z", { keystroke: big });
    expect((await POST(req, ctx)).status).toBe(400);
  });

  it("returns 404 when no PTY session for that id", async () => {
    const { req, ctx } = makeReq("20260509T120000Z", { keystroke: "y\r" });
    expect((await POST(req, ctx)).status).toBe(404);
  });

  it("returns 409 when PTY has already exited", async () => {
    const { pty } = makeFakePty({ exitImmediately: true });
    register("20260509T120000Z", pty, () => {});
    const { req, ctx } = makeReq("20260509T120000Z", { keystroke: "y\r" });
    expect((await POST(req, ctx)).status).toBe(409);
  });

  it("returns 204 and writes the data to PTY stdin", async () => {
    const { pty, writeMock } = makeFakePty();
    register("20260509T120000Z", pty, () => {});
    const { req, ctx } = makeReq("20260509T120000Z", { keystroke: "y\r" });
    const res = await POST(req, ctx);
    expect(res.status).toBe(204);
    expect(writeMock).toHaveBeenCalledWith("y\r");
  });

  it("forwards arrow-key escape sequences verbatim", async () => {
    const { pty, writeMock } = makeFakePty();
    register("20260509T120000Z", pty, () => {});
    const { req, ctx } = makeReq("20260509T120000Z", { keystroke: "\x1b[B" }); // down arrow
    await POST(req, ctx);
    expect(writeMock).toHaveBeenCalledWith("\x1b[B");
  });
});
