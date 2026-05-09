import { homedir } from "node:os";

import { runStreaming } from "../subprocess/run-streaming";
import type { ToolAdapter } from "./types";

// See claude-code.ts VERSION_BANNER_RE for the rationale on matching
// any semver in the first stdout line rather than a binary-name-prefixed
// shape. Real `copilot --version` output format varies by CLI version.
const VERSION_BANNER_RE = /(\d+)\.(\d+)\.(\d+)/;
const AUTH_PROBE_TIMEOUT_MS = 15_000;
const AUTH_LOGGED_IN_RE = /Logged in to github\.com/i;

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

function jsonHasCopilotKey(value: unknown): boolean {
  if (value === null || typeof value !== "object") return false;
  for (const key of Object.keys(value as Record<string, unknown>)) {
    if (/copilot/i.test(key)) return true;
    if (jsonHasCopilotKey((value as Record<string, unknown>)[key])) return true;
  }
  return false;
}

const githubCopilotAdapter: ToolAdapter = {
  manifest: {
    id: "github-copilot",
    displayName: "GitHub Copilot CLI",
    cliBinary: "copilot",
    minVersion: ">=1.0.42",
    docsUrl:
      "https://docs.github.com/en/copilot/concepts/agents/about-copilot-cli",
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
      console.error("[github-copilot adapter] detectInstalled error:", err);
      throw err;
    }
    if (exitCode !== 0 || !version) return false;
    if (!compareSemverAtLeast(version, this.manifest.minVersion)) {
      console.warn(
        `[github-copilot adapter] version ${version} is below manifest.minVersion ${this.manifest.minVersion} (TM-6: tool-version drift)`,
      );
      return false;
    }
    return true;
  },

  async detectAuthenticated(): Promise<boolean> {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), AUTH_PROBE_TIMEOUT_MS);
    try {
      // Probe 1: gh auth status
      let authed = false;
      let authExit: number | null = null;
      try {
        for await (const ev of runStreaming({
          cmd: "gh",
          args: ["auth", "status", "--hostname", "github.com"],
          cwd: homedir(),
          signal: ctrl.signal,
        })) {
          if (ev.kind === "stdout-line" || ev.kind === "stderr-line") {
            if (AUTH_LOGGED_IN_RE.test(ev.text)) authed = true;
          } else if (ev.kind === "exit") {
            authExit = ev.code;
          }
        }
      } catch {
        return false;
      }
      if (authExit !== 0 || !authed) return false;

      // Probe 2: gh api user/copilot_billing
      let billingExit: number | null = null;
      let billingBuffer = "";
      try {
        for await (const ev of runStreaming({
          cmd: "gh",
          args: ["api", "user/copilot_billing"],
          cwd: homedir(),
          signal: ctrl.signal,
        })) {
          if (ev.kind === "stdout-line") {
            billingBuffer += ev.text;
          } else if (ev.kind === "exit") {
            billingExit = ev.code;
          }
        }
      } catch {
        return false;
      }
      if (billingExit !== 0) return false;
      try {
        const parsed = JSON.parse(billingBuffer);
        return jsonHasCopilotKey(parsed);
      } catch {
        return false;
      }
    } finally {
      clearTimeout(timer);
    }
  },
};

export default githubCopilotAdapter;
