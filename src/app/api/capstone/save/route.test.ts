import { readFileSync } from "node:fs";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db/progress-db", () => ({
  upsertProgress: vi.fn(),
  isCapstoneSessionActive: vi.fn(),
}));
vi.mock("@/lib/capstone/write-artifact", () => ({
  writeCapstoneArtifact: vi.fn(),
  CapstoneTraversalError: class CapstoneTraversalError extends Error {},
}));

import { isCapstoneSessionActive, upsertProgress } from "@/lib/db/progress-db";
import { writeCapstoneArtifact } from "@/lib/capstone/write-artifact";
import * as routeModule from "./route";
import { POST } from "./route";

const upsertSpy = upsertProgress as unknown as ReturnType<
  typeof vi.fn<(typeof import("@/lib/db/progress-db"))["upsertProgress"]>
>;
const activeSpy = isCapstoneSessionActive as unknown as ReturnType<
  typeof vi.fn<(typeof import("@/lib/db/progress-db"))["isCapstoneSessionActive"]>
>;
const writeSpy = writeCapstoneArtifact as unknown as ReturnType<
  typeof vi.fn<(typeof import("@/lib/capstone/write-artifact"))["writeCapstoneArtifact"]>
>;

function postRequest(body: unknown, opts: { raw?: boolean } = {}): Request {
  if (opts.raw) {
    return new Request("http://localhost/api/capstone/save", {
      method: "POST",
      body: body as BodyInit,
      headers: { "content-type": "application/json" },
    });
  }
  return new Request("http://localhost/api/capstone/save", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
}

const SESSION = "20260507T143022Z";
const STEP_FILE_ABS = path.resolve(
  process.cwd(),
  "_bmad-output",
  "capstone",
  SESSION,
  "brief.md",
);

describe("POST /api/capstone/save — happy path", () => {
  beforeEach(() => {
    upsertSpy.mockReset();
    activeSpy.mockReset();
    writeSpy.mockReset();
    activeSpy.mockReturnValue(true);
    writeSpy.mockResolvedValue({ path: STEP_FILE_ABS });
  });

  it("writes the file, upserts the row, and returns 200 with a repo-root-relative path", async () => {
    const res = await POST(
      postRequest({ session: SESSION, step: "brief", content: "# Brief\n\n…" }),
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { ok: boolean; path: string };
    expect(body.ok).toBe(true);
    expect(body.path).toBe(path.join("_bmad-output", "capstone", SESSION, "brief.md"));

    // AC5 explicitly defines the response path as repo-root-relative.
    // (Story 4.2 review patch.) These two assertions lock the contract
    // so a future refactor that drops `path.relative` and returns the
    // absolute path is caught — and a future env override that resolves
    // outside cwd would surface as a `..`-prefixed path that fails here.
    expect(path.isAbsolute(body.path)).toBe(false);
    expect(body.path.startsWith("..")).toBe(false);

    expect(writeSpy).toHaveBeenCalledTimes(1);
    expect(writeSpy).toHaveBeenCalledWith({
      session: SESSION,
      step: "brief",
      content: "# Brief\n\n…",
    });
    expect(upsertSpy).toHaveBeenCalledTimes(1);
    expect(upsertSpy).toHaveBeenCalledWith({
      kind: "capstone-step",
      id: `${SESSION}/brief`,
      completed: true,
    });
  });
});

describe("POST /api/capstone/save — session-active gate (AC6)", () => {
  beforeEach(() => {
    upsertSpy.mockReset();
    activeSpy.mockReset();
    writeSpy.mockReset();
  });

  it("returns 400 'Unknown or inactive session' when the active gate returns false", async () => {
    // `isCapstoneSessionActive` returns false for BOTH "row missing" AND
    // "row exists with completed_at IS NOT NULL" (Story 4.1's helper
    // tests cover both at the storage layer). The route trusts the
    // helper to discriminate; this test asserts only the route's
    // response shape when the gate denies — the missing-vs-completed
    // distinction is verified once at the helper layer, not duplicated
    // here. (Story 4.2 review patch: removed duplicate test.)
    activeSpy.mockReturnValue(false);

    const res = await POST(
      postRequest({ session: SESSION, step: "brief", content: "x" }),
    );
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({
      ok: false,
      error: "Unknown or inactive session",
    });
    expect(writeSpy).not.toHaveBeenCalled();
    expect(upsertSpy).not.toHaveBeenCalled();
  });
});

describe("POST /api/capstone/save — validation failures (AC7)", () => {
  beforeEach(() => {
    upsertSpy.mockReset();
    activeSpy.mockReset();
    writeSpy.mockReset();
    // The active check should NEVER run before validation passes;
    // wire it as throwing so a regression that calls it surfaces loudly.
    activeSpy.mockImplementation(() => {
      throw new Error("activeSpy should not be invoked before validation");
    });
  });

  it("rejects malformed JSON with 400 'Invalid request'", async () => {
    const res = await POST(postRequest("{not json", { raw: true }));
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe("Invalid request");
    expect(writeSpy).not.toHaveBeenCalled();
    expect(upsertSpy).not.toHaveBeenCalled();
  });

  it("rejects a malformed session id (full ISO with dashes/colons)", async () => {
    const res = await POST(
      postRequest({ session: "2026-05-07T14:30:22Z", step: "brief", content: "x" }),
    );
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe("Invalid request");
    expect(writeSpy).not.toHaveBeenCalled();
  });

  it("rejects an unknown step name", async () => {
    const res = await POST(
      postRequest({ session: SESSION, step: "foo", content: "x" }),
    );
    expect(res.status).toBe(400);
    expect(writeSpy).not.toHaveBeenCalled();
  });

  it("rejects a non-string content", async () => {
    const res = await POST(
      postRequest({ session: SESSION, step: "brief", content: 42 }),
    );
    expect(res.status).toBe(400);
    expect(writeSpy).not.toHaveBeenCalled();
  });

  it("rejects a missing session field", async () => {
    const res = await POST(postRequest({ step: "brief", content: "x" }));
    expect(res.status).toBe(400);
    const body = (await res.json()) as {
      error: string;
      details: { fieldErrors: Record<string, unknown> };
    };
    expect(body.error).toBe("Invalid request");
    expect(body.details.fieldErrors).toHaveProperty("session");
  });
});

describe("POST /api/capstone/save — filesystem error (AC8)", () => {
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    upsertSpy.mockReset();
    activeSpy.mockReset();
    writeSpy.mockReset();
    activeSpy.mockReturnValue(true);
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    errorSpy.mockRestore();
  });

  it("returns 500 'Internal error' when writeCapstoneArtifact throws AND does NOT upsert the row (ordering invariant)", async () => {
    writeSpy.mockRejectedValue(new Error("EACCES"));

    const res = await POST(
      postRequest({ session: SESSION, step: "brief", content: "x" }),
    );
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ ok: false, error: "Internal error" });
    // Critical: a failed file write must not leave a "step complete" row.
    expect(upsertSpy).not.toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalled();
  });

  it("returns 500 when upsertProgress throws AFTER a successful write (file is on disk; trainee retries; idempotent)", async () => {
    writeSpy.mockResolvedValue({ path: STEP_FILE_ABS });
    upsertSpy.mockImplementation(() => {
      throw new Error("simulated SQLite failure");
    });

    const res = await POST(
      postRequest({ session: SESSION, step: "brief", content: "x" }),
    );
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ ok: false, error: "Internal error" });
    expect(writeSpy).toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalled();
  });
});

describe("POST /api/capstone/save — module surface (AC9)", () => {
  it("exports only POST (no GET/PUT/DELETE/PATCH/OPTIONS handlers)", () => {
    const exportedHandlers = ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS", "HEAD"].filter(
      (method) => Boolean((routeModule as Record<string, unknown>)[method]),
    );
    expect(exportedHandlers).toEqual(["POST"]);
  });

  it("imports only from @/lib/db/progress-db, @/lib/db/schemas, @/lib/capstone/write-artifact, and node:path", () => {
    const ROUTE_PATH = path.resolve(import.meta.dirname, "route.ts");
    const source = readFileSync(ROUTE_PATH, "utf8");
    const importLines = source.split("\n").filter((line) => line.trim().startsWith("import "));

    const ALLOWED = [
      "@/lib/db/progress-db",
      "@/lib/db/schemas",
      "@/lib/capstone/write-artifact",
      "node:path",
    ];
    for (const line of importLines) {
      const matched = ALLOWED.some((mod) => line.includes(`"${mod}"`));
      expect(matched, `unexpected import: ${line}`).toBe(true);
    }
  });

  it("does not declare a Server Action ('use server' directive)", () => {
    const ROUTE_PATH = path.resolve(import.meta.dirname, "route.ts");
    const source = readFileSync(ROUTE_PATH, "utf8");
    expect(source).not.toMatch(/^\s*['"]use server['"]\s*;?\s*$/m);
  });

  it("does not import from next/server (uses Web-standard Response)", () => {
    const ROUTE_PATH = path.resolve(import.meta.dirname, "route.ts");
    const source = readFileSync(ROUTE_PATH, "utf8");
    expect(source).not.toMatch(/from\s+["']next\/server["']/);
  });
});
