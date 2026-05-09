import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/capstone/adapters", () => ({
  getAdapterRegistry: vi.fn(),
}));

import { getAdapterRegistry } from "@/lib/capstone/adapters";
import type { ToolAdapter, ToolId } from "@/lib/capstone/adapters/types";

import { POST } from "./route";

const registryMock = vi.mocked(getAdapterRegistry);

function buildAdapter(installed: boolean, authed: boolean): ToolAdapter {
  return {
    manifest: {
      id: "claude-code",
      displayName: "Test",
      cliBinary: "test",
      minVersion: ">=0.0.0",
      docsUrl: "https://example.invalid",
      supportedOS: ["linux"],
    },
    async detectInstalled() {
      return installed;
    },
    async detectAuthenticated() {
      return authed;
    },
  };
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

function jsonReq(body: unknown): Request {
  return new Request("http://localhost/api/capstone/setup/tool-check", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  registryMock.mockReset();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("POST /api/capstone/setup/tool-check", () => {
  it("returns installed:true, authed:true on green path", async () => {
    setupRegistry(buildAdapter(true, true));
    const res = await POST(jsonReq({ tool: "claude-code" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toMatchObject({ ok: true, installed: true, authed: true });
  });

  it("skips auth probe when not installed (authed === null)", async () => {
    setupRegistry(buildAdapter(false, true));
    const res = await POST(jsonReq({ tool: "codex" }));
    const body = await res.json();
    expect(body).toMatchObject({ ok: true, installed: false, authed: null });
  });

  it("returns 400 for invalid tool id", async () => {
    setupRegistry(buildAdapter(true, true));
    const res = await POST(jsonReq({ tool: "bogus" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 for malformed body", async () => {
    setupRegistry(buildAdapter(true, true));
    const req = new Request("http://localhost/api/capstone/setup/tool-check", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "not json {",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("downgrades adapter throws to installed:false / authed:null (does not 500)", async () => {
    const adapter = buildAdapter(true, true);
    adapter.detectInstalled = async () => {
      throw new Error("boom");
    };
    setupRegistry(adapter);
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await POST(jsonReq({ tool: "claude-code" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toMatchObject({ installed: false, authed: null });
    expect(errSpy).toHaveBeenCalled();
  });
});
