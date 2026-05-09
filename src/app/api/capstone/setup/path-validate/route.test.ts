import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import { POST } from "./route";

const cleanups: string[] = [];
afterEach(() => {
  while (cleanups.length) {
    const d = cleanups.pop()!;
    rmSync(d, { recursive: true, force: true });
  }
});

function tmpDir(prefix: string): string {
  const d = mkdtempSync(path.join(tmpdir(), prefix));
  cleanups.push(d);
  return d;
}

function jsonReq(body: unknown): Request {
  return new Request("http://localhost/api/capstone/setup/path-validate", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/capstone/setup/path-validate decision tree", () => {
  it("ok-create when path does not exist", async () => {
    const base = tmpDir("pv-create-");
    const target = path.join(base, "does-not-exist-yet");
    const res = await POST(jsonReq({ path: target }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toMatchObject({ valid: true, status: "ok-create" });
  });

  it("ok-empty for an empty existing directory", async () => {
    const dir = tmpDir("pv-empty-");
    const res = await POST(jsonReq({ path: dir }));
    const body = await res.json();
    expect(body).toMatchObject({ valid: true, status: "ok-empty" });
  });

  it("warn-non-empty for a directory with files", async () => {
    const dir = tmpDir("pv-non-empty-");
    writeFileSync(path.join(dir, "README.md"), "x");
    const res = await POST(jsonReq({ path: dir }));
    const body = await res.json();
    expect(body).toMatchObject({
      valid: true,
      status: "warn-non-empty",
      requiresTypedConfirm: true,
    });
  });

  it("block-existing-bmad when _bmad child exists", async () => {
    const dir = tmpDir("pv-bmad-");
    mkdirSync(path.join(dir, "_bmad"));
    const res = await POST(jsonReq({ path: dir }));
    const body = await res.json();
    expect(body).toMatchObject({ valid: false, status: "block-existing-bmad" });
  });

  it("block-existing-git when .git child exists", async () => {
    const dir = tmpDir("pv-git-");
    mkdirSync(path.join(dir, ".git"));
    const res = await POST(jsonReq({ path: dir }));
    const body = await res.json();
    expect(body).toMatchObject({ valid: false, status: "block-existing-git" });
  });

  it("block-malformed when path is a file (not a dir)", async () => {
    const dir = tmpDir("pv-file-");
    const file = path.join(dir, "not-a-dir.txt");
    writeFileSync(file, "x");
    const res = await POST(jsonReq({ path: file }));
    const body = await res.json();
    expect(body).toMatchObject({ valid: false, status: "block-malformed" });
  });

  it("block-allowlist for /etc", async () => {
    const res = await POST(jsonReq({ path: "/etc" }));
    const body = await res.json();
    expect(body).toMatchObject({ valid: false, status: "block-allowlist" });
  });

  it("returns 400 on invalid body", async () => {
    const res = await POST(jsonReq({ path: "" }));
    expect(res.status).toBe(400);
  });
});
