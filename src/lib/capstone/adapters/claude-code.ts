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
// Match a semver anywhere in the first non-empty stdout line. The
// canonical `claude --version` output as of 2.1.137 is `2.1.137 (Claude
// Code)` — version first, binary name in parens — which the prior
// `claude\s+\d+\.\d+\.\d+` shape (binary-name-first) did not match.
// Combined with the exit-code-0 check below this is a reliable heuristic.
const VERSION_BANNER_RE = /(\d+)\.(\d+)\.(\d+)/;
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
