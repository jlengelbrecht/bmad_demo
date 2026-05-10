import { mkdir } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";

import { spawn as spawnPty } from "node-pty";
import { z } from "zod";

import { INSTALL_TAG } from "@/lib/capstone/bootstrap/bmad-version";
import { isPathAllowed } from "@/lib/capstone/bootstrap/path-allowlist";
import * as ptyRegistry from "@/lib/capstone/pty/session-registry";
import {
  recordCapstoneTargetDir,
  recordCapstoneTool,
  upsertProgress,
} from "@/lib/db/progress-db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TOOL_VALUES = ["claude-code", "codex", "github-copilot"] as const;

const RequestSchema = z.object({
  sessionId: z.string().regex(/^\d{8}T\d{6}Z$/),
  tool: z.enum(TOOL_VALUES),
  chosenDir: z
    .string()
    .refine((v) => path.isAbsolute(v), "chosenDir must be an absolute path"),
});

/**
 * Spawn a PTY running `npx bmad-method@<INSTALL_TAG> install` (default
 * tag: "latest") with just the boundary inputs we collected at the
 * portal layer: `--directory` (allowlist-validated) and `--tools`
 * (preflight-validated). Everything else is left for BMAD's interactive
 * prompts — the trainee walks them with arrow keys / Enter via the
 * terminal pane.
 *
 * Idempotent per sessionId: a duplicate POST while a PTY is live returns
 * 200 with the existing session's status. After exit, a fresh POST with
 * the same sessionId would re-spawn (the registry has already removed
 * the entry by then via the onExit cleanup pattern in the registry).
 */
export async function POST(req: Request): Promise<Response> {
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
  const { sessionId, tool, chosenDir } = parsed.data;

  // Path-allowlist boundary — same shape the legacy bootstrap route used.
  const allow = isPathAllowed(chosenDir, homedir(), process.cwd());
  if (!allow.allowed) {
    return Response.json(
      { ok: false, error: "chosenDir blocked by allowlist", details: allow.reason },
      { status: 400 },
    );
  }

  // Idempotent: if a PTY is already live for this session, return 200
  // with its status rather than spawning a second one.
  const existing = ptyRegistry.get(sessionId);
  if (existing) {
    return Response.json({
      ok: true,
      sessionId,
      status: existing.exitCode === null ? "running" : "exited",
      exitCode: existing.exitCode,
    });
  }

  const parentOfChosenDir = path.dirname(allow.resolved);
  try {
    await mkdir(parentOfChosenDir, { recursive: true });
  } catch (err) {
    console.error("could not mkdir parent of chosenDir", err);
    return Response.json(
      { ok: false, error: "Could not prepare target directory" },
      { status: 500 },
    );
  }

  // Spawn the PTY. Production: `npx bmad-method@<INSTALL_TAG> install ...`
  // (INSTALL_TAG defaults to "latest").
  // Test override: if CAPSTONE_PTY_FIXTURE_SCRIPT is set, spawn that
  // script instead — used by the e2e to drive a deterministic
  // "Continue? (y/n)" fixture without invoking real npm I/O.
  const fixturePath = process.env.CAPSTONE_PTY_FIXTURE_SCRIPT;
  const cmd = fixturePath ?? "npx";
  const args = fixturePath
    ? [allow.resolved, tool]
    : [
        `bmad-method@${INSTALL_TAG}`,
        "install",
        "--directory",
        allow.resolved,
        "--tools",
        tool,
      ];
  const pty = spawnPty(cmd, args, {
    name: "xterm-256color",
    cols: 100,
    rows: 30,
    cwd: parentOfChosenDir,
    env: process.env as Record<string, string>,
  });

  ptyRegistry.register(sessionId, pty, (exitCode) => {
    // On clean exit, record the three session-state rows so downstream
    // surfaces (chat / handoff / complete page) can resolve by sessionId.
    if (exitCode === 0) {
      try {
        upsertProgress({
          kind: "capstone-session",
          id: sessionId,
          completed: false,
        });
        recordCapstoneTargetDir(sessionId, allow.resolved);
        recordCapstoneTool(sessionId, tool);
      } catch (err) {
        console.error("session-state persist failed", err);
      }
    }
  });

  return Response.json(
    { ok: true, sessionId, status: "running" },
    { status: 201 },
  );
}

/**
 * DELETE — kill an in-flight PTY (used on tab-close / explicit abort).
 */
export async function DELETE(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const sessionId = url.searchParams.get("sessionId");
  if (!sessionId) {
    return Response.json(
      { ok: false, error: "sessionId required" },
      { status: 400 },
    );
  }
  ptyRegistry.kill(sessionId);
  return new Response(null, { status: 204 });
}
