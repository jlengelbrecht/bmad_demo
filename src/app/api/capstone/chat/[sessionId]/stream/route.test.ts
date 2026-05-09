import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock runStreaming — every test feeds a canned async iterable.
vi.mock("@/lib/capstone/subprocess/run-streaming", () => ({
  runStreaming: vi.fn(),
  SIGKILL_GRACE_MS: 5_000,
}));

// Mock the registry so the Route Handler resolves a controllable adapter.
vi.mock("@/lib/capstone/adapters", () => ({
  getAdapterRegistry: vi.fn(),
}));

vi.mock("@/lib/db/progress-db", () => ({
  recordCapstoneToolSessionId: vi.fn(),
}));

import { getAdapterRegistry } from "@/lib/capstone/adapters";
import type { ToolAdapter, ToolId } from "@/lib/capstone/adapters/types";
import { runStreaming } from "@/lib/capstone/subprocess/run-streaming";
import { recordCapstoneToolSessionId } from "@/lib/db/progress-db";

import { GET } from "./route";

const runStreamingMock = vi.mocked(runStreaming);
const registryMock = vi.mocked(getAdapterRegistry);
const recordMock = vi.mocked(recordCapstoneToolSessionId);

type FakeEv =
  | { kind: "stdout-line"; text: string }
  | { kind: "stderr-line"; text: string }
  | { kind: "exit"; code: number | null; signal: NodeJS.Signals | null };

function fakeStream(
  events: FakeEv[],
  opts?: { onSpawn?: (child: { stdin?: { write: ReturnType<typeof vi.fn>; end: ReturnType<typeof vi.fn> } }) => void },
): AsyncIterable<FakeEv> {
  return {
    async *[Symbol.asyncIterator]() {
      if (opts?.onSpawn) {
        opts.onSpawn({
          stdin: { write: vi.fn(), end: vi.fn() },
        });
      }
      for (const ev of events) {
        yield ev;
      }
    },
  };
}

function buildAdapter(overrides: Partial<ToolAdapter> = {}): ToolAdapter {
  const base: ToolAdapter = {
    manifest: {
      id: "claude-code",
      displayName: "Test",
      cliBinary: "node",
      minVersion: ">=0.0.0",
      docsUrl: "https://example.invalid",
      supportedOS: ["linux"],
    },
    async detectInstalled() {
      return true;
    },
    async detectAuthenticated() {
      return true;
    },
    buildSpawnArgs() {
      return { cmd: "node", args: ["-e", "0"], env: process.env };
    },
    parseStreamChunk(raw) {
      try {
        const parsed = JSON.parse(raw) as {
          type?: string;
          session_id?: string;
          delta?: { text?: string };
        };
        if (parsed.type === "system/init") {
          return [{ kind: "session-init", sessionId: parsed.session_id ?? "" }];
        }
        if (parsed.type === "assistant/content_block_delta") {
          return [{ kind: "message-delta", text: parsed.delta?.text ?? "" }];
        }
        if (parsed.type === "assistant/message_stop") {
          return [{ kind: "message-end" }];
        }
      } catch {
        return [{ kind: "error", message: "bad" }];
      }
      return [];
    },
    formatUserMessage(text) {
      return text + "\n";
    },
    buildPrimer() {
      return "# primer\n";
    },
  };
  return { ...base, ...overrides };
}

function setupRegistry(adapter: ToolAdapter) {
  registryMock.mockReturnValue(
    new Map<ToolId, ToolAdapter>([
      ["claude-code", adapter],
      ["codex", adapter],
      ["github-copilot", adapter],
    ]),
  );
}

function makeReq(
  sessionId: string,
  query: Record<string, string>,
  abortSignal?: AbortSignal,
): { req: Request; ctx: { params: Promise<{ sessionId: string }> } } {
  const qs = new URLSearchParams(query).toString();
  const init: RequestInit = { method: "GET" };
  if (abortSignal) init.signal = abortSignal;
  const req = new Request(
    `http://localhost/api/capstone/chat/${sessionId}/stream?${qs}`,
    init,
  );
  return { req, ctx: { params: Promise.resolve({ sessionId }) } };
}

async function readSse(res: Response): Promise<string> {
  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let out = "";
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    out += decoder.decode(value);
  }
  return out;
}

beforeEach(() => {
  runStreamingMock.mockReset();
  registryMock.mockReset();
  recordMock.mockReset();
});

afterEach(() => {
  vi.useRealTimers();
});

const VALID_QUERY = {
  phase: "brief",
  message: "hi",
  tool: "claude-code",
  chosenDir: "/tmp/chosen",
};

describe("GET /api/capstone/chat/[sessionId]/stream — Zod validation", () => {
  it("returns 400 on missing phase", async () => {
    setupRegistry(buildAdapter());
    const { phase: _phase, ...rest } = VALID_QUERY;
    void _phase;
    const { req, ctx } = makeReq("new", rest);
    const res = await GET(req, ctx);
    expect(res.status).toBe(400);
  });

  it("returns 400 on invalid phase", async () => {
    setupRegistry(buildAdapter());
    const { req, ctx } = makeReq("new", { ...VALID_QUERY, phase: "wrong" });
    const res = await GET(req, ctx);
    expect(res.status).toBe(400);
  });

  it("returns 400 when message exceeds 32_000 chars", async () => {
    setupRegistry(buildAdapter());
    const { req, ctx } = makeReq("new", {
      ...VALID_QUERY,
      message: "x".repeat(32_001),
    });
    const res = await GET(req, ctx);
    expect(res.status).toBe(400);
  });

  it("returns 400 on invalid tool", async () => {
    setupRegistry(buildAdapter());
    const { req, ctx } = makeReq("new", { ...VALID_QUERY, tool: "gemini" });
    const res = await GET(req, ctx);
    expect(res.status).toBe(400);
  });

  it("returns 400 on non-absolute chosenDir", async () => {
    setupRegistry(buildAdapter());
    const { req, ctx } = makeReq("new", { ...VALID_QUERY, chosenDir: "relative/path" });
    const res = await GET(req, ctx);
    expect(res.status).toBe(400);
  });

  it("returns 400 on path-traversal-y sessionId", async () => {
    setupRegistry(buildAdapter());
    const { req, ctx } = makeReq("../etc", VALID_QUERY);
    const res = await GET(req, ctx);
    expect(res.status).toBe(400);
  });
});

describe("GET /api/capstone/chat/[sessionId]/stream — first turn", () => {
  it("captures session-init from the adapter and forwards as SSE", async () => {
    setupRegistry(buildAdapter());
    runStreamingMock.mockReturnValue(
      fakeStream([
        {
          kind: "stdout-line",
          text: JSON.stringify({ type: "system/init", session_id: "tool-abc" }),
        },
        {
          kind: "stdout-line",
          text: JSON.stringify({
            type: "assistant/content_block_delta",
            delta: { text: "Hi" },
          }),
        },
        {
          kind: "stdout-line",
          text: JSON.stringify({ type: "assistant/message_stop" }),
        },
        { kind: "exit", code: 0, signal: null },
      ]),
    );
    const { req, ctx } = makeReq("new", VALID_QUERY);
    const res = await GET(req, ctx);
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("text/event-stream");
    const sse = await readSse(res);
    expect(sse).toContain('"kind":"session-init"');
    expect(sse).toContain('"sessionId":"tool-abc"');
    expect(sse).toContain('"kind":"message-delta"');
    expect(sse).toContain('"kind":"message-end"');
    expect(sse).toContain("event: done");
  });

  it("does NOT call recordCapstoneToolSessionId for the 'new' first turn", async () => {
    setupRegistry(buildAdapter());
    runStreamingMock.mockReturnValue(
      fakeStream([
        {
          kind: "stdout-line",
          text: JSON.stringify({ type: "system/init", session_id: "tool-abc" }),
        },
        { kind: "exit", code: 0, signal: null },
      ]),
    );
    const { req, ctx } = makeReq("new", VALID_QUERY);
    await readSse(await GET(req, ctx));
    expect(recordMock).not.toHaveBeenCalled();
  });
});

describe("GET /api/capstone/chat/[sessionId]/stream — resume turn", () => {
  it("calls recordCapstoneToolSessionId when session-init arrives mid-resume", async () => {
    setupRegistry(buildAdapter());
    runStreamingMock.mockReturnValue(
      fakeStream([
        {
          kind: "stdout-line",
          text: JSON.stringify({ type: "system/init", session_id: "tool-xyz" }),
        },
        { kind: "exit", code: 0, signal: null },
      ]),
    );
    const { req, ctx } = makeReq("20260507T143022Z", VALID_QUERY);
    await readSse(await GET(req, ctx));
    expect(recordMock).toHaveBeenCalledWith(
      "20260507T143022Z",
      "brief",
      "tool-xyz",
    );
  });
});

describe("GET /api/capstone/chat/[sessionId]/stream — adapter formatUserMessage contract", () => {
  it("when formatUserMessage returns '', skips stdin write (Copilot path)", async () => {
    const stdinWrite = vi.fn();
    const stdinEnd = vi.fn();
    const adapter = buildAdapter({
      formatUserMessage: () => "",
    });
    setupRegistry(adapter);
    runStreamingMock.mockImplementation((opts) =>
      fakeStream([{ kind: "exit", code: 0, signal: null }], {
        onSpawn: () => {
          opts.onSpawn?.({
            stdin: { write: stdinWrite, end: stdinEnd },
          } as unknown as import("node:child_process").ChildProcess);
        },
      }),
    );
    const { req, ctx } = makeReq("new", VALID_QUERY);
    await readSse(await GET(req, ctx));
    expect(stdinWrite).not.toHaveBeenCalled();
    expect(stdinEnd).toHaveBeenCalled();
  });

  it("when formatUserMessage returns non-empty, writes to stdin and ends", async () => {
    const stdinWrite = vi.fn();
    const stdinEnd = vi.fn();
    setupRegistry(buildAdapter());
    runStreamingMock.mockImplementation((opts) =>
      fakeStream([{ kind: "exit", code: 0, signal: null }], {
        onSpawn: () => {
          opts.onSpawn?.({
            stdin: { write: stdinWrite, end: stdinEnd },
          } as unknown as import("node:child_process").ChildProcess);
        },
      }),
    );
    const { req, ctx } = makeReq("new", VALID_QUERY);
    await readSse(await GET(req, ctx));
    expect(stdinWrite).toHaveBeenCalledWith("hi\n");
    expect(stdinEnd).toHaveBeenCalled();
  });
});

describe("GET /api/capstone/chat/[sessionId]/stream — module surface", () => {
  it("exports GET, runtime='nodejs', dynamic='force-dynamic'", async () => {
    const mod = await import("./route");
    expect(typeof mod.GET).toBe("function");
    expect(mod.runtime).toBe("nodejs");
    expect(mod.dynamic).toBe("force-dynamic");
  });

  it("does not import NextRequest / next/headers", async () => {
    const fs = await import("node:fs");
    const path = await import("node:path");
    const src = fs.readFileSync(
      path.resolve(import.meta.dirname, "route.ts"),
      "utf8",
    );
    expect(src).not.toMatch(/from ["']next\/headers["']/);
    expect(src).not.toMatch(/NextRequest/);
  });
});
