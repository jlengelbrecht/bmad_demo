import type { ToolId } from "./types";

/**
 * One-line install hints rendered next to a "Not on PATH" badge.
 * Per FR-3.4 lock: the portal does NOT auto-install third-party AI
 * tools — these are instructions for the trainee.
 */
export const INSTALL_HINTS: Record<ToolId, string> = {
  "claude-code":
    "Install via 'npm install -g @anthropic-ai/claude-code' or download from the docs link.",
  codex:
    "Install via 'npm install -g @openai/codex' or download from the docs link.",
  "github-copilot":
    "Install via 'npm install -g @github/copilot' (requires an active GitHub Copilot subscription).",
};

/**
 * One-line auth hints rendered next to a "Sign in needed" badge.
 */
export const AUTH_HINTS: Record<ToolId, string> = {
  "claude-code":
    "Set ANTHROPIC_API_KEY in your shell environment, then re-check.",
  codex: "Set OPENAI_API_KEY in your shell environment, then re-check.",
  "github-copilot":
    "Run 'gh auth login' (with the 'copilot' scope), then re-check. Requires an active GitHub Copilot subscription.",
};
