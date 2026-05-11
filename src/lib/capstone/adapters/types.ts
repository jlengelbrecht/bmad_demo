/**
 * Type-only module: the AI Tool Abstraction Layer contract.
 *
 * This file has zero runtime exports — `import * as Types from './types'`
 * yields an empty object. Pulled into adapter implementations and
 * consumers (registry, tool-pick page, chat-phase pages).
 *
 * v2 (post-PTY rewrite): the adapter surface is intentionally narrow —
 * just static manifest + install / auth detection. Per-turn argv
 * construction, stdout parsing, and stdin formatting are gone because
 * the chat-phase page now spawns the AI tool interactively in a PTY
 * (see `src/lib/capstone/phases/launch-commands.ts` for launch shape)
 * rather than driving it as a non-interactive `--print` subprocess.
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

/** The eight rebuilt-capstone phases that drive primer + chat behavior. */
export type CapstonePhase =
  | "brief"
  | "prd"
  | "architecture"
  | "epics-and-stories"
  | "implementation-readiness"
  | "sprint-planning"
  | "dev-story-1.1"
  | "governance";

/** The contract every adapter implements. */
export interface ToolAdapter {
  /** Static manifest. */
  manifest: ToolManifest;
  /** Sniff `$PATH` and run `--version` to verify the binary is installed. */
  detectInstalled(): Promise<boolean>;
  /** Tool-specific authenticated-status probe. */
  detectAuthenticated(): Promise<boolean>;
}
