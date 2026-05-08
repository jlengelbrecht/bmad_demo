import { readFileSync } from "node:fs";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock the DB layer BEFORE importing the route — Vitest hoists vi.mock,
// but doing it explicitly at the top makes the contract obvious.
vi.mock("@/lib/db/progress-db", () => ({
  upsertProgress: vi.fn(),
}));

import { upsertProgress } from "@/lib/db/progress-db";
import { POST } from "./route";

const upsertSpy = upsertProgress as ReturnType<typeof vi.fn>;

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

  it("returns 500 with no stack-trace leakage when upsertProgress throws", async () => {
    const dbError = new Error("simulated SQLite failure");
    upsertSpy.mockImplementation(() => {
      throw dbError;
    });

    const res = await POST(postRequest({ kind: "lesson", id: "lesson-1", completed: true }));
    expect(res.status).toBe(500);
    const text = await res.text();
    expect(JSON.parse(text)).toEqual({ ok: false, error: "Internal error" });
    // Body must not leak the error message or stack.
    expect(text).not.toContain("simulated SQLite failure");
    expect(text).not.toContain("at ");

    // The handler must log the error via console.error.
    expect(errorSpy).toHaveBeenCalledTimes(1);
    expect(errorSpy).toHaveBeenCalledWith(dbError);
  });
});

describe("POST /api/progress — import discipline (AC5)", () => {
  it("imports only from @/lib/db/schemas and @/lib/db/progress-db", () => {
    const ROUTE_PATH = path.resolve(import.meta.dirname, "route.ts");
    const source = readFileSync(ROUTE_PATH, "utf8");
    const importLines = source.split("\n").filter((line) => line.trim().startsWith("import "));

    // Every import must reference one of the allowed module paths.
    const ALLOWED = ["@/lib/db/schemas", "@/lib/db/progress-db"];
    for (const line of importLines) {
      const matched = ALLOWED.some((mod) => line.includes(`"${mod}"`));
      expect(matched, `unexpected import: ${line}`).toBe(true);
    }
  });

  it("does not import from next/server (no Server Action / no NextResponse)", () => {
    const ROUTE_PATH = path.resolve(import.meta.dirname, "route.ts");
    const source = readFileSync(ROUTE_PATH, "utf8");
    expect(source).not.toContain("next/server");
    expect(source).not.toContain("'use server'");
  });
});
