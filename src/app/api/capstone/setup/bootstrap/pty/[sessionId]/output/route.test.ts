import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { IPty } from "node-pty";

import {
  __resetForTests,
  register,
} from "@/lib/capstone/pty/session-registry";

import { GET } from "./route";

function makeFakePty(): {
  pty: IPty;
  fireData: (chunk: string) => void;
  fireExit: (exitCode: number, signal?: number) => void;
} {
  let dataCb: (s: string) => void = () => {};
  let exitCb: (e: { exitCode: number; signal?: number }) => void = () => {};
  const pty = {
    onExit: (cb: typeof exitCb) => {
      exitCb = cb;
      return { dispose: () => {} };
    },
    onData: (cb: typeof dataCb) => {
      dataCb = cb;
      return { dispose: () => {} };
    },
    write: () => {},
    kill: () => {},
  } as unknown as IPty;
  return {
    pty,
    fireData: (chunk: string) => dataCb(chunk),
    fireExit: (exitCode: number, signal?: number) => exitCb({ exitCode, signal }),
  };
}

function makeReq(sessionId: string): {
  req: Request;
  ctx: { params: Promise<{ sessionId: string }> };
} {
  const req = new Request(
    `http://localhost/api/capstone/setup/bootstrap/pty/${sessionId}/output`,
  );
  return { req, ctx: { params: Promise.resolve({ sessionId }) } };
}

async function readSse(res: Response, maxChunks = 10): Promise<string> {
  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let out = "";
  for (let i = 0; i < maxChunks; i++) {
    const { value, done } = await reader.read();
    if (done) break;
    out += decoder.decode(value);
  }
  return out;
}

beforeEach(() => {
  __resetForTests();
});

afterEach(() => {
  __resetForTests();
});

describe("GET /api/capstone/setup/bootstrap/pty/[sessionId]/output", () => {
  it("returns 400 on malformed sessionId", async () => {
    const { req, ctx } = makeReq("bad");
    expect((await GET(req, ctx)).status).toBe(400);
  });

  it("returns 404 when no PTY session for that id", async () => {
    const { req, ctx } = makeReq("20260509T120000Z");
    expect((await GET(req, ctx)).status).toBe(404);
  });

  it("emits a `data` SSE event (base64-encoded) per pty.onData chunk", async () => {
    const { pty, fireData, fireExit } = makeFakePty();
    register("20260509T120000Z", pty, () => {});
    const { req, ctx } = makeReq("20260509T120000Z");
    const res = await GET(req, ctx);
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("text/event-stream");
    fireData("hello");
    fireExit(0);
    const sse = await readSse(res);
    // base64("hello") = "aGVsbG8="
    expect(sse).toContain('event: data');
    expect(sse).toContain('"b64":"aGVsbG8="');
    expect(sse).toContain('event: exit');
    expect(sse).toContain('"exitCode":0');
  });

  it("emits exit immediately and closes when session has already exited", async () => {
    const { pty, fireExit } = makeFakePty();
    register("20260509T120000Z", pty, () => {});
    fireExit(0);
    const { req, ctx } = makeReq("20260509T120000Z");
    const res = await GET(req, ctx);
    const sse = await readSse(res);
    expect(sse).toContain('event: exit');
    expect(sse).toContain('"exitCode":0');
    expect(sse).not.toContain('event: data');
  });

  it("base64-encodes raw bytes including ANSI escape sequences", async () => {
    const { pty, fireData, fireExit } = makeFakePty();
    register("20260509T120000Z", pty, () => {});
    const { req, ctx } = makeReq("20260509T120000Z");
    const res = await GET(req, ctx);
    fireData("\x1b[31mred\x1b[0m");
    fireExit(0);
    const sse = await readSse(res);
    // base64("\x1b[31mred\x1b[0m") via Buffer.from(..., "binary").toString("base64")
    const expected = Buffer.from("\x1b[31mred\x1b[0m", "binary").toString("base64");
    expect(sse).toContain(`"b64":"${expected}"`);
  });
});
