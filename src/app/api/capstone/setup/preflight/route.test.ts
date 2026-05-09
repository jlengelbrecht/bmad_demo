import { readFileSync } from "node:fs";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/capstone/preflight/checks", () => ({
  runPreflightChecks: vi.fn(),
}));

import { runPreflightChecks } from "@/lib/capstone/preflight/checks";

import { POST } from "./route";

const runMock = vi.mocked(runPreflightChecks);

beforeEach(() => {
  runMock.mockReset();
});

afterEach(() => {
  vi.restoreAllMocks();
});

function jsonReq(body: unknown): Request {
  return new Request("http://localhost/api/capstone/setup/preflight", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/capstone/setup/preflight", () => {
  it("returns 200 with all-green response when probe yields all-green", async () => {
    runMock.mockResolvedValue({
      checks: [
        { name: "node", status: "green", actualVersion: "22.1.0", requiredVersion: ">=20.0.0" },
        { name: "git", status: "green", actualVersion: "2.45.0", requiredVersion: ">=2.30.0" },
        { name: "npx", status: "green", actualVersion: "10.8.2", requiredVersion: ">=10.0.0" },
      ],
      allGreen: true,
    });
    const res = await POST(jsonReq({}));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toMatchObject({ ok: true, allGreen: true });
    expect(body.checks).toHaveLength(3);
  });

  it("accepts an empty body (no JSON)", async () => {
    runMock.mockResolvedValue({ checks: [], allGreen: true });
    const req = new Request("http://localhost/api/capstone/setup/preflight", {
      method: "POST",
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
  });

  it("returns 400 with details for unknown fields (strict schema)", async () => {
    const res = await POST(jsonReq({ foo: "bar" }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.error).toBe("Invalid request");
    expect(body.details).toBeDefined();
  });

  it("returns 400 when body is not valid JSON", async () => {
    const req = new Request("http://localhost/api/capstone/setup/preflight", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{not json",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 500 with safe error envelope when the probe throws", async () => {
    runMock.mockRejectedValue(new Error("boom"));
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await POST(jsonReq({}));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body).toMatchObject({ ok: false, error: "Internal error" });
    expect(errSpy).toHaveBeenCalled();
  });
});

describe("POST /api/capstone/setup/preflight — module surface", () => {
  it("exports only POST (no GET / PUT / PATCH / DELETE)", async () => {
    const mod = await import("./route");
    expect(Object.keys(mod).sort()).toEqual(["POST"]);
  });

  it("does not import next/headers, next/cookies, or NextRequest from next/server", () => {
    const src = readFileSync(
      path.resolve(import.meta.dirname, "route.ts"),
      "utf8",
    );
    expect(src).not.toMatch(/from ["']next\/headers["']/);
    expect(src).not.toMatch(/from ["']next\/cookies["']/);
    expect(src).not.toMatch(/NextRequest/);
  });
});
