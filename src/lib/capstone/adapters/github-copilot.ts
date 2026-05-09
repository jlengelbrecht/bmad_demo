import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";

import { runStreaming } from "../subprocess/run-streaming";
import type {
  CapstonePhase,
  ChatSpawnOpts,
  ChatStreamEvent,
  ToolAdapter,
} from "./types";

/**
 * Copilot CLI consumes the user message via `--prompt <msg>` (argv),
 * not stdin. The Route Handler's contract: when `formatUserMessage`
 * returns an empty string, skip the stdin write. This is the FIRST
 * adapter where the abstraction's "stdin-driven" assumption needs an
 * opt-out; the empty-string convention is the documented branch.
 *
 * Primer mechanism is file-based: Copilot reads
 * `<CHOSEN_DIR>/.github/copilot-instructions.md` at session start.
 * The Route Handler writes `buildPrimer(phase)`'s content there on
 * first turn; on resume turns the file already exists from the prior
 * turn so no re-write happens.
 */

const VERSION_BANNER_RE = /copilot\s+(\d+)\.(\d+)\.(\d+)/i;
const AUTH_PROBE_TIMEOUT_MS = 15_000;
const AUTH_LOGGED_IN_RE = /Logged in to github\.com/i;
const TOOL_CALL_PREFIX_RE = /^\s*(?:▶|→|>>|\[tool\]|\[exec\])/i;
const SESSION_LINE_RE = /Session:\s*(\S+)/i;

// See claude-code.ts PRIMERS_DIR for the Turbopack fallback rationale.
const PRIMERS_DIR = import.meta.dirname
  ? path.resolve(import.meta.dirname, "..", "primers")
  : path.resolve(process.cwd(), "src", "lib", "capstone", "primers");

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
    } catch {
      return false;
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

  buildSpawnArgs(opts: ChatSpawnOpts): {
    cmd: string;
    args: string[];
    env?: NodeJS.ProcessEnv;
  } {
    return {
      cmd: this.manifest.cliBinary,
      args: [
        "--prompt",
        opts.userMessage,
        "-C",
        opts.chosenDir,
        ...(opts.sessionId ? ["--resume", opts.sessionId] : []),
      ],
      env: { ...process.env },
    };
  },

  parseStreamChunk(raw: string): ChatStreamEvent[] {
    if (raw === "") return [];
    const sessionMatch = SESSION_LINE_RE.exec(raw);
    if (sessionMatch) {
      return [
        { kind: "session-init", sessionId: sessionMatch[1] },
        { kind: "message-delta", text: raw + "\n" },
      ];
    }
    if (TOOL_CALL_PREFIX_RE.test(raw)) {
      return [{ kind: "tool-call", description: raw.trim() }];
    }
    return [{ kind: "message-delta", text: raw + "\n" }];
  },

  formatUserMessage(): string {
    // Empty-string contract: the user message is in argv (--prompt);
    // the Route Handler must skip the stdin write for this adapter.
    return "";
  },

  buildPrimer(phase: CapstonePhase): string {
    const file = path.join(PRIMERS_DIR, `${phase}.md`);
    try {
      return readFileSync(file, "utf8");
    } catch (err) {
      throw new Error(
        `Primer not found for phase ${phase}: ${file}` +
          ((err as Error).message ? ` (${(err as Error).message})` : ""),
      );
    }
  },
};

export default githubCopilotAdapter;
