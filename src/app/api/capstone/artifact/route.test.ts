import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db/progress-db", () => ({
  getCapstoneTargetDir: vi.fn(),
}));

import { getCapstoneTargetDir } from "@/lib/db/progress-db";

import { GET } from "./route";

const targetMock = vi.mocked(getCapstoneTargetDir);

const cleanups: string[] = [];
afterEach(() => {
  while (cleanups.length) {
    const d = cleanups.pop()!;
    rmSync(d, { recursive: true, force: true });
  }
});

beforeEach(() => {
  targetMock.mockReset();
});

function mkChosenDir(): string {
  const root = mkdtempSync(path.join(tmpdir(), "art-"));
  cleanups.push(root);
  mkdirSync(path.join(root, "_bmad-output"), { recursive: true });
  return root;
}

function makeReq(query: Record<string, string>): Request {
  return new Request(
    `http://localhost/api/capstone/artifact?${new URLSearchParams(query).toString()}`,
    { method: "GET" },
  );
}

describe("GET /api/capstone/artifact", () => {
  it("returns 400 on invalid query", async () => {
    const res = await GET(makeReq({ session: "bad", phase: "brief" }));
    expect(res.status).toBe(400);
  });

  it("returns 404 when session has no chosen dir", async () => {
    targetMock.mockReturnValue(null);
    const res = await GET(
      makeReq({ session: "20260507T143022Z", phase: "brief" }),
    );
    expect(res.status).toBe(404);
  });

  it("returns ok:false / error: not-found when file is missing", async () => {
    const dir = mkChosenDir();
    targetMock.mockReturnValue(dir);
    const res = await GET(
      makeReq({ session: "20260507T143022Z", phase: "brief" }),
    );
    const body = await res.json();
    expect(body).toMatchObject({ ok: false, error: "not-found" });
  });

  it("reads the artifact file and returns content + size", async () => {
    const dir = mkChosenDir();
    const briefPath = path.join(dir, "_bmad-output", "brief.md");
    writeFileSync(briefPath, "# Brief\n\nHello\n");
    targetMock.mockReturnValue(dir);
    const res = await GET(
      makeReq({ session: "20260507T143022Z", phase: "brief" }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toMatchObject({
      ok: true,
      path: path.join("_bmad-output", "brief.md"),
    });
    expect(body.content).toContain("# Brief");
    expect(body.sizeBytes).toBeGreaterThan(0);
  });
});
