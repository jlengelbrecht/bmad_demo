import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { IPty } from "node-pty";

import {
  __resetForTests,
  register,
} from "@/lib/capstone/pty/session-registry";

import { POST } from "./route";

function makeFakePty(opts: { exitImmediately?: boolean } = {}): {
  pty: IPty;
  resizeMock: ReturnType<typeof vi.fn>;
} {
  const resizeMock = vi.fn();
  const pty = {
    onExit: (cb: (e: { exitCode: number; signal?: number }) => void) => {
      if (opts.exitImmediately) cb({ exitCode: 0 });
      return { dispose: () => {} };
    },
    onData: () => ({ dispose: () => {} }),
    write: () => {},
    resize: resizeMock,
    kill: () => {},
  } as unknown as IPty;
  return { pty, resizeMock };
}

function makeReq(
  ptyId: string,
  body: unknown,
): { req: Request; ctx: { params: Promise<{ ptyId: string }> } } {
  const req = new Request(
    `http://localhost/api/capstone/pty/${ptyId}/resize`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    },
  );
  return { req, ctx: { params: Promise.resolve({ ptyId }) } };
}

beforeEach(() => __resetForTests());
afterEach(() => __resetForTests());

describe("POST /api/capstone/pty/[ptyId]/resize", () => {
  it("returns 400 on malformed ptyId", async () => {
    const { req, ctx } = makeReq("bad", { cols: 80, rows: 24 });
    expect((await POST(req, ctx)).status).toBe(400);
  });

  it("accepts session.phase composite ids", async () => {
    const { pty, resizeMock } = makeFakePty();
    register("20260509T120000Z.brief", pty, () => {});
    const { req, ctx } = makeReq("20260509T120000Z.brief", {
      cols: 100,
      rows: 30,
    });
    expect((await POST(req, ctx)).status).toBe(204);
    expect(resizeMock).toHaveBeenCalledWith(100, 30);
  });

  it("returns 400 on missing cols/rows", async () => {
    const { req, ctx } = makeReq("20260509T120000Z", {});
    expect((await POST(req, ctx)).status).toBe(400);
  });

  it("returns 400 on non-positive dims", async () => {
    const { req, ctx } = makeReq("20260509T120000Z", { cols: 0, rows: 24 });
    expect((await POST(req, ctx)).status).toBe(400);
  });

  it("returns 400 on dims past the cap", async () => {
    const { req, ctx } = makeReq("20260509T120000Z", { cols: 9999, rows: 24 });
    expect((await POST(req, ctx)).status).toBe(400);
  });

  it("returns 404 when no PTY session for that id", async () => {
    const { req, ctx } = makeReq("20260509T120000Z", { cols: 80, rows: 24 });
    expect((await POST(req, ctx)).status).toBe(404);
  });

  it("returns 409 when PTY already exited", async () => {
    const { pty } = makeFakePty({ exitImmediately: true });
    register("20260509T120000Z", pty, () => {});
    const { req, ctx } = makeReq("20260509T120000Z", { cols: 80, rows: 24 });
    expect((await POST(req, ctx)).status).toBe(409);
  });

  it("returns 204 and forwards cols/rows to pty.resize", async () => {
    const { pty, resizeMock } = makeFakePty();
    register("20260509T120000Z", pty, () => {});
    const { req, ctx } = makeReq("20260509T120000Z", { cols: 132, rows: 40 });
    const res = await POST(req, ctx);
    expect(res.status).toBe(204);
    expect(resizeMock).toHaveBeenCalledWith(132, 40);
  });
});
