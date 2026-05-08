import { readFileSync } from "node:fs";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock the DB layer BEFORE importing the route — Vitest hoists vi.mock,
// but doing it explicitly at the top makes the contract obvious.
vi.mock("@/lib/db/progress-db", () => ({
  upsertProgress: vi.fn(),
  markCapstoneSessionComplete: vi.fn(),
  getCapstoneSessionById: vi.fn(),
}));

import {
  getCapstoneSessionById,
  markCapstoneSessionComplete,
  upsertProgress,
} from "@/lib/db/progress-db";
import * as routeModule from "./route";
import { POST } from "./route";

// Strongly-typed spy so a future change to upsertProgress's signature
// would fail the type-check rather than silently passing the test.
const upsertSpy = upsertProgress as unknown as ReturnType<
  typeof vi.fn<(typeof import("@/lib/db/progress-db"))["upsertProgress"]>
>;
const markCompleteSpy = markCapstoneSessionComplete as unknown as ReturnType<
  typeof vi.fn<(typeof import("@/lib/db/progress-db"))["markCapstoneSessionComplete"]>
>;
const getByIdSpy = getCapstoneSessionById as unknown as ReturnType<
  typeof vi.fn<(typeof import("@/lib/db/progress-db"))["getCapstoneSessionById"]>
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
    markCompleteSpy.mockReset();
    getByIdSpy.mockReset();
    getByIdSpy.mockReturnValue(null);
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
    // Story 4.4 review patch: lesson/lab/start-session should NEVER touch
    // markCompleteSpy. A future bug routing them through the helper would
    // be caught here.
    expect(markCompleteSpy).not.toHaveBeenCalled();
  });

  it("upserts a lab mark-incomplete and returns 200", async () => {
    const res = await POST(postRequest({ kind: "lab", id: "solo", completed: false }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(upsertSpy).toHaveBeenCalledWith({ kind: "lab", id: "solo", completed: false });
    expect(markCompleteSpy).not.toHaveBeenCalled();
  });

  it("upserts an active capstone-session row (Story 4.1 — start a session, no existing row)", async () => {
    getByIdSpy.mockReturnValue(null); // no existing row
    const res = await POST(
      postRequest({ kind: "capstone-session", id: "20260507T143022Z", completed: false }),
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(upsertSpy).toHaveBeenCalledWith({
      kind: "capstone-session",
      id: "20260507T143022Z",
      completed: false,
    });
    expect(markCompleteSpy).not.toHaveBeenCalled();
  });

  it("Story 4.4: start-session against an existing ACTIVE row is allowed (idempotent retry)", async () => {
    // Existing active row (completedAt: null) — re-starting is harmless.
    getByIdSpy.mockReturnValue({ id: "20260507T143022Z", completedAt: null });
    const res = await POST(
      postRequest({ kind: "capstone-session", id: "20260507T143022Z", completed: false }),
    );
    expect(res.status).toBe(200);
    expect(upsertSpy).toHaveBeenCalled();
  });

  it("Story 4.4: capstone-session + completed:true routes through markCapstoneSessionComplete (active row)", async () => {
    markCompleteSpy.mockReturnValue({ updated: true });

    const res = await POST(
      postRequest({ kind: "capstone-session", id: "20260507T143022Z", completed: true }),
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(markCompleteSpy).toHaveBeenCalledTimes(1);
    expect(markCompleteSpy).toHaveBeenCalledWith("20260507T143022Z");
    // Critical: plain upsert NOT used for this kind+completed combo.
    expect(upsertSpy).not.toHaveBeenCalled();
  });

  it("Story 4.4: capstone-session + completed:true on a MISSING row → 400 'Cannot mark...'", async () => {
    markCompleteSpy.mockReturnValue({ updated: false });

    const res = await POST(
      postRequest({ kind: "capstone-session", id: "20260507T143022Z", completed: true }),
    );
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({
      ok: false,
      error: "Cannot mark inactive or unknown session complete",
    });
    expect(markCompleteSpy).toHaveBeenCalledTimes(1);
    expect(upsertSpy).not.toHaveBeenCalled();
  });

  it("Story 4.4: capstone-session + completed:true on an ALREADY-COMPLETE row → 400 'Cannot mark...'", async () => {
    // markCompleteSpy returns {updated:false} for both missing AND
    // already-complete rows; this test asserts the same response shape
    // for both paths separately (AC5 enumerated both cases).
    markCompleteSpy.mockReturnValue({ updated: false });

    const res = await POST(
      postRequest({ kind: "capstone-session", id: "20260507T143022Z", completed: true }),
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe(
      "Cannot mark inactive or unknown session complete",
    );
    expect(upsertSpy).not.toHaveBeenCalled();
  });

  it("Story 4.4: start-session against an ALREADY-COMPLETE row → 400 (resurrection guard)", async () => {
    // Same-second resurrection edge case: existing row is complete; a
    // start POST must NOT flip completed_at back to NULL.
    getByIdSpy.mockReturnValue({
      id: "20260507T143022Z",
      completedAt: "2026-05-07T14:30:22Z",
    });

    const res = await POST(
      postRequest({ kind: "capstone-session", id: "20260507T143022Z", completed: false }),
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe(
      "Session id already complete; please retry to get a fresh id",
    );
    expect(upsertSpy).not.toHaveBeenCalled();
    expect(markCompleteSpy).not.toHaveBeenCalled();
  });
});

describe("POST /api/progress — validation failures (400)", () => {
  beforeEach(() => {
    upsertSpy.mockReset();
    markCompleteSpy.mockReset();
    getByIdSpy.mockReset();
    getByIdSpy.mockReturnValue(null);
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

  it("rejects an unknown kind value", async () => {
    const res = await POST(postRequest({ kind: "bogus", id: "x", completed: true }));
    expect(res.status).toBe(400);
    expect(upsertSpy).not.toHaveBeenCalled();
  });

  it("rejects a malformed capstone-session id (not compact UTC)", async () => {
    // Story 4.1 widens the kind enum but enforces the compact-UTC format.
    // A full ISO-8601 string like '2026-05-07T14:30:22Z' fails the regex.
    const res = await POST(
      postRequest({ kind: "capstone-session", id: "2026-05-07T14:30:22Z", completed: true }),
    );
    expect(res.status).toBe(400);
    const body = (await res.json()) as { ok: boolean; error: string };
    expect(body.error).toBe("Invalid request");
    expect(upsertSpy).not.toHaveBeenCalled();
  });

  it("rejects a malformed capstone-step id (unknown step name)", async () => {
    const res = await POST(
      postRequest({ kind: "capstone-step", id: "20260507T143022Z/foo", completed: true }),
    );
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
