import { readFileSync } from "node:fs";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock the DB layer BEFORE importing the route — Vitest hoists vi.mock,
// but doing it explicitly at the top makes the contract obvious.
vi.mock("@/lib/db/progress-db", () => ({
  upsertProgress: vi.fn(),
}));

import { upsertProgress } from "@/lib/db/progress-db";
import * as routeModule from "./route";
import { POST } from "./route";

// Strongly-typed spy so a future change to upsertProgress's signature
// would fail the type-check rather than silently passing the test.
const upsertSpy = upsertProgress as unknown as ReturnType<
  typeof vi.fn<(typeof import("@/lib/db/progress-db"))["upsertProgress"]>
>;

function postRequest(body: unknown, opts: { raw?: boolean } = {}): Request {
  if (opts.raw) {
    return new Request("http://localhost/api/progress", {
      method: "POST",
      body: body as BodyInit,
      headers: { "content-type": "application/json" },
    });
  }
  return new Request("http://localhost/api/progress", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
}

describe("POST /api/progress — happy path", () => {
  beforeEach(() => {
    upsertSpy.mockReset();
  });

  it("upserts a lesson completion and returns 200 { ok: true }", async () => {
    const res = await POST(postRequest({ kind: "lesson", id: "lesson-2", completed: true }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(upsertSpy).toHaveBeenCalledTimes(1);
    expect(upsertSpy).toHaveBeenCalledWith({
      kind: "lesson",
      id: "lesson-2",
      completed: true,
    });
  });

  it("upserts a lab mark-incomplete and returns 200", async () => {
    const res = await POST(postRequest({ kind: "lab", id: "solo", completed: false }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(upsertSpy).toHaveBeenCalledWith({ kind: "lab", id: "solo", completed: false });
  });
});

describe("POST /api/progress — validation failures (400)", () => {
  beforeEach(() => {
    upsertSpy.mockReset();
  });

  it("rejects malformed JSON with 400 'Invalid request'", async () => {
    const res = await POST(postRequest("{not json", { raw: true }));
    expect(res.status).toBe(400);
    const body = (await res.json()) as { ok: boolean; error: string };
    expect(body.ok).toBe(false);
    expect(body.error).toBe("Invalid request");
    expect(upsertSpy).not.toHaveBeenCalled();
  });

  it("rejects a literal `null` body", async () => {
    const res = await POST(postRequest(null));
    expect(res.status).toBe(400);
    const body = (await res.json()) as { ok: boolean; error: string };
    expect(body.error).toBe("Invalid request");
    expect(upsertSpy).not.toHaveBeenCalled();
  });

  it("rejects an array body", async () => {
    const res = await POST(postRequest([1, 2, 3]));
    expect(res.status).toBe(400);
    const body = (await res.json()) as { ok: boolean; error: string };
    expect(body.error).toBe("Invalid request");
    expect(upsertSpy).not.toHaveBeenCalled();
  });

  it("rejects missing kind with Zod-flattened details", async () => {
    const res = await POST(postRequest({ id: "lesson-1", completed: true }));
    expect(res.status).toBe(400);
    const body = (await res.json()) as {
      ok: boolean;
      error: string;
      details: { fieldErrors: Record<string, unknown> };
    };
    expect(body.ok).toBe(false);
    expect(body.error).toBe("Invalid request");
    expect(body.details.fieldErrors).toHaveProperty("kind");
    expect(upsertSpy).not.toHaveBeenCalled();
  });

  it("rejects unknown kind ('capstone-session') — Epic 3 scope gate", async () => {
    const res = await POST(postRequest({ kind: "capstone-session", id: "x", completed: true }));
    expect(res.status).toBe(400);
    expect(upsertSpy).not.toHaveBeenCalled();
  });

  it("rejects empty id", async () => {
    const res = await POST(postRequest({ kind: "lesson", id: "", completed: true }));
    expect(res.status).toBe(400);
    expect(upsertSpy).not.toHaveBeenCalled();
  });

  it("rejects whitespace-only id (after trim)", async () => {
    const res = await POST(postRequest({ kind: "lesson", id: "   ", completed: true }));
    expect(res.status).toBe(400);
    expect(upsertSpy).not.toHaveBeenCalled();
  });

  it("rejects non-boolean completed", async () => {
    const res = await POST(postRequest({ kind: "lesson", id: "lesson-1", completed: "yes" }));
    expect(res.status).toBe(400);
    expect(upsertSpy).not.toHaveBeenCalled();
  });
});

describe("POST /api/progress — DB error (500)", () => {
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    upsertSpy.mockReset();
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    errorSpy.mockRestore();
  });

  it("returns 500 with a bare error envelope when upsertProgress throws", async () => {
    upsertSpy.mockImplementation(() => {
      throw new Error("simulated SQLite failure");
    });

    const res = await POST(postRequest({ kind: "lesson", id: "lesson-1", completed: true }));
    expect(res.status).toBe(500);

    // Exact-match assertion is the load-bearing one: the response body must
    // be the bare envelope with no leakage.
    expect(await res.json()).toEqual({ ok: false, error: "Internal error" });

    // The handler must log via console.error (architecture's "no logger
    // library; console-only" rule). We assert the call happened, not the
    // exact arg shape — a future refactor that adds context to the log
    // (e.g., `console.error('upsert failed', err)`) is welcome and should
    // not break this test.
    expect(errorSpy).toHaveBeenCalled();
  });
});

describe("POST /api/progress — module surface (AC5)", () => {
  it("exports only POST (no GET/PUT/DELETE/PATCH/OPTIONS handlers)", () => {
    const exportedHandlers = ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS", "HEAD"].filter(
      (method) => Boolean((routeModule as Record<string, unknown>)[method]),
    );
    expect(exportedHandlers).toEqual(["POST"]);
  });

  it("imports only from @/lib/db/schemas and @/lib/db/progress-db", () => {
    const ROUTE_PATH = path.resolve(import.meta.dirname, "route.ts");
    const source = readFileSync(ROUTE_PATH, "utf8");
    const importLines = source.split("\n").filter((line) => line.trim().startsWith("import "));

    const ALLOWED = ["@/lib/db/schemas", "@/lib/db/progress-db"];
    for (const line of importLines) {
      const matched = ALLOWED.some((mod) => line.includes(`"${mod}"`));
      expect(matched, `unexpected import: ${line}`).toBe(true);
    }
  });

  it("does not declare a Server Action ('use server' directive)", () => {
    const ROUTE_PATH = path.resolve(import.meta.dirname, "route.ts");
    const source = readFileSync(ROUTE_PATH, "utf8");
    // Server Actions are marked by a `'use server'` directive at the top
    // of the file (single or double quotes). The handler is a Route Handler
    // per architecture's lock; the directive must be absent.
    expect(source).not.toMatch(/^\s*['"]use server['"]\s*;?\s*$/m);
  });
});
