/**
 * Type-only module: the AI Tool Abstraction Layer contract.
 *
 * This file has zero runtime exports — `import * as Types from './types'`
 * yields an empty object. Pulled into adapter implementations and
 * consumers (registry, chat-stream Route Handler, setup wizard).
 *
 * Defensible deviation from architecture's interface:
 *   `buildSpawnArgs` returns `{ cmd, args, env? }` rather than `string[]`.
 *   Adapters need to control both the binary path AND tool-specific env
 *   (`ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `GH_TOKEN`); returning argv
 *   only would force `process.env` mutation (purity violation, test-
 *   isolation breakage). Documented in architecture §"Capstone Runtime
 *   → AI Tool Abstraction Layer" via Story 10.1b's drift fix.
 *
 * `ChatStreamEvent` is a discriminated union mapped to FR-3.17 (anti-
 * magic chat — tool calls visible). Tool-agnostic; tools that lack a
 * native tool-call surface (e.g., Copilot CLI plain-text streams) emit
 * only `message-delta` + `message-end`.
 */

/** Three v1 tool ids. Widened in v1.1 if/when OpenCode or Gemini land. */
export type ToolId = "claude-code" | "codex" | "github-copilot";

/** Static facts about a tool — queryable without running code. */
export interface ToolManifest {
  /** Tool id; matches the discriminator in {@link ToolId}. */
  id: ToolId;
  /** Trainee-visible label rendered in the wizard. */
  displayName: string;
  /** Binary name as found on `$PATH` (e.g., `'claude'`, `'codex'`, `'copilot'`). */
  cliBinary: string;
  /** Semver range describing the minimum compatible version (e.g., `'>=2.1.0'`). */
  minVersion: string;
  /** Documentation URL surfaced when the wizard tells a trainee to install/upgrade. */
  docsUrl: string;
  /** OS targets the v1 adapter supports. */
  supportedOS: ("darwin" | "linux")[];
}

/** The six rebuilt-capstone phases that drive primer + chat behavior. */
export type CapstonePhase =
  | "brief"
  | "prd"
  | "architecture"
  | "epics-and-stories"
  | "adr"
  | "dev-story-1.1";

/** Inputs to a per-turn chat-subprocess spawn. */
export interface ChatSpawnOpts {
  /** Trainee's chosen target directory (CHOSEN_DIR). */
  chosenDir: string;
  /** Tool-native session id captured from the first turn (or `''` on the first turn). */
  sessionId: string;
  /** Absolute path to the per-phase primer markdown file. */
  primerPath: string;
  /** The trainee's typed message for this turn. */
  userMessage: string;
  /** The phase the chat subprocess runs in. */
  phase: CapstonePhase;
}

/**
 * Tool-agnostic stream events parsed by the adapter from the
 * subprocess's stdout. The chat-stream Route Handler forwards these
 * verbatim to the browser as SSE.
 */
export type ChatStreamEvent =
  | { kind: "session-init"; sessionId: string }
  | { kind: "message-delta"; text: string }
  | { kind: "tool-call"; description: string }
  | { kind: "message-end" }
  | { kind: "error"; message: string };

/** The contract every adapter implements. */
export interface ToolAdapter {
  /** Static manifest. */
  manifest: ToolManifest;
  /** Sniff `$PATH` and run `--version` to verify the binary is installed. */
  detectInstalled(): Promise<boolean>;
  /** Tool-specific authenticated-status probe. */
  detectAuthenticated(): Promise<boolean>;
  /** Build the spawn argv + env for one chat turn. */
  buildSpawnArgs(opts: ChatSpawnOpts): {
    cmd: string;
    args: string[];
    env?: NodeJS.ProcessEnv;
  };
  /** Parse one raw stdout chunk into zero-or-more {@link ChatStreamEvent}s. */
  parseStreamChunk(raw: string): ChatStreamEvent[];
  /** Format a user message into the tool's stdin shape. */
  formatUserMessage(text: string): string;
  /** Build the BMAD primer text for a phase (sent via `--system-prompt-file` or as leading user message). */
  buildPrimer(phase: CapstonePhase): string;
}
