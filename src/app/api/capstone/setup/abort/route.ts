import { rm } from "node:fs/promises";
import path from "node:path";

import { z } from "zod";

import {
  getCapstoneTargetDir,
  markCapstoneSessionAborted,
} from "@/lib/db/progress-db";
import { findChildren } from "@/lib/capstone/subprocess/tracked-children";

export const runtime = "nodejs";

const RequestSchema = z.object({
  sessionId: z.string().regex(/^\d{8}T\d{6}Z$/),
  typedConfirmation: z.string().optional(),
  cleanupChosenDir: z.boolean(),
});

export async function POST(req: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json(
      { ok: false, error: "Invalid request" },
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
  const { sessionId, typedConfirmation, cleanupChosenDir } = parsed.data;
  const chosenDir = getCapstoneTargetDir(sessionId);
  if (!chosenDir) {
    return Response.json(
      { ok: false, error: "Session not found" },
      { status: 404 },
    );
  }

  if (cleanupChosenDir) {
    if (
      !typedConfirmation ||
      path.resolve(typedConfirmation) !== path.resolve(chosenDir)
    ) {
      return Response.json(
        {
          ok: false,
          error: "Typed confirmation does not match the chosen directory",
        },
        { status: 400 },
      );
    }
  }

  // SIGTERM any tracked bootstrap subprocess for this session.
  const targets = findChildren(
    (m) => m?.kind === "bootstrap" && m.sessionId === sessionId,
  );
  for (const child of targets) {
    try {
      child.kill("SIGTERM");
    } catch {
      // already exited
    }
  }
  const killed = targets.length > 0;

  let removedDir = false;
  if (cleanupChosenDir) {
    // Wait for the SIGTERM grace before removing — the npx subprocess
    // may still hold open file handles inside CHOSEN_DIR.
    await new Promise((r) => setTimeout(r, 300));
    try {
      await rm(chosenDir, { recursive: true, force: true });
      removedDir = true;
    } catch (err) {
      console.error("rm chosenDir failed", err);
    }
  }

  markCapstoneSessionAborted(sessionId);

  return Response.json({ ok: true, killed, removedDir });
}
