import type { ToolAdapter } from "./types";

/**
 * Claude Code adapter (stub from Story 5.2; full implementation in Story 5.3).
 *
 * The manifest is real and consumed by Epic 6's wizard / Story 5.7's
 * chat-stream Route Handler. The imperative methods all throw — replaced
 * by Story 5.3.
 */
const claudeCodeAdapter: ToolAdapter = {
  manifest: {
    id: "claude-code",
    displayName: "Claude Code",
    cliBinary: "claude",
    minVersion: ">=2.1.0",
    docsUrl: "https://docs.claude.com/en/docs/claude-code",
    supportedOS: ["darwin", "linux"],
  },
  async detectInstalled(): Promise<boolean> {
    throw new Error("Adapter claude-code not yet implemented — see Story 5.3");
  },
  async detectAuthenticated(): Promise<boolean> {
    throw new Error("Adapter claude-code not yet implemented — see Story 5.3");
  },
  buildSpawnArgs(): { cmd: string; args: string[]; env?: NodeJS.ProcessEnv } {
    throw new Error("Adapter claude-code not yet implemented — see Story 5.3");
  },
  parseStreamChunk(): [] {
    throw new Error("Adapter claude-code not yet implemented — see Story 5.3");
  },
  formatUserMessage(): string {
    throw new Error("Adapter claude-code not yet implemented — see Story 5.3");
  },
  buildPrimer(): string {
    throw new Error("Adapter claude-code not yet implemented — see Story 5.3");
  },
};

export default claudeCodeAdapter;
