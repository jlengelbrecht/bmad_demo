import type { ChildProcess } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";

import { z } from "zod";

import { getAdapterRegistry } from "@/lib/capstone/adapters";
import { getStubAdapter } from "@/lib/capstone/adapters/stub";
import type {
  CapstonePhase,
  ChatStreamEvent,
  ToolAdapter,
  ToolId,
} from "@/lib/capstone/adapters/types";
import { isPathAllowed } from "@/lib/capstone/bootstrap/path-allowlist";
import { runStreaming } from "@/lib/capstone/subprocess/run-streaming";
import { recordCapstoneToolSessionId } from "@/lib/db/progress-db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PHASE_VALUES = [
  "brief",
  "prd",
  "architecture",
  "epics-and-stories",
  "adr",
  "dev-story-1.1",
] as const;
const TOOL_VALUES = ["claude-code", "codex", "github-copilot"] as const;

const QuerySchema = z.object({
  phase: z.enum(PHASE_VALUES),
  message: z.string().min(1).max(32_000),
  tool: z.enum(TOOL_VALUES),
  chosenDir: z.string().refine(
    (v) => path.isAbsolute(v),
    "chosenDir must be an absolute path",
  ),
});

const SessionIdSchema = z
  .string()
  .regex(/^(new|[a-zA-Z0-9_-]+)$/);

function jsonError(status: number, error: string, details?: unknown): Response {
  return Response.json({ ok: false, error, details }, { status });
}

function sseFrame(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

function resolveAdapter(toolId: ToolId): ToolAdapter {
  if (process.env.CAPSTONE_USE_STUB_ADAPTER === "1") {
    return getStubAdapter();
  }
  const adapter = getAdapterRegistry().get(toolId);
  if (!adapter) {
    throw new Error(`No adapter registered for tool: ${toolId}`);
  }
  return adapter;
}

function primerPathFor(phase: CapstonePhase): string {
  return path.join(process.cwd(), "src", "lib", "capstone", "primers", `${phase}.md`);
}

function portalSessionDirFor(capstoneSessionId: string): string {
  return path.join(process.cwd(), "data", "capstone-sessions", capstoneSessionId);
}

export async function GET(
  req: Request,
  ctx: { params: Promise<{ sessionId: string }> },
): Promise<Response> {
  const { sessionId: rawSessionId } = await ctx.params;
  const sidResult = SessionIdSchema.safeParse(rawSessionId);
  if (!sidResult.success) {
    return jsonError(400, "Invalid sessionId", sidResult.error.flatten());
  }

  const url = new URL(req.url);
  const queryParsed = QuerySchema.safeParse({
    phase: url.searchParams.get("phase") ?? undefined,
    message: url.searchParams.get("message") ?? undefined,
    tool: url.searchParams.get("tool") ?? undefined,
    chosenDir: url.searchParams.get("chosenDir") ?? undefined,
  });
  if (!queryParsed.success) {
    return jsonError(400, "Invalid query", queryParsed.error.flatten());
  }
  const { phase, message, tool, chosenDir } = queryParsed.data;
  const sessionId = sidResult.data;
  const isFirstTurn = sessionId === "new";

  // Re-check the path allowlist on every request — the wizard validates
  // this upstream, but Route Handlers are reachable directly and the
  // Copilot first-turn writes a file under chosenDir.
  const allow = isPathAllowed(chosenDir, homedir(), process.cwd());
  if (!allow.allowed) {
    return jsonError(403, "chosenDir is not allowed", { reason: allow.reason });
  }

  let adapter: ToolAdapter;
  try {
    adapter = resolveAdapter(tool);
  } catch (err) {
    console.error(err);
    return jsonError(500, "Internal error");
  }

  // Capstone-session id (the portal-side row) is required to land
  // tool-session-id state. For first turns it's the URL `sessionId`
  // (which equals 'new' here, so we cannot persist) — Story 6.1+ will
  // route the wizard through a real capstone-session id before
  // reaching this endpoint, replacing 'new' with the compact-UTC id.
  // For now: log a warning when the persistence path is unreachable.
  const portalSessionId = isFirstTurn ? null : sessionId;

  const portalSessionDir = portalSessionId
    ? portalSessionDirFor(portalSessionId)
    : null;
  if (portalSessionDir) {
    try {
      await mkdir(portalSessionDir, { recursive: true });
    } catch (err) {
      console.error("Could not create portal session dir", err);
    }
  }

  // Copilot-specific: write the primer to CHOSEN_DIR/.github/copilot-instructions.md
  // on first turn (Story 5.5 AC7 deferred; Story 5.7 owns the file write).
  if (tool === "github-copilot" && isFirstTurn) {
    try {
      const primerContent = adapter.buildPrimer(phase);
      const githubDir = path.join(chosenDir, ".github");
      await mkdir(githubDir, { recursive: true });
      await writeFile(path.join(githubDir, "copilot-instructions.md"), primerContent);
    } catch (err) {
      console.error("Failed to write copilot-instructions.md", err);
    }
  }

  const spawnOpts = adapter.buildSpawnArgs({
    chosenDir,
    sessionId: isFirstTurn ? "" : sessionId,
    primerPath: primerPathFor(phase),
    userMessage: message,
    phase,
  });

  const stdinPayload = adapter.formatUserMessage(message);

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const encoder = new TextEncoder();
      const enqueue = (frame: string) => controller.enqueue(encoder.encode(frame));

      let capturedToolSessionId: string | null = null;
      let childRef: ChildProcess | null = null;

      try {
        for await (const ev of runStreaming({
          cmd: spawnOpts.cmd,
          args: spawnOpts.args,
          env: spawnOpts.env,
          cwd: chosenDir,
          signal: req.signal,
          sessionLogPath: portalSessionDir
            ? path.join(portalSessionDir, "subprocess.log")
            : undefined,
          onSpawn: (child) => {
            childRef = child;
            // Write the trainee's message to stdin if the adapter's
            // formatUserMessage returned non-empty. The empty-string
            // contract (github-copilot) means the message is already
            // in argv; skip the stdin write.
            if (stdinPayload.length > 0 && child.stdin) {
              try {
                child.stdin.write(stdinPayload);
                child.stdin.end();
              } catch (err) {
                console.error("stdin write failed", err);
              }
            } else if (child.stdin) {
              try {
                child.stdin.end();
              } catch {
                // ignore
              }
            }
          },
        })) {
          if (ev.kind === "stdout-line") {
            const decoded = adapter.parseStreamChunk(ev.text);
            for (const csev of decoded) {
              if (csev.kind === "session-init" && capturedToolSessionId === null) {
                capturedToolSessionId = csev.sessionId;
                if (portalSessionId) {
                  try {
                    recordCapstoneToolSessionId(
                      portalSessionId,
                      phase,
                      csev.sessionId,
                    );
                  } catch (err) {
                    console.error("recordCapstoneToolSessionId failed", err);
                  }
                }
                enqueue(sseFrame("msg", csev satisfies ChatStreamEvent));
              } else if (csev.kind === "message-end") {
                enqueue(sseFrame("done", csev));
              } else {
                enqueue(sseFrame("msg", csev));
              }
            }
          } else if (ev.kind === "exit") {
            enqueue(
              sseFrame("done", { kind: "exit", code: ev.code, signal: ev.signal }),
            );
            controller.close();
            return;
          }
          // stderr-line events drop on the floor; subprocess.log captures them.
        }
        controller.close();
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        enqueue(
          sseFrame("msg", {
            kind: "error",
            message: `chat-stream error: ${message}`,
          } satisfies ChatStreamEvent),
        );
        enqueue(sseFrame("done", { kind: "exit", code: null, signal: null }));
        controller.close();
      } finally {
        // Best-effort SIGTERM if abort fired while we were yielding.
        if (childRef && req.signal.aborted) {
          try {
            (childRef as ChildProcess).kill("SIGTERM");
          } catch {
            // already exited
          }
        }
      }
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
