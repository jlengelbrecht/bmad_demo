import { homedir } from "node:os";

import { spawn as spawnPty } from "node-pty";
import { z } from "zod";

import { isPathAllowed } from "@/lib/capstone/bootstrap/path-allowlist";
import { getLaunchCommand } from "@/lib/capstone/phases/launch-commands";
import * as ptyRegistry from "@/lib/capstone/pty/session-registry";
import { getCapstoneTargetDir } from "@/lib/db/progress-db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TOOL_VALUES = ["claude-code", "codex", "github-copilot"] as const;
const PHASE_VALUES = [
  "brief",
  "prd",
  "architecture",
  "epics-and-stories",
  "adr",
  "dev-story-1.1",
] as const;

const RequestSchema = z.object({
  tool: z.enum(TOOL_VALUES),
  phase: z.enum(PHASE_VALUES),
});

/**
 * Spawn an interactive AI-tool PTY (claude / codex / copilot) inside
 * the trainee's CHOSEN_DIR for a given chat phase. Same shape as the
 * bootstrap PTY route — boundary inputs validated server-side, then
 * we spawn the tool with cwd = chosenDir and let the trainee invoke
 * the BMAD skill from inside the tool's own UI.
 *
 * The PTY is registered under the composite ptyId `<sessionId>.<phase>`
 * so multiple phases can run concurrently for the same session
 * (trainee opens phase 3 in one tab, phase 4 in another).
 *
 * Idempotent: a duplicate POST while the PTY is live returns 200
 * with the existing session's status.
 */
export async function POST(
  req: Request,
  ctx: { params: Promise<{ sessionId: string }> },
): Promise<Response> {
  const { sessionId } = await ctx.params;
  if (!/^\d{8}T\d{6}Z$/.test(sessionId)) {
    return Response.json(
      { ok: false, error: "Invalid sessionId" },
      { status: 400 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json(
      { ok: false, error: "Invalid JSON" },
      { status: 400 },
    );
  }
  const parsed = RequestSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { ok: false, error: "Invalid request", details: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const { tool, phase } = parsed.data;

  // Resolve the trainee's chosenDir from the session-state row that
  // the bootstrap PTY route persisted on exit-code-0.
  const chosenDir = getCapstoneTargetDir(sessionId);
  if (!chosenDir) {
    return Response.json(
      {
        ok: false,
        error: "Session has no chosen directory — finish bootstrap first",
      },
      { status: 404 },
    );
  }

  // Re-validate the allowlist boundary at spawn time. Path-validate
  // gated this at the bootstrap page; we re-check here because the
  // chat phase route is reachable directly.
  const allow = isPathAllowed(chosenDir, homedir(), process.cwd());
  if (!allow.allowed) {
    return Response.json(
      { ok: false, error: "chosenDir blocked by allowlist", details: allow.reason },
      { status: 400 },
    );
  }

  const ptyId = `${sessionId}.${phase}`;
  const existing = ptyRegistry.get(ptyId);
  if (existing) {
    return Response.json({
      ok: true,
      ptyId,
      status: existing.exitCode === null ? "running" : "exited",
      exitCode: existing.exitCode,
    });
  }

  const launch = getLaunchCommand(tool, phase);
  let pty;
  try {
    pty = spawnPty(launch.cmd, [...launch.args], {
      name: "xterm-256color",
      cols: 100,
      rows: 30,
      cwd: allow.resolved,
      env: process.env as Record<string, string>,
    });
  } catch (err) {
    console.error("[chat pty] spawn failed", err);
    return Response.json(
      {
        ok: false,
        error: `Could not spawn ${launch.cmd}: ${err instanceof Error ? err.message : String(err)}`,
      },
      { status: 500 },
    );
  }

  // No session-state side-effects on exit. The phase-done gate
  // validates artifact existence on disk; the PTY's exit code only
  // reflects whether the trainee Ctrl-C'd or quit normally.
  ptyRegistry.register(ptyId, pty, () => {});

  return Response.json(
    { ok: true, ptyId, status: "running" },
    { status: 201 },
  );
}

export async function DELETE(
  req: Request,
  ctx: { params: Promise<{ sessionId: string }> },
): Promise<Response> {
  const { sessionId } = await ctx.params;
  if (!/^\d{8}T\d{6}Z$/.test(sessionId)) {
    return Response.json(
      { ok: false, error: "Invalid sessionId" },
      { status: 400 },
    );
  }
  const url = new URL(req.url);
  const phase = url.searchParams.get("phase");
  if (!phase) {
    return Response.json(
      { ok: false, error: "phase query param required" },
      { status: 400 },
    );
  }
  ptyRegistry.kill(`${sessionId}.${phase}`);
  return new Response(null, { status: 204 });
}
