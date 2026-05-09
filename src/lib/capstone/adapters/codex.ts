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
    // The original probe spawned `codex exec --json "reply with OK"`,
    // which (a) cost a real LLM request every page load, (b) took 3-15s,
    // and (c) silently failed when subscription auth was healthy because
    // the agent_message event-type vocabulary wasn't matched. Replaced
    // with `codex login status` — exits 0 with "Logged in using ..." for
    // both ChatGPT-subscription AND OPENAI_API_KEY auth paths. Free,
    // immediate, and accurate.
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), AUTH_PROBE_TIMEOUT_MS);
    let exitCode: number | null = null;
    let sawLoggedIn = false;
    try {
      for await (const ev of runStreaming({
        cmd: this.manifest.cliBinary,
        args: ["login", "status"],
        cwd: homedir(),
        signal: ctrl.signal,
      })) {
        if (ev.kind === "stdout-line" || ev.kind === "stderr-line") {
          // Anchor at start so "Not logged in" / "You are not logged in" don't match
          if (/^\s*Logged in\b/i.test(ev.text)) sawLoggedIn = true;
        } else if (ev.kind === "exit") {
          exitCode = ev.code;
        }
      }
    } catch {
      return false;
    } finally {
      clearTimeout(timer);
    }
    return exitCode === 0 && sawLoggedIn;
  },
};

export default codexAdapter;
