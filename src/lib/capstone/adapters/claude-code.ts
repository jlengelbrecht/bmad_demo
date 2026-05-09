import { homedir } from "node:os";

import { runStreaming } from "../subprocess/run-streaming";
import type { ToolAdapter } from "./types";

const STORY_REF = "Story 5.3";
// Match a semver anywhere in the first non-empty stdout line. The
// canonical `claude --version` output as of 2.1.137 is `2.1.137 (Claude
// Code)` — version first, binary name in parens — which the prior
// `claude\s+\d+\.\d+\.\d+` shape (binary-name-first) did not match.
// Combined with the exit-code-0 check below this is a reliable heuristic.
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

const claudeCodeAdapter: ToolAdapter = {
  manifest: {
    id: "claude-code",
    displayName: "Claude Code",
    cliBinary: "claude",
    minVersion: ">=2.1.0",
    docsUrl: "https://docs.claude.com/en/docs/claude-code",
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
      // ENOENT → binary not on PATH. Surface any other failure rather
      // than masking it: the prior `|| err instanceof Error` swallowed
      // every Error subclass, hiding regex / parse / spawn-config bugs
      // behind a generic "not installed" UI.
      if ((err as NodeJS.ErrnoException | undefined)?.code === "ENOENT") {
        return false;
      }
      console.error(`[${STORY_REF}] claude-code detectInstalled error:`, err);
      throw err;
    }

    if (exitCode !== 0 || !version) return false;
    if (!compareSemverAtLeast(version, this.manifest.minVersion)) {
      console.warn(
        `[claude-code adapter] version ${version} is below manifest.minVersion ${this.manifest.minVersion} (TM-6: tool-version drift)`,
      );
      return false;
    }
    return true;
  },

  async detectAuthenticated(): Promise<boolean> {
    // `claude auth status` returns JSON with `loggedIn: boolean` and
    // works for BOTH subscription-based auth (claude.ai login via OAuth
    // / keychain) AND ANTHROPIC_API_KEY. The prior probe used `--bare`
    // which the CLI's own help explicitly notes "OAuth and keychain are
    // never read" — meaning subscription users always reported false.
    // This shape: zero token cost, sub-second, works for any auth path.
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), AUTH_PROBE_TIMEOUT_MS);
    let collected = "";
    let exitCode: number | null = null;
    try {
      for await (const ev of runStreaming({
        cmd: this.manifest.cliBinary,
        args: ["auth", "status"],
        cwd: homedir(),
        signal: ctrl.signal,
      })) {
        if (ev.kind === "stdout-line") collected += ev.text + "\n";
        else if (ev.kind === "exit") exitCode = ev.code;
      }
    } catch {
      return false;
    } finally {
      clearTimeout(timer);
    }
    if (exitCode !== 0) return false;
    try {
      const parsed = JSON.parse(collected) as { loggedIn?: boolean };
      return parsed.loggedIn === true;
    } catch {
      return false;
    }
  },
};

void STORY_REF; // marker kept so a future grep across STORY_REF strings stays useful

export default claudeCodeAdapter;
