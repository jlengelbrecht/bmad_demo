import claudeCodeAdapter from "./claude-code";
import codexAdapter from "./codex";
import githubCopilotAdapter from "./github-copilot";
import type { ToolAdapter, ToolId } from "./types";

let _registry: Map<ToolId, ToolAdapter> | null = null;

/**
 * Returns the singleton adapter registry. The Map is built lazily on
 * first call and re-imports return the same instance.
 */
export function getAdapterRegistry(): Map<ToolId, ToolAdapter> {
  if (_registry === null) {
    _registry = new Map<ToolId, ToolAdapter>([
      [claudeCodeAdapter.manifest.id, claudeCodeAdapter],
      [codexAdapter.manifest.id, codexAdapter],
      [githubCopilotAdapter.manifest.id, githubCopilotAdapter],
    ]);
  }
  return _registry;
}

/**
 * Looks up an adapter by id. Throws when the id is not registered.
 *
 * Defensive guard for runtime values that bypass TS narrowing (e.g.,
 * a string parsed from a URL or DB row).
 */
export function getAdapterById(id: ToolId): ToolAdapter {
  const adapter = getAdapterRegistry().get(id);
  if (!adapter) {
    throw new Error(
      `Unknown tool id: ${id} — registered ids: claude-code, codex, github-copilot`,
    );
  }
  return adapter;
}
