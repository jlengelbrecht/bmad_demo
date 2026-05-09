import { mkdir } from "node:fs/promises";
import path from "node:path";

import { z } from "zod";

import { runStreaming } from "@/lib/capstone/subprocess/run-streaming";
import {
  buildInstallCommand,
  type InstallCommandInput,
} from "@/lib/capstone/bootstrap/build-install-command";
import { getPinnedBmadVersion } from "@/lib/capstone/bootstrap/bmad-version";
import { isPathAllowed } from "@/lib/capstone/bootstrap/path-allowlist";
import { SUPPORTED_LANGUAGES } from "@/lib/capstone/bootstrap/languages";
import {
  recordCapstoneTargetDir,
  recordCapstoneTool,
  upsertProgress,
} from "@/lib/db/progress-db";
import { homedir } from "node:os";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TOOL_VALUES = ["claude-code", "codex", "github-copilot"] as const;
const SKILL_VALUES = ["beginner", "intermediate", "expert"] as const;
const BOOTSTRAP_TIMEOUT_MS = 10 * 60 * 1000;

const QuerySchema = z.object({
  session: z.string().regex(/^\d{8}T\d{6}Z$/),
  tool: z.enum(TOOL_VALUES),
  chosenDir: z.string().refine((v) => path.isAbsolute(v), "chosenDir must be absolute"),
  projectName: z.string().regex(/^[a-z][a-z0-9-]{1,63}$/),
  commLang: z.enum(SUPPORTED_LANGUAGES),
  docLang: z.enum(SUPPORTED_LANGUAGES),
  skill: z.enum(SKILL_VALUES),
  outputFolder: z
    .string()
    .min(1)
    .max(64)
    .refine((v) => !v.startsWith("/") && !v.includes("..")),
});

function sseFrame(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

export async function GET(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const parsed = QuerySchema.safeParse({
    session: url.searchParams.get("session") ?? undefined,
    tool: url.searchParams.get("tool") ?? undefined,
    chosenDir: url.searchParams.get("chosenDir") ?? undefined,
    projectName: url.searchParams.get("projectName") ?? undefined,
    commLang: url.searchParams.get("commLang") ?? undefined,
    docLang: url.searchParams.get("docLang") ?? undefined,
    skill: url.searchParams.get("skill") ?? undefined,
    outputFolder: url.searchParams.get("outputFolder") ?? undefined,
  });
  if (!parsed.success) {
    return Response.json(
      { ok: false, error: "Invalid query", details: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const q = parsed.data;

  const allow = isPathAllowed(q.chosenDir, homedir(), process.cwd());
  if (!allow.allowed) {
    return Response.json(
      { ok: false, error: "chosenDir blocked by allowlist", details: allow.reason },
      { status: 400 },
    );
  }

  let bmadVersion: string;
  try {
    bmadVersion = getPinnedBmadVersion();
  } catch (err) {
    console.error("BMAD version pin unreadable", err);
    return Response.json(
      { ok: false, error: "Internal error" },
      { status: 500 },
    );
  }

  const input: InstallCommandInput = {
    bmadVersion,
    chosenDir: allow.resolved,
    tool: q.tool,
    projectName: q.projectName,
    communicationLanguage: q.commLang,
    documentOutputLanguage: q.docLang,
    skillLevel: q.skill,
    outputFolder: q.outputFolder,
  };
  const installCmd = buildInstallCommand(input);

  const portalSessionDir = path.join(
    process.cwd(),
    "data",
    "capstone-sessions",
    q.session,
  );
  await mkdir(portalSessionDir, { recursive: true });
  const parentOfChosenDir = path.dirname(allow.resolved);
  await mkdir(parentOfChosenDir, { recursive: true });

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const encoder = new TextEncoder();
      const enqueue = (frame: string) => controller.enqueue(encoder.encode(frame));
      const start = Date.now();
      const ctrl = new AbortController();
      const timer = setTimeout(() => {
        enqueue(
          sseFrame("error", {
            message: `bootstrap timed out at ${BOOTSTRAP_TIMEOUT_MS / 60_000} minutes`,
          }),
        );
        ctrl.abort();
      }, BOOTSTRAP_TIMEOUT_MS);

      enqueue(sseFrame("preview", { command: installCmd.preview }));

      // Compose the request signal with our internal timeout signal so
      // either tab-close OR timeout aborts the child.
      const onAbort = () => ctrl.abort();
      req.signal.addEventListener("abort", onAbort, { once: true });

      try {
        for await (const ev of runStreaming({
          cmd: installCmd.cmd,
          args: installCmd.args,
          cwd: parentOfChosenDir,
          signal: ctrl.signal,
          sessionLogPath: path.join(portalSessionDir, "subprocess.log"),
        })) {
          if (ev.kind === "stdout-line") {
            enqueue(sseFrame("stdout", { text: ev.text }));
          } else if (ev.kind === "stderr-line") {
            enqueue(sseFrame("stderr", { text: ev.text }));
          } else if (ev.kind === "exit") {
            // On successful bootstrap, persist the three session-state
            // rows that downstream surfaces (chat, complete page, handoff)
            // look up by sessionId. Without this the wizard's session is
            // invisible to every later phase.
            if (ev.code === 0) {
              try {
                upsertProgress({
                  kind: "capstone-session",
                  id: q.session,
                  completed: false,
                });
                recordCapstoneTargetDir(q.session, allow.resolved);
                recordCapstoneTool(q.session, q.tool);
              } catch (err) {
                console.error("session-state persist failed", err);
              }
            }
            enqueue(
              sseFrame("done", {
                code: ev.code,
                signal: ev.signal,
                durationMs: Date.now() - start,
              }),
            );
            controller.close();
            return;
          }
        }
        controller.close();
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        enqueue(sseFrame("error", { message: `bootstrap error: ${message}` }));
        enqueue(sseFrame("done", { code: null, signal: null, durationMs: Date.now() - start }));
        controller.close();
      } finally {
        clearTimeout(timer);
        req.signal.removeEventListener("abort", onAbort);
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
