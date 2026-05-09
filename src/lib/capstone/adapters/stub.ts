import type {
  CapstonePhase,
  ChatSpawnOpts,
  ChatStreamEvent,
  ToolAdapter,
} from "./types";

/**
 * Test-only stub adapter. NOT registered by `getAdapterRegistry()` —
 * it's the spawn-side substitution mechanism for Vitest unit tests
 * and (when wired via `CAPSTONE_USE_STUB_ADAPTER=1`) Playwright e2e.
 *
 * `buildSpawnArgs` returns a `node -e <inline>` command that emits a
 * canned NDJSON sequence simulating one chat turn. `parseStreamChunk`
 * decodes the same shape into ChatStreamEvent values. Together: a
 * deterministic, no-third-party-binary chat round-trip for AC9.
 */

const CANNED_SCRIPT = `
const lines = [
  { type: "system/init", session_id: "stub-session-123" },
  { type: "assistant/content_block_delta", delta: { text: "Hello " } },
  { type: "assistant/content_block_delta", delta: { text: "trainee." } },
  { type: "assistant/message_stop" }
];
for (const l of lines) process.stdout.write(JSON.stringify(l) + "\\n");
`;

const stubAdapter: ToolAdapter = {
  manifest: {
    id: "claude-code",
    displayName: "Stub (test only)",
    cliBinary: "node",
    minVersion: ">=0.0.0",
    docsUrl: "https://example.invalid/stub",
    supportedOS: ["darwin", "linux"],
  },
  async detectInstalled(): Promise<boolean> {
    return true;
  },
  async detectAuthenticated(): Promise<boolean> {
    return true;
  },
  buildSpawnArgs(_opts: ChatSpawnOpts): {
    cmd: string;
    args: string[];
    env?: NodeJS.ProcessEnv;
  } {
    void _opts;
    return {
      cmd: process.execPath,
      args: ["-e", CANNED_SCRIPT],
      env: { ...process.env },
    };
  },
  parseStreamChunk(raw: string): ChatStreamEvent[] {
    let parsed: { type?: string; session_id?: string; delta?: { text?: string } };
    try {
      parsed = JSON.parse(raw) as typeof parsed;
    } catch {
      return [{ kind: "error", message: `stub: malformed line: ${raw.slice(0, 80)}` }];
    }
    if (parsed.type === "system/init") {
      return [{ kind: "session-init", sessionId: parsed.session_id ?? "" }];
    }
    if (parsed.type === "assistant/content_block_delta") {
      return [{ kind: "message-delta", text: parsed.delta?.text ?? "" }];
    }
    if (parsed.type === "assistant/message_stop") {
      return [{ kind: "message-end" }];
    }
    return [];
  },
  formatUserMessage(text: string): string {
    return text + "\n";
  },
  buildPrimer(_phase: CapstonePhase): string {
    void _phase;
    return "# Stub primer\n";
  },
};

export function getStubAdapter(): ToolAdapter {
  return stubAdapter;
}
