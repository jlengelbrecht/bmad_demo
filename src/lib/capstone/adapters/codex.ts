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

// See claude-code.ts VERSION_BANNER_RE for the rationale on matching
// any semver in the first stdout line rather than a binary-name-prefixed
// shape. Real `codex --version` output format varies by CLI version.
const VERSION_BANNER_RE = /(\d+)\.(\d+)\.(\d+)/;
const AUTH_PROBE_TIMEOUT_MS = 15_000;
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

  buildSpawnArgs(opts: ChatSpawnOpts): {
    cmd: string;
    args: string[];
    env?: NodeJS.ProcessEnv;
  } {
    return {
      cmd: this.manifest.cliBinary,
      args: [
        "exec",
        "--json",
        "-C",
        opts.chosenDir,
        "--add-dir",
        opts.chosenDir,
        "--sandbox",
        "workspace-write",
        ...(opts.sessionId ? ["resume", opts.sessionId] : []),
      ],
      env: { ...process.env },
    };
  },

  parseStreamChunk(raw: string): ChatStreamEvent[] {
    let parsed: {
      type?: string;
      session_id?: string;
      id?: string;
      delta?: string;
      tool_name?: string;
      input?: unknown;
    };
    try {
      parsed = JSON.parse(raw) as typeof parsed;
    } catch {
      return [
        {
          kind: "error",
          message: `malformed JSONL line: ${raw.slice(0, 80)}`,
        },
      ];
    }
    const t = parsed.type;
    if (t === "task_started") {
      return [
        {
          kind: "session-init",
          sessionId: parsed.session_id ?? parsed.id ?? "",
        },
      ];
    }
    if (t === "agent_message_delta") {
      return [{ kind: "message-delta", text: parsed.delta ?? "" }];
    }
    if (t === "agent_reasoning_delta") {
      // v1 deliberately swallows reasoning deltas — chat surface shows
      // the public message stream only. v1.1 may surface in a panel.
      return [];
    }
    if (t === "tool_use" || t === "function_call") {
      const toolName = parsed.tool_name ?? "(unknown tool)";
      const summary = JSON.stringify(parsed.input ?? {}).slice(0, 80);
      return [
        { kind: "tool-call", description: `▶ ${toolName} ${summary}` },
      ];
    }
    if (t === "task_complete" || t === "agent_message_end") {
      return [{ kind: "message-end" }];
    }
    return [];
  },

  formatUserMessage(text: string): string {
    return text + "\n";
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

export default codexAdapter;
