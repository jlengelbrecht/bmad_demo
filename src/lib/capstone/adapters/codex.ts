import type { ToolAdapter } from "./types";

/**
 * Codex adapter (stub from Story 5.2; full implementation in Story 5.4).
 */
const codexAdapter: ToolAdapter = {
  manifest: {
    id: "codex",
    displayName: "Codex (OpenAI)",
    cliBinary: "codex",
    minVersion: ">=0.50.0",
    docsUrl: "https://developers.openai.com/codex/cli",
    supportedOS: ["darwin", "linux"],
  },
  async detectInstalled(): Promise<boolean> {
    throw new Error("Adapter codex not yet implemented — see Story 5.4");
  },
  async detectAuthenticated(): Promise<boolean> {
    throw new Error("Adapter codex not yet implemented — see Story 5.4");
  },
  buildSpawnArgs(): { cmd: string; args: string[]; env?: NodeJS.ProcessEnv } {
    throw new Error("Adapter codex not yet implemented — see Story 5.4");
  },
  parseStreamChunk(): [] {
    throw new Error("Adapter codex not yet implemented — see Story 5.4");
  },
  formatUserMessage(): string {
    throw new Error("Adapter codex not yet implemented — see Story 5.4");
  },
  buildPrimer(): string {
    throw new Error("Adapter codex not yet implemented — see Story 5.4");
  },
};

export default codexAdapter;
