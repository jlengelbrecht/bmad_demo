import type { ToolAdapter } from "./types";

/**
 * GitHub Copilot CLI adapter (stub from Story 5.2; full implementation in Story 5.5).
 */
const githubCopilotAdapter: ToolAdapter = {
  manifest: {
    id: "github-copilot",
    displayName: "GitHub Copilot CLI",
    cliBinary: "copilot",
    minVersion: ">=1.0.42",
    docsUrl: "https://docs.github.com/en/copilot/concepts/agents/about-copilot-cli",
    supportedOS: ["darwin", "linux"],
  },
  async detectInstalled(): Promise<boolean> {
    throw new Error(
      "Adapter github-copilot not yet implemented — see Story 5.5",
    );
  },
  async detectAuthenticated(): Promise<boolean> {
    throw new Error(
      "Adapter github-copilot not yet implemented — see Story 5.5",
    );
  },
  buildSpawnArgs(): { cmd: string; args: string[]; env?: NodeJS.ProcessEnv } {
    throw new Error(
      "Adapter github-copilot not yet implemented — see Story 5.5",
    );
  },
  parseStreamChunk(): [] {
    throw new Error(
      "Adapter github-copilot not yet implemented — see Story 5.5",
    );
  },
  formatUserMessage(): string {
    throw new Error(
      "Adapter github-copilot not yet implemented — see Story 5.5",
    );
  },
  buildPrimer(): string {
    throw new Error(
      "Adapter github-copilot not yet implemented — see Story 5.5",
    );
  },
};

export default githubCopilotAdapter;
