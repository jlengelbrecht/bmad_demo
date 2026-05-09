import { homedir } from "node:os";

import { runStreaming } from "../subprocess/run-streaming";
import type { ToolAdapter } from "./types";

// See claude-code.ts VERSION_BANNER_RE for the rationale on matching
// any semver in the first stdout line rather than a binary-name-prefixed
// shape. Real `codex --version` output format varies by CLI version.
const VERSION_BANNER_RE = /(\d+)\.(\d+)\.(\d+)/;
const AUTH_PROBE_TIMEOUT_MS = 15_000;

function compareSemverAtLeast(observed: string, range: string): boolean {
  const m = /^>=\s*(\d+)\.(\d+)\.(\d+)/.exec(range.trim());
  if (!m) return true;
  const want = [Number(m[1]), Number(m[2]), Number(m[3])];
  const got = observed.split(".").map(Number);
  for (let i = 0; i < 3; i++) {
    const a = got[i] ?? 0;
    const b = want[i];
    if (a > b) return true;
    if (a < b) return false;
  }
  return true;
}

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
    let version: string | null = null;
    let exitCode: number | null = null;
    try {
      for await (const ev of runStreaming({
        cmd: this.manifest.cliBinary,
        args: ["--version"],
        cwd: homedir(),
      })) {
        if (ev.kind === "stdout-line" && version === null) {
          const m = VERSION_BANNER_RE.exec(ev.text);
          if (m) version = `${m[1]}.${m[2]}.${m[3]}`;
        } else if (ev.kind === "exit") {
          exitCode = ev.code;
        }
      }
    } catch (err) {
      // ENOENT → binary not on PATH. Surface anything else (parse / regex
      // / spawn-config bugs) instead of silently rendering ✗.
      if ((err as NodeJS.ErrnoException | undefined)?.code === "ENOENT") {
        return false;
      }
      console.error("[codex adapter] detectInstalled error:", err);
      throw err;
    }
    if (exitCode !== 0 || !version) return false;
    if (!compareSemverAtLeast(version, this.manifest.minVersion)) {
      console.warn(
        `[codex adapter] version ${version} is below manifest.minVersion ${this.manifest.minVersion} (TM-6: tool-version drift)`,
      );
      return false;
    }
    return true;
  },

  async detectAuthenticated(): Promise<boolean> {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), AUTH_PROBE_TIMEOUT_MS);
    let sawAgentMessage = false;
    let exitCode: number | null = null;
    try {
      for await (const ev of runStreaming({
        cmd: this.manifest.cliBinary,
        args: [
          "exec",
          "--json",
          "--skip-git-repo-check",
          "reply with the single word OK",
        ],
        cwd: homedir(),
        signal: ctrl.signal,
      })) {
        if (ev.kind === "stdout-line") {
          try {
            const parsed = JSON.parse(ev.text) as { type?: string };
            if (
              parsed.type === "agent_message" ||
              parsed.type === "assistant_message"
            ) {
              sawAgentMessage = true;
              ctrl.abort();
              break;
            }
          } catch {
            // ignore
          }
        } else if (ev.kind === "exit") {
          exitCode = ev.code;
        }
      }
    } catch {
      return false;
    } finally {
      clearTimeout(timer);
    }
    if (sawAgentMessage) return true;
    return exitCode === 0 && sawAgentMessage;
  },
};

export default codexAdapter;
