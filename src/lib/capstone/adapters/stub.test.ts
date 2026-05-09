import { describe, expect, it } from "vitest";

import { getStubAdapter } from "./stub";
import { getAdapterRegistry } from "./index";

describe("stub adapter", () => {
  const stub = getStubAdapter();

  it("is NOT registered by getAdapterRegistry (test-only)", () => {
    const reg = getAdapterRegistry();
    expect(reg.size).toBe(3);
    // Stub manifest reuses 'claude-code' id; the registered claude-code
    // adapter is the real one (Story 5.3), not the stub.
    const realClaudeCode = reg.get("claude-code");
    expect(realClaudeCode).not.toBe(stub);
    expect(realClaudeCode?.manifest.displayName).toBe("Claude Code");
    expect(stub.manifest.displayName).toBe("Stub (test only)");
  });

  it("detectInstalled / detectAuthenticated always return true", async () => {
    expect(await stub.detectInstalled()).toBe(true);
    expect(await stub.detectAuthenticated()).toBe(true);
  });

  it("buildSpawnArgs returns a `node -e <inline>` command", () => {
    const out = stub.buildSpawnArgs({
      chosenDir: "/tmp/x",
      sessionId: "",
      primerPath: "/tmp/p",
      userMessage: "hi",
      phase: "brief",
    });
    expect(out.cmd).toBe(process.execPath);
    expect(out.args[0]).toBe("-e");
    expect(out.args[1]).toContain("system/init");
  });

  it("parseStreamChunk decodes the canned NDJSON sequence", () => {
    const events = [
      { type: "system/init", session_id: "stub-session-123" },
      { type: "assistant/content_block_delta", delta: { text: "Hello " } },
      { type: "assistant/content_block_delta", delta: { text: "trainee." } },
      { type: "assistant/message_stop" },
    ];
    const decoded = events.flatMap((e) => stub.parseStreamChunk(JSON.stringify(e)));
    expect(decoded).toEqual([
      { kind: "session-init", sessionId: "stub-session-123" },
      { kind: "message-delta", text: "Hello " },
      { kind: "message-delta", text: "trainee." },
      { kind: "message-end" },
    ]);
  });

  it("buildPrimer returns the canned primer string", () => {
    expect(stub.buildPrimer("brief")).toBe("# Stub primer\n");
  });

  it("formatUserMessage returns text + '\\n'", () => {
    expect(stub.formatUserMessage("hi")).toBe("hi\n");
  });
});
