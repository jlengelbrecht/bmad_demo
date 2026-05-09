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

const STORY_REF = "Story 5.3";
const VERSION_BANNER_RE = /claude\s+(\d+)\.(\d+)\.(\d+)/i;
const AUTH_PROBE_TIMEOUT_MS = 15_000;

// Same fallback pattern as src/lib/db/connection.ts: Turbopack (Next.js 16
// dev/build runtime) does not populate `import.meta.dirname` for App-Router
// server modules, so we fall back to a cwd-relative resolve. Production is
// local-only per architecture, so process.cwd() === repo root.
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
      // ENOENT → binary not on PATH. Treat any spawn-time failure as
      // not-installed; the wizard renders ✗ and points at docsUrl.
      if (
        (err as NodeJS.ErrnoException | undefined)?.code === "ENOENT" ||
        err instanceof Error
      ) {
        return false;
      }
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
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), AUTH_PROBE_TIMEOUT_MS);
    let sawInit = false;
    let sawMessageStart = false;
    let exitCode: number | null = null;
    try {
      for await (const ev of runStreaming({
        cmd: this.manifest.cliBinary,
        args: [
          "--print",
          "--input-format",
          "text",
          "--output-format",
          "stream-json",
          "--max-budget-usd",
          "0.001",
          "--bare",
          "say hi in one word",
        ],
        cwd: homedir(),
        signal: ctrl.signal,
      })) {
        if (ev.kind === "stdout-line") {
          try {
            const parsed = JSON.parse(ev.text) as { type?: string };
            const t = parsed.type;
            if (t === "system/init" || t === "system/start") sawInit = true;
            if (t === "assistant/message_start") sawMessageStart = true;
            if (sawInit && sawMessageStart) {
              ctrl.abort();
              break;
            }
          } catch {
            // Non-JSON lines (e.g., spinner noise) — ignore.
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
    if (sawInit && sawMessageStart) return true;
    return exitCode === 0 && sawInit && sawMessageStart;
  },

  buildSpawnArgs(opts: ChatSpawnOpts): {
    cmd: string;
    args: string[];
    env?: NodeJS.ProcessEnv;
  } {
    return {
      cmd: this.manifest.cliBinary,
      args: [
        "--print",
        "--input-format",
        "stream-json",
        "--output-format",
        "stream-json",
        "--include-partial-messages",
        "--system-prompt-file",
        opts.primerPath,
        ...(opts.sessionId ? ["--resume", opts.sessionId] : []),
        "--add-dir",
        opts.chosenDir,
        "--bare",
      ],
      env: { ...process.env },
    };
  },

  parseStreamChunk(raw: string): ChatStreamEvent[] {
    let parsed: { type?: string; session_id?: string; delta?: { text?: string }; tool_name?: string; input?: unknown };
    try {
      parsed = JSON.parse(raw) as typeof parsed;
    } catch {
      return [
        {
          kind: "error",
          message: `malformed stream-json line: ${raw.slice(0, 80)}`,
        },
      ];
    }
    const t = parsed.type;
    if (t === "system/init" || t === "system/start") {
      return [{ kind: "session-init", sessionId: parsed.session_id ?? "" }];
    }
    if (t === "assistant/content_block_delta") {
      return [{ kind: "message-delta", text: parsed.delta?.text ?? "" }];
    }
    if (t === "assistant/tool_use_start") {
      const toolName = parsed.tool_name ?? "(unknown tool)";
      const summary = JSON.stringify(parsed.input ?? {}).slice(0, 80);
      return [
        { kind: "tool-call", description: `▶ ${toolName} ${summary}` },
      ];
    }
    if (t === "assistant/message_stop") {
      return [{ kind: "message-end" }];
    }
    return [];
  },

  formatUserMessage(text: string): string {
    return (
      JSON.stringify({
        type: "user",
        message: {
          role: "user",
          content: [{ type: "text", text }],
        },
      }) + "\n"
    );
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

void STORY_REF; // marker kept so a future grep across STORY_REF strings stays useful

export default claudeCodeAdapter;
