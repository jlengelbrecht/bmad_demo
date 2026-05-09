import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

import { runStreaming } from "../subprocess/run-streaming";
import type { ToolAdapter } from "./types";

// See claude-code.ts VERSION_BANNER_RE for the rationale on matching
// any semver in the first stdout line rather than a binary-name-prefixed
// shape. Real `copilot --version` output format varies by CLI version.
const VERSION_BANNER_RE = /(\d+)\.(\d+)\.(\d+)/;

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

/**
 * Path to copilot's local config — written on first successful login,
 * carries `lastLoggedInUser.login`. Used as a free, accurate signal of
 * whether `copilot login` (or one of the supported env-var/gh-token
 * paths) has produced a working credential. Overridable via env for
 * tests.
 */
function copilotConfigPath(): string {
  return process.env.COPILOT_CONFIG_PATH ?? join(homedir(), ".copilot", "config.json");
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
    // The original probe paired `gh auth status` with `gh api user/copilot_billing`.
    // The latter endpoint returns 404 ("Not Found") regardless of auth state —
    // it's not a valid REST endpoint for this purpose — so the probe rendered
    // ✗ for every healthy install. Replaced with a presence check on
    // `~/.copilot/config.json::lastLoggedInUser.login`, which copilot writes
    // on first successful auth (any of the supported paths: `copilot login`
    // OAuth flow, COPILOT_GITHUB_TOKEN, GH_TOKEN, GITHUB_TOKEN, or an
    // OAuth token from the `gh` CLI app). Free, immediate, accurate.
    const path = copilotConfigPath();
    if (!existsSync(path)) return false;
    try {
      const raw = readFileSync(path, "utf8");
      // copilot writes JSONC (JSON with `//` line comments) — strip them
      // before parse. Block-comment / trailing-comma support not needed
      // for the shapes copilot emits today.
      const stripped = raw.replace(/^\s*\/\/.*$/gm, "");
      const parsed = JSON.parse(stripped) as {
        lastLoggedInUser?: { login?: unknown };
      };
      const login = parsed?.lastLoggedInUser?.login;
      return typeof login === "string" && login.length > 0;
    } catch (err) {
      console.error("[github-copilot adapter] auth-probe parse error:", err);
      return false;
    }
  },
};

export default githubCopilotAdapter;
