import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db/progress-db", () => ({
  getCapstoneTargetDir: vi.fn(),
  upsertProgress: vi.fn(),
}));

import { getCapstoneTargetDir, upsertProgress } from "@/lib/db/progress-db";

import { POST } from "./route";

const targetMock = vi.mocked(getCapstoneTargetDir);
const upsertMock = vi.mocked(upsertProgress);

const cleanups: string[] = [];
afterEach(() => {
  while (cleanups.length) rmSync(cleanups.pop()!, { recursive: true, force: true });
});

beforeEach(() => {
  targetMock.mockReset();
  upsertMock.mockReset();
});

function mkChosen(): string {
  const dir = mkdtempSync(path.join(tmpdir(), "pdg-"));
  cleanups.push(dir);
  mkdirSync(path.join(dir, "_bmad-output", "planning-artifacts"), { recursive: true });
  return dir;
}

function jsonReq(body: unknown): Request {
  return new Request("http://localhost/api/capstone/phase-done", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

const VALID_BRIEF = `# Product Brief — demo

## Customer
The lead engineer at a small product team.

## Problem
Context is lost across PR cycles regularly across the team.

## Solution
A shared portal every AI tool reads first.

## Success Criteria
A team ships a story with all cohorts aligned on the same brief.

## Scope
In: portal + lessons. Out: cloud, multi-tenant.
`;

describe("POST /api/capstone/phase-done", () => {
  it("returns 400 on invalid body", async () => {
    const res = await POST(jsonReq({ sessionId: "bad" }));
    expect(res.status).toBe(400);
  });

  it("returns 404 when the session has no chosen dir", async () => {
    targetMock.mockReturnValue(null);
    const res = await POST(
      jsonReq({
        sessionId: "20260507T143022Z",
        phase: "brief",
        acknowledged: true,
      }),
    );
    expect(res.status).toBe(404);
  });

  it("returns valid:false / advanced:false when artifact is missing", async () => {
    const dir = mkChosen();
    targetMock.mockReturnValue(dir);
    const res = await POST(
      jsonReq({
        sessionId: "20260507T143022Z",
        phase: "brief",
        acknowledged: true,
      }),
    );
    const body = await res.json();
    expect(body).toMatchObject({ valid: false, advanced: false });
    expect(body.validation.artifactExists).toBe(false);
  });

  it("advances when artifact is well-formed and acknowledged", async () => {
    const dir = mkChosen();
    writeFileSync(
      path.join(dir, "_bmad-output", "planning-artifacts", "brief.md"),
      VALID_BRIEF,
    );
    targetMock.mockReturnValue(dir);
    const res = await POST(
      jsonReq({
        sessionId: "20260507T143022Z",
        phase: "brief",
        acknowledged: true,
      }),
    );
    const body = await res.json();
    expect(body).toMatchObject({ valid: true, advanced: true });
    expect(upsertMock).toHaveBeenCalledOnce();
    expect(upsertMock).toHaveBeenCalledWith(
      expect.objectContaining({ kind: "capstone-step", completed: true }),
    );
  });

  it("dryRun does NOT advance even when valid + acknowledged", async () => {
    const dir = mkChosen();
    writeFileSync(
      path.join(dir, "_bmad-output", "planning-artifacts", "brief.md"),
      VALID_BRIEF,
    );
    targetMock.mockReturnValue(dir);
    const res = await POST(
      jsonReq({
        sessionId: "20260507T143022Z",
        phase: "brief",
        acknowledged: true,
        dryRun: true,
      }),
    );
    const body = await res.json();
    expect(body).toMatchObject({ valid: true, advanced: false });
    expect(upsertMock).not.toHaveBeenCalled();
  });

  it("does NOT advance when acknowledged is false (even if valid)", async () => {
    const dir = mkChosen();
    writeFileSync(
      path.join(dir, "_bmad-output", "planning-artifacts", "brief.md"),
      VALID_BRIEF,
    );
    targetMock.mockReturnValue(dir);
    const res = await POST(
      jsonReq({
        sessionId: "20260507T143022Z",
        phase: "brief",
        acknowledged: false,
      }),
    );
    const body = await res.json();
    expect(body).toMatchObject({ valid: true, advanced: false });
  });
});
